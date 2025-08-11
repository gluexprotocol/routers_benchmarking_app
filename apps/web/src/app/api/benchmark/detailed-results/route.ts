import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "~/libs/supabase";
import { getCache, makeKey, setCache } from "~/libs/cache";
import { etagFor } from "~/libs/hash";

const TTL_MS = 4 * 60 * 60 * 1000;
const MAX_TRADES_LIMIT = 5000;
const SERVER_PAGE_SIZE = 1000; // conservative cap for PostgREST page size
const PROVIDER_ID_CHUNK = 300; // number of trade_ids per .in(...) batch

export const runtime = "nodejs";

type DetailedRow = {
  chain: string;
  trading_pair: string;
  from_token: string | null;
  to_token: string | null;
  from_address: string;
  to_address: string;
  amount_usd: number;
  gluex_time: number | null;
  zerox_time: number | null;
  odos_time: number | null;
  enso_time: number | null;
  "1inch_time": number | null;
  liqdswap_time: number | null;
  input_amount: string | null;
  gluex_output: string | null;
  zerox_output: string | null;
  odos_output: string | null;
  enso_output: string | null;
  "1inch_output": string | null;
  liqdswap_output: string | null;
  winner: string;
  output_diff: number | null;
  output_diff_usd: number | null;
};

type BaseDetailed = {
  run_id: number;
  run_date: string | null;
  rows: DetailedRow[];
};

const representationTag = (
  baseTag: string,
  page?: number,
  page_size?: number,
  all?: string | null
) => {
  return etagFor({ baseTag, page, page_size, all: all ?? null });
};

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Page through trade_results to avoid server caps.
 */
async function fetchAllTrades(
  supabase: ReturnType<typeof getSupabaseServer>,
  runId: number
) {
  const all: any[] = [];
  let from = 0;

  while (true) {
    const to = from + SERVER_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("trade_results")
      .select(
        "id, chain, pair, from_token, to_token, from_token_symbol, to_token_symbol, amount_usd, input_amount"
      )
      .eq("run_id", runId)
      .order("id", { ascending: true })
      .range(from, to);

    if (error) throw error;

    const batch = data ?? [];
    all.push(...batch);

    if (batch.length < SERVER_PAGE_SIZE) break; // last page
    from += SERVER_PAGE_SIZE;
  }

  return all;
}

/**
 * For a given list of trade_ids, fetch provider_results in small .in(...) chunks,
 * and, within each chunk, use .range() paging in case rows exceed server caps.
 */
async function fetchAllProviderResults(
  supabase: ReturnType<typeof getSupabaseServer>,
  tradeIds: number[]
) {
  const results: any[] = [];
  const idChunks = chunk(tradeIds, PROVIDER_ID_CHUNK);

  for (const ids of idChunks) {
    let from = 0;
    while (true) {
      const to = from + SERVER_PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("provider_results")
        .select("trade_id, provider, output_amount, elapsed_time, status_code")
        .in("trade_id", ids)
        .order("trade_id", { ascending: true })
        .range(from, to);

      if (error) throw error;

      const batch = data ?? [];
      results.push(...batch);

      if (batch.length < SERVER_PAGE_SIZE) break;
      from += SERVER_PAGE_SIZE;
    }
  }

  return results;
}

export const GET = async (req: NextRequest) => {
  try {
    const url = new URL(req.url);
    const page = Number(url.searchParams.get("page") || "1");
    const page_size = Number(url.searchParams.get("page_size") || "50");
    const all = url.searchParams.get("all");
    const limit = Number(
      url.searchParams.get("limit") || `${MAX_TRADES_LIMIT}`
    );

    if (page < 1 || page_size < 10 || page_size > 200) {
      return NextResponse.json(
        { error: "Invalid pagination" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const supabase = getSupabaseServer();

    // latest run
    const { data: latest, error: latestErr } = await supabase
      .from("benchmark_runs")
      .select("id,start_time")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestErr) throw latestErr;

    if (!latest) {
      return NextResponse.json(
        { error: "No benchmark runs found" },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    const runId = latest.id;
    const runDate = latest.start_time ?? null;

    // base cache: all rows precomputed for this run
    const baseKey = makeKey("detailed-results:base", { run_id: runId });
    const baseCached = getCache<BaseDetailed>(baseKey);

    let base: BaseDetailed;
    let baseTag: string;

    if (baseCached) {
      base = baseCached.value;
      baseTag = baseCached.etag;
    } else {
      // fetch all trades for this run with pagination
      const trades = await fetchAllTrades(supabase, runId);
      const ids = trades.map((t) => t.id);

      if (ids.length === 0) {
        const emptyBase: BaseDetailed = {
          run_id: runId,
          run_date: runDate,
          rows: [],
        };

        const emptyTag = etagFor(emptyBase);
        setCache(baseKey, emptyBase, TTL_MS, emptyTag);

        const reprTag = representationTag(emptyTag, page, page_size, all);
        const payload =
          all === "1"
            ? {
                run_id: emptyBase.run_id,
                run_date: emptyBase.run_date,
                pagination: {
                  page: 1,
                  page_size: 0,
                  total_items: 0,
                  total_pages: 0,
                  has_next: false,
                  has_prev: false,
                },
                results: [],
              }
            : {
                run_id: emptyBase.run_id,
                run_date: emptyBase.run_date,
                pagination: {
                  page,
                  page_size,
                  total_items: 0,
                  total_pages: 0,
                  has_next: false,
                  has_prev: false,
                },
                results: [],
              };

        const ifNoneMatch = req.headers.get("if-none-match");
        if (ifNoneMatch && ifNoneMatch === reprTag) {
          return new NextResponse(null, {
            status: 304,
            headers: {
              ETag: reprTag,
              "Cache-Control":
                "public, s-maxage=3600, stale-while-revalidate=120",
            },
          });
        }

        return NextResponse.json(payload, {
          headers: {
            ETag: reprTag,
            "Cache-Control":
              "public, s-maxage=3600, stale-while-revalidate=120",
          },
        });
      }

      // fetch all provider rows for those trades (chunked + paged)
      const providerResults = await fetchAllProviderResults(supabase, ids);

      // index provider results by trade_id
      const byTrade: Record<number, any[]> = {};
      for (const pr of providerResults) {
        (byTrade[pr.trade_id] ??= []).push(pr);
      }

      // build rows
      const rows: DetailedRow[] = trades.map((trade) => {
        const record: any = {
          chain: trade.chain,
          trading_pair: trade.pair,
          from_token: trade.from_token_symbol,
          to_token: trade.to_token_symbol,
          from_address: trade.from_token,
          to_address: trade.to_token,
          amount_usd: trade.amount_usd,
          gluex_time: null,
          zerox_time: null,
          odos_time: null,
          enso_time: null,
          "1inch_time": null,
          liqdswap_time: null,
          input_amount: trade.input_amount ?? null,
          gluex_output: null,
          zerox_output: null,
          odos_output: null,
          enso_output: null,
          "1inch_output": null,
          liqdswap_output: null,
        };

        const valid: Record<string, number> = {};
        const provider_key_map: Record<string, string> = {
          gluex: "gluex",
          "0x": "zerox",
          odos: "odos",
          enso: "enso",
          "1inch": "1inch",
          liqdswap: "liqdswap",
        };

        for (const r of byTrade[trade.id] ?? []) {
          const key =
            provider_key_map[r.provider?.toLowerCase?.()] ??
            r.provider?.toLowerCase?.();

          if (!key) continue;

          record[`${key}_time`] = r.elapsed_time ?? null;

          if (r.output_amount && r.status_code === 200) {
            record[`${key}_output`] = r.output_amount;
            const num = Number(r.output_amount);
            if (!Number.isNaN(num)) valid[r.provider] = num;
          }
        }

        if (Object.keys(valid).length > 1) {
          const entries = Object.entries(valid).sort((a, b) => b[1] - a[1]);
          record.winner = entries[0]![0];
          record.output_diff = entries[0]![1] - entries[1]![1];
          record.output_diff_usd = null;
        } else if (Object.keys(valid).length === 1) {
          record.winner = Object.keys(valid)[0];
          record.output_diff = 0;
          record.output_diff_usd = 0;
        } else {
          record.winner = "All Error";
          record.output_diff = null;
          record.output_diff_usd = null;
        }

        return record as DetailedRow;
      });

      base = { run_id: runId, run_date: runDate, rows };
      baseTag = etagFor(base);
      setCache(baseKey, base, TTL_MS, baseTag);
    }

    const reprTag = representationTag(baseTag, page, page_size, all);
    const ifNoneMatch = req.headers.get("if-none-match");

    if (ifNoneMatch && ifNoneMatch === reprTag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: reprTag,
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=120",
        },
      });
    }

    if (all === "1") {
      const limited = base.rows.slice(
        0,
        Math.max(0, Math.min(limit, MAX_TRADES_LIMIT))
      );

      return NextResponse.json(
        {
          run_id: base.run_id,
          run_date: base.run_date,
          pagination: {
            page: 1,
            page_size: limited.length,
            total_items: base.rows.length,
            total_pages: 1,
            has_next: false,
            has_prev: false,
          },
          results: limited,
        },
        {
          headers: {
            ETag: reprTag,
            "Cache-Control":
              "public, s-maxage=3600, stale-while-revalidate=120",
          },
        }
      );
    }

    const total_items = base.rows.length;
    const total_pages = Math.ceil(total_items / page_size);
    const offset = (page - 1) * page_size;
    const slice = base.rows.slice(offset, offset + page_size);

    return NextResponse.json(
      {
        run_id: base.run_id,
        run_date: base.run_date,
        pagination: {
          page,
          page_size,
          total_items,
          total_pages,
          has_next: page < total_pages,
          has_prev: page > 1,
        },
        results: slice,
      },
      {
        headers: {
          ETag: reprTag,
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=120",
        },
      }
    );
  } catch (e) {
    console.error("detailed-results error:", e);
    return NextResponse.json(
      { error: "Internal Server Error", stack: e },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
          "x-debug": String((e as any)?.message ?? "unknown"),
        },
      }
    );
  }
};
