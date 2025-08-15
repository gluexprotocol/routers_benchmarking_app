import { NextRequest, NextResponse } from "next/server";

import { getCache, makeKey, setCache } from "~/libs/cache";
import { etagFor } from "~/libs/hash";
import { getSupabaseServer } from "~/libs/supabase";

export const runtime = "nodejs";

const SERVER_PAGE_SIZE = 1000;
const TRADE_ID_CHUNK = 300;
const TTL_MS = 6 * 60 * 60 * 1000;

type TradeRow = {
  id: number;
  run_id: number;
  chain: string;
  from_token: string;
  to_token: string;
  from_token_symbol: string | null;
  to_token_symbol: string | null;
  amount_usd: number;
  input_amount: string | null;
};

type ProviderRow = {
  trade_id: number;
  provider: string;
  output_amount: string | null;
  elapsed_time: number | null;
  status_code: number | null;
};

type RawPayload = {
  run_meta: Array<{ id: number; start_time: string | null }>;
  runs: Record<number, { trades: TradeRow[]; provider_results: ProviderRow[] }>;
};

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function fetchTrades(
  supabase: ReturnType<typeof getSupabaseServer>,
  runIds: number[]
) {
  const rows: TradeRow[] = [];
  let from = 0;
  while (true) {
    const to = from + SERVER_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("trade_results")
      .select(
        "id,run_id,chain,from_token,to_token,from_token_symbol,to_token_symbol,amount_usd,input_amount"
      )
      .in("run_id", runIds)
      .order("id", { ascending: true })
      .range(from, to);
    if (error) throw error;
    const batch = (data ?? []) as TradeRow[];
    rows.push(...batch);
    if (batch.length < SERVER_PAGE_SIZE) break;
    from += SERVER_PAGE_SIZE;
  }
  return rows;
}

async function fetchProviderResults(
  supabase: ReturnType<typeof getSupabaseServer>,
  tradeIds: number[]
) {
  const rows: ProviderRow[] = [];
  for (const ids of chunk(tradeIds, TRADE_ID_CHUNK)) {
    let from = 0;
    while (true) {
      const to = from + SERVER_PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from("provider_results")
        .select("trade_id,provider,output_amount,elapsed_time,status_code")
        .in("trade_id", ids)
        .order("trade_id", { ascending: true })
        .range(from, to);
      if (error) {
        throw error;
      }
      const batch = (data ?? []) as ProviderRow[];
      rows.push(...batch);
      if (batch.length < SERVER_PAGE_SIZE) break;
      from += SERVER_PAGE_SIZE;
    }
  }
  return rows;
}

export const GET = async (req: NextRequest) => {
  try {
    const url = new URL(req.url);
    const runParam = url.searchParams.get("run_ids");
    if (!runParam) {
      return NextResponse.json(
        { error: "run_ids is required (comma-separated)" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const run_ids = Array.from(
      new Set(
        runParam
          .split(",")
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isFinite(n) && n > 0)
      )
    ).sort((a, b) => a - b);

    if (!run_ids.length) {
      return NextResponse.json(
        { error: "No valid run_ids" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const baseKey = makeKey("raw:runs", { run_ids });
    const ifNoneMatch =
      req.headers.get("if-none-match")?.replace(/W\//, "") ?? null;

    const cached = getCache<RawPayload>(baseKey);
    if (cached) {
      if (ifNoneMatch && ifNoneMatch === cached.etag) {
        return new NextResponse(null, {
          status: 304,
          headers: {
            ETag: cached.etag,
            "Cache-Control":
              "public, s-maxage=3600, stale-while-revalidate=120",
            Vary: "If-None-Match",
          },
        });
      }
      return new NextResponse(JSON.stringify(cached.value), {
        headers: {
          ETag: cached.etag,
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=120",
          "Content-Type": "application/json",
          Vary: "If-None-Match",
        },
      });
    }

    const supabase = getSupabaseServer();

    // meta
    const { data: meta, error: metaErr } = await supabase
      .from("benchmark_runs")
      .select("id,start_time")
      .in("id", run_ids)
      .order("id", { ascending: true });
    if (metaErr) throw metaErr;

    // trades & providers (paged)
    const trades = await fetchTrades(supabase, run_ids);
    const ids = trades.map((t) => t.id);
    const providers = ids.length
      ? await fetchProviderResults(supabase, ids)
      : [];

    // partition by run
    const runs: RawPayload["runs"] = {};
    for (const r of run_ids) runs[r] = { trades: [], provider_results: [] };

    for (const t of trades) runs[t.run_id]?.trades.push(t);

    const runByTrade = new Map<number, number>();
    for (const t of trades) runByTrade.set(t.id, t.run_id);

    for (const pr of providers) {
      const rid = runByTrade.get(pr.trade_id);
      if (rid != null) runs[rid]?.provider_results.push(pr);
    }

    const payload: RawPayload = {
      run_meta: (meta ?? []).map((m) => ({
        id: m.id,
        start_time: m.start_time ?? null,
      })),
      runs,
    };

    const etag = etagFor(payload);
    setCache(baseKey, payload, TTL_MS, etag);

    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=120",
          Vary: "If-None-Match",
        },
      });
    }

    return new NextResponse(JSON.stringify(payload), {
      headers: {
        ETag: etag,
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=120",
        "Content-Type": "application/json",
        Vary: "If-None-Match",
      },
    });
  } catch (e) {
    console.error("raw runs error:", e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
};
