import { NextRequest, NextResponse } from "next/server";
import { getCache, makeKey, setCache } from "~/libs/cache";
import { etagFor } from "~/libs/hash";
import { getSupabaseServer } from "~/libs/supabase";
import { winRatesQuery } from "~/validations/benchmark";

export const runtime = "nodejs";

const TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
const SERVER_PAGE_SIZE = 1000; // stay under PostgREST caps
const PROVIDER_ID_CHUNK = 300; // trade_ids per .in(...) batch

type Stats = {
  total_quotes: number;
  successful_quotes: number;
  wins: number;
  total_response_time: number;
  error_count: number;
};

type ProviderAnalytics = {
  total_quotes: number;
  successful_quotes: number;
  error_count: number;
  participation_rate: number;
  win_rate: number;
  average_response_time: number;
  total_wins: number;
};

type BaseWinRates = {
  run_id: number;
  run_date: string | null;
  overall: Record<string, ProviderAnalytics>;
  total_trades_analyzed: number;
  by_chain: Record<
    string,
    {
      total_trades_analyzed: number;
      provider_analytics: Record<string, ProviderAnalytics>;
    }
  >;
};

const representationTag = (
  baseTag: string,
  chain?: string | null,
  mode?: string | null
) => {
  return etagFor({ baseTag, chain: chain ?? null, mode: mode ?? null });
};

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function fetchRunMeta(
  supabase: ReturnType<typeof getSupabaseServer>,
  runId?: number | null
) {
  if (runId) {
    const { data, error } = await supabase
      .from("benchmark_runs")
      .select("id,start_time")
      .eq("id", runId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error(`Run ${runId} not found`);
    return {
      id: data.id as number,
      start_time: (data.start_time ?? null) as string | null,
    };
  }

  const { data, error } = await supabase
    .from("benchmark_runs")
    .select("id,start_time")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("No benchmark runs found");
  return {
    id: data.id as number,
    start_time: (data.start_time ?? null) as string | null,
  };
}

/** Page through trade_results to avoid server caps. */
async function fetchAllTrades(
  supabase: ReturnType<typeof getSupabaseServer>,
  runId: number
) {
  const all: { id: number; chain: string }[] = [];
  let from = 0;

  while (true) {
    const to = from + SERVER_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("trade_results")
      .select("id,chain")
      .eq("run_id", runId)
      .order("id", { ascending: true })
      .range(from, to);

    if (error) throw error;

    const batch = (data ?? []) as { id: number; chain: string }[];
    all.push(...batch);

    if (batch.length < SERVER_PAGE_SIZE) break; // last page fetched
    from += SERVER_PAGE_SIZE;
  }

  return all;
}

/**
 * Chunk trade_ids for .in(...), and within each chunk, paginate with .range()
 * so we never exceed server row caps.
 */
async function fetchAllProviderResults(
  supabase: ReturnType<typeof getSupabaseServer>,
  tradeIds: number[]
) {
  const results: {
    provider: string;
    output_amount: string | null;
    elapsed_time: number | null;
    status_code: number | null;
    trade_id: number;
  }[] = [];

  const idChunks = chunk(tradeIds, PROVIDER_ID_CHUNK);

  for (const ids of idChunks) {
    let from = 0;
    while (true) {
      const to = from + SERVER_PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("provider_results")
        .select("provider, output_amount, elapsed_time, status_code, trade_id")
        .in("trade_id", ids)
        .order("trade_id", { ascending: true })
        .range(from, to);

      if (error) throw error;

      const batch = (data ?? []) as any[];
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
    const parsed = winRatesQuery.safeParse(
      Object.fromEntries(url.searchParams)
    );

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query", details: parsed.error.format() },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const { chain, run_id } = parsed.data;
    const mode = url.searchParams.get("mode");
    const supabase = getSupabaseServer();

    // resolve run (latest if not provided)
    let runMeta;
    try {
      runMeta = await fetchRunMeta(supabase, run_id ?? null);
    } catch (e) {
      return NextResponse.json(
        { error: (e as Error).message },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }
    const targetRunId = runMeta.id;
    const runDate = runMeta.start_time ?? null;

    // precompute base once per run
    const baseCacheKey = makeKey("win-rates:base", { run_id: targetRunId });
    const baseCached = getCache<BaseWinRates>(baseCacheKey);

    let base: BaseWinRates;
    let baseTag: string;

    if (baseCached) {
      base = baseCached.value;
      baseTag = baseCached.etag;
    } else {
      // fetch trades for this run (paged)
      const trades = await fetchAllTrades(supabase, targetRunId);

      if (!trades || trades.length === 0) {
        const emptyBase: BaseWinRates = {
          run_id: targetRunId,
          run_date: runDate,
          overall: {},
          total_trades_analyzed: 0,
          by_chain: {},
        };

        const emptyTag = etagFor(emptyBase);
        setCache(baseCacheKey, emptyBase, TTL_MS, emptyTag);

        const reprTag = representationTag(emptyTag, chain, mode);
        const payload =
          mode === "full"
            ? emptyBase
            : chain && emptyBase.by_chain[chain]
            ? {
                run_id: emptyBase.run_id,
                run_date: emptyBase.run_date,
                chain_filter: chain,
                total_trades_analyzed:
                  emptyBase.by_chain[chain].total_trades_analyzed,
                provider_analytics:
                  emptyBase.by_chain[chain].provider_analytics,
              }
            : {
                run_id: emptyBase.run_id,
                run_date: emptyBase.run_date,
                chain_filter: null,
                total_trades_analyzed: 0,
                provider_analytics: {},
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

      const tradeIds = trades.map((t) => t.id);
      const tradeChainById = new Map<number, string>(
        trades.map((t) => [t.id as number, t.chain as string])
      );

      // fetch provider_results for those trades (chunked + paged)
      const results = await fetchAllProviderResults(supabase, tradeIds);

      const overallStats: Record<string, Stats> = {};
      const perChainStats: Record<string, Record<string, Stats>> = {};
      const perChainTradesSeen: Record<string, Set<number>> = {};
      const byTradeValid: Record<
        number,
        { provider: string; output: number }[]
      > = {};

      for (const r of results) {
        const provider = r.provider;

        overallStats[provider] ??= {
          total_quotes: 0,
          successful_quotes: 0,
          wins: 0,
          total_response_time: 0,
          error_count: 0,
        };
        overallStats[provider].total_quotes += 1;

        const chainId = tradeChainById.get(r.trade_id)!;

        perChainStats[chainId] ??= {};
        perChainStats[chainId][provider] ??= {
          total_quotes: 0,
          successful_quotes: 0,
          wins: 0,
          total_response_time: 0,
          error_count: 0,
        };
        perChainStats[chainId][provider].total_quotes += 1;

        // denominator: count trades seen per chain regardless of success
        (perChainTradesSeen[chainId] ??= new Set()).add(r.trade_id);

        if (r.output_amount && r.status_code === 200) {
          const output = Number(r.output_amount);

          overallStats[provider].successful_quotes += 1;
          overallStats[provider].total_response_time += r.elapsed_time ?? 0;

          perChainStats[chainId][provider].successful_quotes += 1;
          perChainStats[chainId][provider].total_response_time +=
            r.elapsed_time ?? 0;

          (byTradeValid[r.trade_id] ??= []).push({ provider, output });
        } else {
          overallStats[provider].error_count += 1;
          perChainStats[chainId][provider].error_count += 1;
        }
      }

      // determine winners
      const overallWins = { ...overallStats };
      const chainWins: Record<string, Record<string, number>> = {};

      for (const [tradeIdStr, arr] of Object.entries(byTradeValid)) {
        arr.sort((a, b) => b.output - a.output);

        const winner = arr[0]?.provider;

        // winner only if strictly greater than second best
        if (arr.length > 1 && arr[0]?.output === arr[1]?.output) continue;
        if (!arr[0]?.output) continue;
        if (!winner) continue;

        overallWins[winner]!.wins += 1;

        const chainId = tradeChainById.get(Number(tradeIdStr))!;
        chainWins[chainId] ??= {};
        chainWins[chainId][winner] = (chainWins[chainId][winner] ?? 0) + 1;
      }

      const totalTradesOverall = trades.length;

      const overall: Record<string, ProviderAnalytics> = {};
      for (const [provider, s] of Object.entries(overallWins)) {
        const totalTradeByProvider =
          (overallStats[provider]?.successful_quotes ?? 0) +
          (overallStats[provider]?.error_count ?? 0);

        overall[provider] = {
          total_quotes: s.total_quotes,
          successful_quotes: s.successful_quotes,
          error_count: s.error_count,
          participation_rate: totalTradeByProvider
            ? (s.successful_quotes / totalTradeByProvider) * 100
            : 0,
          win_rate: totalTradeByProvider
            ? (s.wins / totalTradeByProvider) * 100
            : 0,
          average_response_time: s.successful_quotes
            ? s.total_response_time / s.successful_quotes
            : 0,
          total_wins: s.wins,
        };
      }

      const by_chain: BaseWinRates["by_chain"] = {};

      for (const [chainId, stats] of Object.entries(perChainStats)) {
        const chainTradeCount = (perChainTradesSeen[chainId] ?? new Set()).size;
        const winsForChain = chainWins[chainId] ?? {};
        const provider_analytics: Record<string, ProviderAnalytics> = {};

        for (const [provider, s] of Object.entries(stats)) {
          const wins = winsForChain[provider] ?? 0;
          const totalTradeByProviderByChain =
            (s.successful_quotes ?? 0) + (s.error_count ?? 0);

          provider_analytics[provider] = {
            total_quotes: s.total_quotes,
            successful_quotes: s.successful_quotes,
            error_count: s.error_count,
            participation_rate: totalTradeByProviderByChain
              ? (s.successful_quotes / totalTradeByProviderByChain) * 100
              : 0,
            win_rate: totalTradeByProviderByChain
              ? (wins / totalTradeByProviderByChain) * 100
              : 0,
            average_response_time: s.successful_quotes
              ? s.total_response_time / s.successful_quotes
              : 0,
            total_wins: wins,
          };
        }

        by_chain[chainId] = {
          total_trades_analyzed: chainTradeCount,
          provider_analytics,
        };
      }

      base = {
        run_id: targetRunId,
        run_date: runDate,
        overall,
        total_trades_analyzed: totalTradesOverall,
        by_chain,
      };

      baseTag = etagFor(base);
      setCache(baseCacheKey, base, TTL_MS, baseTag);
    }

    // representation for this request
    const reprTag = representationTag(baseTag, chain, mode);
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

    if (mode === "full") {
      return NextResponse.json(base, {
        headers: {
          ETag: reprTag,
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=120",
        },
      });
    }

    const view =
      chain && base.by_chain[chain]
        ? {
            run_id: base.run_id,
            run_date: base.run_date,
            chain_filter: chain,
            total_trades_analyzed: base.by_chain[chain].total_trades_analyzed,
            provider_analytics: base.by_chain[chain].provider_analytics,
          }
        : {
            run_id: base.run_id,
            run_date: base.run_date,
            chain_filter: null,
            total_trades_analyzed: base.total_trades_analyzed,
            provider_analytics: base.overall,
          };

    return NextResponse.json(view, {
      headers: {
        ETag: reprTag,
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=120",
      },
    });
  } catch (e) {
    console.error("win-rates error:", e);
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
