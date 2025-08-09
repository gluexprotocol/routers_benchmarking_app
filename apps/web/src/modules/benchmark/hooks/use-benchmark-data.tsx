"use client";

import React from "react";

import { CLIENT_CACHE_TTL_MS, ssGet, ssSet } from "./client";
import { fetchWithETag, withRetry } from "./fetch";
import { getProviderIcon, normalizeProviderKey } from "./provider";

export const useBenchmarkData = (selectedChain: string) => {
  const [state, setState] = React.useState<DashboardState>({
    selectedChain,
    data: null,
    loading: true,
    error: null,
  });

  const abortRef = React.useRef<AbortController | null>(null);
  const rawRef = React.useRef<{
    win: WinRateResponse | null;
    det: DetailedRunResponse | null;
  }>({
    win: null,
    det: null,
  });

  const fetchAll = React.useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    const winKey = `winRates:ALL_FULL`;
    const detKey = `detailed:ALL`;

    const winCache = ssGet<WinRateResponse>(winKey);
    const detCache = ssGet<DetailedRunResponse>(detKey);

    const winFresh =
      !!winCache && Date.now() - (winCache.ts ?? 0) < CLIENT_CACHE_TTL_MS;
    const detFresh =
      !!detCache && Date.now() - (detCache.ts ?? 0) < CLIENT_CACHE_TTL_MS;

    const winPromise = withRetry(async () => {
      const url = `/api/benchmark/win-rates?mode=full`;
      const { status, etag, json } = await fetchWithETag<WinRateResponse>(
        url,
        winFresh ? winCache?.etag : undefined,
        controller.signal
      );
      if (status === 304 && winFresh && winCache?.data) {
        return { data: winCache.data, etag: winCache.etag };
      }
      if (!json) throw new Error("Empty win-rates");
      ssSet(winKey, { etag, data: json });
      return { data: json, etag };
    });

    const detPromise = withRetry(async () => {
      const url = `/api/benchmark/detailed-results?all=1&limit=5000`;
      const { status, etag, json } = await fetchWithETag<DetailedRunResponse>(
        url,
        detFresh ? detCache?.etag : undefined,
        controller.signal
      );
      if (status === 304 && detFresh && detCache?.data) {
        return { data: detCache.data, etag: detCache.etag };
      }
      if (!json) throw new Error("Empty detailed-results");
      ssSet(detKey, { etag, data: json });
      return { data: json, etag };
    });

    const [win, det] = await Promise.all([winPromise, detPromise]);
    rawRef.current = { win: win.data, det: det.data };

    console.log({ win: win.data, det: det.data });

    return { win: win.data, det: det.data };
  }, []);

  const recomputeView = React.useCallback(
    (
      raw: { win: WinRateResponse; det: DetailedRunResponse },
      chain: string
    ) => {
      const { win, det } = raw;

      // choose analytics based on chain
      const analytics =
        chain && win.by_chain[chain]
          ? {
              total_trades: win.by_chain[chain].total_trades_analyzed,
              data: win.by_chain[chain].provider_analytics,
            }
          : {
              total_trades: win.total_trades_analyzed,
              data: win.overall,
            };

      const providers: Provider[] = Object.entries(analytics.data).map(
        ([id, s]) => {
          const key = normalizeProviderKey(id);
          return {
            id,
            key,
            name: id,
            icon: getProviderIcon(key),
            winRate: s.win_rate,
            participation: s.participation_rate,
            successfulTrades: s.successful_quotes,
            totalTrades: analytics.total_trades,
            avgResponse: s.average_response_time,
            totalQuotes: s.total_quotes,
            errors: s.error_count,
            wins: s.total_wins,
          };
        }
      );

      const topPerformer = providers[0]
        ? providers.reduce((a, b) => (a.winRate >= b.winRate ? a : b))
        : undefined;

      // filter trades by chain on client
      const filteredTrades =
        chain && chain.length > 0 && chain !== "all"
          ? det.results.filter((r) => r.chain === chain)
          : det.results;

      const tradeResults = filteredTrades.map((r, idx) => {
        // normalize provider keys -> times/outputs
        const providerKeys = [
          "1inch",
          "gluex",
          "zerox",
          "0x",
          "enso",
          "odos",
          "liqdswap",
        ] as const;

        // build providers with normalized keys only
        const providersObj: Record<
          string,
          { time: number | null; output: number | null }
        > = {};

        for (const key of providerKeys) {
          const norm = normalizeProviderKey(key as unknown as string);
          const time =
            (r as any)[`${norm}_time`] ?? (r as any)[`${key}_time`] ?? null;
          const rawOut =
            (r as any)[`${norm}_output`] ?? (r as any)[`${key}_output`] ?? null;
          providersObj[norm] = {
            time: typeof time === "number" ? time : null,
            output: rawOut != null ? Number(rawOut) : null,
          };
        }

        // derive % diff from top vs second using available outputs
        const outputs = Object.values(providersObj)
          .map((o) => o.output)
          .filter((v): v is number => typeof v === "number" && !Number.isNaN(v))
          .sort((a, b) => b - a);

        let outputDiffPct: number | null = null;

        if (outputs.length > 1 && outputs[1] !== 0) {
          outputDiffPct = (outputs[0]! - outputs[1]!) / Math.abs(outputs[1]!);
        } else if (outputs.length === 1) {
          outputDiffPct = 0; // only one valid quote
        }

        return {
          id: `trade-${idx}`,
          chain: Number(r.chain),
          tradingPair: r.trading_pair,
          fromToken: r.from_token,
          toToken: r.to_token,
          input_amount: r.input_amount,
          amount: r.amount_usd,
          providers: providersObj,
          winner: r.winner, // display name like "GlueX
          outputDiff: outputDiffPct, // FRACTION for the UI % (can be null)
        };
      });

      const data: BenchmarkData = {
        topPerformer: {
          name: topPerformer?.name ?? "",
          winRate: topPerformer?.winRate ?? 0,
        },
        totalTrades: analytics.total_trades,
        activeProviders: providers.length,
        lastUpdated: {
          date: win.run_date ?? det.run_date,
          run: win.run_id ?? det.run_id,
        },
        providers,
        tradeResults,
      };

      setState((prev) => ({
        ...prev,
        data,
        loading: false,
        error: null,
        selectedChain: chain,
      }));
    },
    []
  );

  const fetchData = React.useCallback(async () => {
    try {
      if (!rawRef.current.win || !rawRef.current.det) {
        const raw = await fetchAll();
        recomputeView(raw as any, selectedChain);
      } else {
        recomputeView(rawRef.current as any, selectedChain);
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err?.message || "Failed to fetch benchmark data",
      }));
    }
  }, [fetchAll, recomputeView, selectedChain]);

  React.useEffect(() => {
    fetchData();
    return () => abortRef.current?.abort();
  }, [fetchData]);

  const computedData = React.useMemo(() => {
    if (!state.data) return null;
    const totalWins = state.data.providers.reduce((sum, p) => sum + p.wins, 0);
    const avgResponseTime =
      state.data.providers.length > 0
        ? state.data.providers.reduce((sum, p) => sum + p.avgResponse, 0) /
          state.data.providers.length
        : 0;
    return { ...state.data, totalWins, avgResponseTime };
  }, [state.data]);

  return {
    ...state,
    data: computedData,
    refetch: fetchAll,
  };
};
