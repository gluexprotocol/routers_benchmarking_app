"use client";

import React from "react";

import { fetchWithETag, withRetry } from "./fetch";
import { CLIENT_CACHE_TTL_MS, ssGet, ssSet } from "./client";
import { normalizeProviderKey } from "./provider";

export type RunMeta = { id: number; start_time: string | null };

export type TradeRow = {
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

export type ProviderRow = {
  trade_id: number;
  provider: string;
  output_amount: string | null;
  elapsed_time: number | null;
  status_code: number | null;
};

export type CompareProviderStat = {
  output: number | null;
  time: number | null;
};

export type CompareRunEntry = {
  winner: string | "All Error" | null; // null => tie
  top_output: number | null;
  fastest_time: number | null;
  providers: Record<string, CompareProviderStat>;
};

export type CompareGroup = {
  key: string; // from|to|amount (exact)
  from_symbol: string | null;
  to_symbol: string | null;
  from_address: string;
  to_address: string;
  amount_usd: number;
  runs: Record<number, CompareRunEntry>; // run_id -> entry
};

type RawPayload = {
  run_meta: RunMeta[];
  runs: Record<number, { trades: TradeRow[]; provider_results: ProviderRow[] }>;
};

type State = {
  runsList: RunMeta[];
  loading: boolean;
  error: string | null;
  perRun: Map<number, { trades: TradeRow[]; providers: ProviderRow[] }>;
};

export type FilterOptions = {
  fromTokens: string[];
  toTokens: string[];
  amountsUSD: number[];
  providers: string[];
};

export type Summary = {
  totalGroups: number;
  changedCount: number;
  providerWins: Array<{ provider: string; wins: number }>;
};

const RAW_RUN_KEY = (rid: number) => `raw:run:v1:${rid}`;
const LEGACY_RAW_RUN_KEY = (rid: number) => `raw:run:${rid}`;
const RUNS_LIST_KEY = "runs:list:v1";

/** Max run cache age = min(6h, time-until-next 03:00 UTC) */
const RUN_CACHE_MAX_MS = 6 * 60 * 60 * 1000;

function msUntilNext03UTC(): number {
  const now = new Date();
  const target = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 3, 0, 0)
  );
  if (now.getUTCHours() >= 3) target.setUTCDate(target.getUTCDate() + 1);
  return Math.max(0, target.getTime() - now.getTime());
}
function dynamicRunTTLms(): number {
  return Math.min(RUN_CACHE_MAX_MS, msUntilNext03UTC());
}

const BASE_PROVIDER_ORDER = [
  "gluex",
  "1inch",
  "zerox",
  "0x",
  "odos",
  "enso",
  "liqdswap",
];

function orderProviders(list: string[]) {
  const baseIdx = new Map(BASE_PROVIDER_ORDER.map((p, i) => [p, i]));
  return [...new Set(list)].sort((a, b) => {
    const ia = baseIdx.has(a) ? baseIdx.get(a)! : 1e9;
    const ib = baseIdx.has(b) ? baseIdx.get(b)! : 1e9;
    if (ia !== ib) return ia - ib;
    return a.localeCompare(b, undefined, { sensitivity: "base" });
  });
}

function groupKey(from: string, to: string, amount: number) {
  return `${from}|${to}|${amount}`;
}

function isValidRunPack(
  rid: number,
  pack: any
): pack is { trades: TradeRow[]; providers: ProviderRow[] } {
  if (!pack || typeof pack !== "object") return false;
  if (!Array.isArray(pack.trades) || !Array.isArray(pack.providers))
    return false;
  for (const t of pack.trades) {
    if (typeof t?.id !== "number" || t?.run_id !== rid) return false;
  }
  for (const pr of pack.providers) {
    if (typeof pr?.trade_id !== "number" || typeof pr?.provider !== "string")
      return false;
  }
  return true;
}

/* ────────────────────── Core grouping / reductions ───────────────────── */

function buildGroups(
  perRun: Map<number, { trades: TradeRow[]; providers: ProviderRow[] }>,
  selected: number[]
): CompareGroup[] {
  const provIndex = new Map<number, Map<number, ProviderRow[]>>();
  for (const rid of selected) {
    const r = perRun.get(rid);
    const map = new Map<number, ProviderRow[]>();
    if (r) {
      for (const pr of r.providers) {
        const arr = map.get(pr.trade_id) ?? [];
        arr.push(pr);
        map.set(pr.trade_id, arr);
      }
    }
    provIndex.set(rid, map);
  }

  const groups = new Map<string, CompareGroup>();
  for (const rid of selected) {
    const r = perRun.get(rid);
    if (!r) continue;

    for (const t of r.trades) {
      const key = groupKey(t.from_token, t.to_token, Number(t.amount_usd));
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          from_symbol: t.from_token_symbol,
          to_symbol: t.to_token_symbol,
          from_address: t.from_token,
          to_address: t.to_token,
          amount_usd: t.amount_usd,
          runs: {},
        });
      }

      const pmap = provIndex.get(rid) ?? new Map();
      const provs = pmap.get(t.id) ?? [];

      const providers: Record<string, CompareProviderStat> = {};
      const outs: number[] = [];
      const times: number[] = [];

      for (const pr of provs) {
        const k = normalizeProviderKey(pr.provider);
        const out =
          pr.output_amount && pr.status_code === 200
            ? Number(pr.output_amount)
            : null;
        const tm = typeof pr.elapsed_time === "number" ? pr.elapsed_time : null;

        providers[k] = { output: out, time: tm };
        if (out != null && Number.isFinite(out)) outs.push(out);
        if (tm != null && Number.isFinite(tm)) times.push(tm);
      }

      let winner: string | "All Error" | null = "All Error";
      let top_output: number | null = null;
      if (outs.length) {
        const max = Math.max(...outs);
        const ties = outs.filter((v) => Math.abs(v - max) < 1e-12).length;
        top_output = max;
        winner =
          ties === 1
            ? (Object.entries(providers).find(
                ([, v]) =>
                  v.output != null &&
                  Math.abs((v.output as number) - max) < 1e-12
              )?.[0] as string) ?? null
            : null;
      }
      const fastest_time = times.length ? Math.min(...times) : null;

      groups.get(key)!.runs[rid] = {
        winner,
        top_output,
        fastest_time,
        providers,
      };
    }
  }

  const res: CompareGroup[] = [];
  for (const g of groups.values()) {
    let count = 0;
    for (const rid of selected) if (g.runs[rid]) count++;
    if (count >= 2) res.push(g);
  }

  res.sort((a, b) => a.key.localeCompare(b.key));
  return res;
}

/* ────────────────────── RAW API cache-first with TTL ─────────────────── */

function tryRead(storage: Storage, key: string): any | undefined {
  try {
    const raw = storage.getItem(key);
    if (!raw) return undefined;
    try {
      return JSON.parse(raw);
    } catch {
      return undefined;
    }
  } catch {
    return undefined;
  }
}

function normalizeStoredPack(
  maybe: any
): { trades: TradeRow[]; providers: ProviderRow[] } | null {
  if (!maybe || typeof maybe !== "object") return null;
  const payload = maybe.data ?? maybe;
  if (!payload || typeof payload !== "object") return null;

  const trades = Array.isArray(payload.trades)
    ? (payload.trades as TradeRow[])
    : [];
  const providersArray = Array.isArray(payload.providers)
    ? (payload.providers as ProviderRow[])
    : Array.isArray(payload.provider_results)
    ? (payload.provider_results as ProviderRow[])
    : [];

  return { trades, providers: providersArray };
}

type CachedCandidate = {
  pack: { trades: TradeRow[]; providers: ProviderRow[] };
  fresh: boolean;
  ts: number | null;
} | null;

function getCachedRunPackWithTTL(rid: number): CachedCandidate {
  const ttl = dynamicRunTTLms();

  const evalCandidate = (obj: any): CachedCandidate => {
    const ts: number | null =
      obj && typeof obj === "object" && typeof obj.ts === "number"
        ? obj.ts
        : null;
    const norm = normalizeStoredPack(obj);
    if (!norm) return null;
    const ageOk = ts != null ? Date.now() - ts < ttl : false; // unknown ts => treat as stale
    return { pack: norm, fresh: ageOk, ts };
  };

  // sessionStorage (ssGet wrapper) – new key
  const ssNew = ssGet<any>(RAW_RUN_KEY(rid));
  if (ssNew?.data) {
    const cand = evalCandidate(ssNew);
    if (cand && isValidRunPack(rid, cand.pack)) return cand;
  } else {
    // direct sessionStorage in case someone wrote raw JSON
    const directSSNew = tryRead(window.sessionStorage, RAW_RUN_KEY(rid));
    const cand = evalCandidate(directSSNew);
    if (cand && isValidRunPack(rid, cand.pack)) return cand;
  }

  // sessionStorage (legacy key)
  const directSSLegacy = tryRead(
    window.sessionStorage,
    LEGACY_RAW_RUN_KEY(rid)
  );
  {
    const cand = evalCandidate(directSSLegacy);
    if (cand && isValidRunPack(rid, cand.pack)) return cand;
  }

  // localStorage (new key)
  const localNew = tryRead(window.localStorage, RAW_RUN_KEY(rid));
  {
    const cand = evalCandidate(localNew);
    if (cand && isValidRunPack(rid, cand.pack)) return cand;
  }

  // localStorage (legacy key)
  const localLegacy = tryRead(window.localStorage, LEGACY_RAW_RUN_KEY(rid));
  {
    const cand = evalCandidate(localLegacy);
    if (cand && isValidRunPack(rid, cand.pack)) return cand;
  }

  return null;
}

function persistRunPack(
  rid: number,
  etag: string | undefined,
  pack: { trades: TradeRow[]; providers: ProviderRow[] }
) {
  // session wrapper consistent with ssSet (etag + data + ts)
  ssSet(RAW_RUN_KEY(rid), { etag, data: pack });

  const wrapper = JSON.stringify({
    etag: etag ?? null,
    ts: Date.now(),
    data: pack,
  });
  try {
    window.localStorage.setItem(RAW_RUN_KEY(rid), wrapper);
    window.localStorage.setItem(LEGACY_RAW_RUN_KEY(rid), wrapper);
    window.sessionStorage.setItem(LEGACY_RAW_RUN_KEY(rid), wrapper);
  } catch {
    // quota issues: ignore
  }
}

/* ─────────────────────────── Hook ─────────────────────────── */

export function useCompareClient(selectedRunIds: number[]) {
  const [state, setState] = React.useState<State>({
    runsList: [],
    loading: true,
    error: null,
    perRun: new Map(),
  });

  const abortRef = React.useRef<AbortController | null>(null);
  const selectedKey = React.useMemo(
    () => selectedRunIds.join(","),
    [selectedRunIds]
  );

  const loadRunsList = React.useCallback(async (): Promise<RunMeta[]> => {
    const cached = ssGet<any>(RUNS_LIST_KEY);
    const fresh =
      !!cached && Date.now() - (cached.ts ?? 0) < CLIENT_CACHE_TTL_MS;

    const { status, etag, json } = await fetchWithETag<any>(
      "/api/benchmark/runs",
      fresh ? cached?.etag : undefined,
      abortRef.current?.signal
    );

    if (status === 304 && fresh && cached?.data) {
      return (cached.data.runs as RunMeta[]) ?? [];
    }
    if (!json) throw new Error("Empty runs");
    ssSet(RUNS_LIST_KEY, { etag, data: json });
    return (json.runs as RunMeta[]) ?? [];
  }, []);

  // ONLY RAW FETCH LOGIC touched: cache-first with TTL and stale fallback
  const ensureRuns = React.useCallback(async (runIds: number[]) => {
    const result = new Map<
      number,
      { trades: TradeRow[]; providers: ProviderRow[] }
    >();
    const missing: number[] = [];
    const staleFallback = new Map<
      number,
      { trades: TradeRow[]; providers: ProviderRow[] }
    >();

    // read caches with TTL
    for (const rid of runIds) {
      const cand = getCachedRunPackWithTTL(rid);
      if (cand && isValidRunPack(rid, cand.pack)) {
        if (cand.fresh) {
          // fresh: use directly, do not hit network
          result.set(rid, cand.pack);
        } else {
          // stale: remember as fallback, but try to refresh
          staleFallback.set(rid, cand.pack);
          missing.push(rid);
        }
      } else {
        missing.push(rid);
      }
    }

    // everything resolved from fresh cache → done
    if (missing.length === 0) return result;

    // fetch only the missing/expired runs in one batch
    try {
      const params = new URLSearchParams({
        run_ids: missing.join(","),
      }).toString();
      const { json, etag } = await fetchWithETag<RawPayload>(
        `/api/benchmark/raw?${params}`,
        undefined,
        abortRef.current?.signal
      );
      if (!json) throw new Error("Empty raw");

      // normalize + persist
      for (const ridStr of Object.keys(json.runs)) {
        const rid = Number(ridStr);
        const pack = json.runs[rid] || { trades: [], provider_results: [] };
        const normalized = {
          trades: (pack.trades ?? []) as TradeRow[],
          providers: (pack.provider_results ?? []) as ProviderRow[],
        };
        if (isValidRunPack(rid, normalized)) {
          persistRunPack(rid, etag, normalized);
          result.set(rid, normalized);
        }
      }

      // if server omitted some ids (unlikely), fall back to stale for those
      for (const rid of missing) {
        if (!result.has(rid) && staleFallback.has(rid)) {
          result.set(rid, staleFallback.get(rid)!);
        }
      }
    } catch {
      // network failed → use stale for all missing if we have it
      for (const rid of missing) {
        const stale = staleFallback.get(rid);
        if (stale) result.set(rid, stale);
      }
      // if some missing had no stale, we'll leave them unresolved and let caller show error
      const unresolved = missing.filter((rid) => !result.has(rid));
      if (unresolved.length) {
        throw new Error(`Failed to load runs: ${unresolved.join(",")}`);
      }
    }

    return result;
  }, []);

  React.useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    (async () => {
      try {
        const runsList = await withRetry(loadRunsList);
        setState((s) => ({ ...s, runsList, loading: false, error: null }));
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setState((s) => ({
          ...s,
          loading: false,
          error: e?.message || "Failed to load runs",
        }));
      }
    })();

    return () => abortRef.current?.abort();
  }, [loadRunsList]);

  React.useEffect(() => {
    if (!selectedRunIds.length) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));

    (async () => {
      try {
        const added = await withRetry(() => ensureRuns(selectedRunIds));
        setState((s) => {
          const perRun = new Map(s.perRun);
          for (const [rid, pack] of added.entries()) perRun.set(rid, pack);
          return { ...s, perRun, loading: false, error: null };
        });
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setState((s) => ({
          ...s,
          loading: false,
          error: e?.message || "Failed to load data",
        }));
      }
    })();

    return () => abortRef.current?.abort();
  }, [ensureRuns, selectedKey]);

  const refetch = React.useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const [runsList, added] = await Promise.all([
        withRetry(loadRunsList),
        withRetry(() => ensureRuns(selectedRunIds)),
      ]);
      setState((s) => {
        const perRun = new Map(s.perRun);
        for (const [rid, pack] of added.entries()) perRun.set(rid, pack);
        return { ...s, runsList, perRun, loading: false, error: null };
      });
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setState((s) => ({
        ...s,
        loading: false,
        error: e?.message || "Refresh failed",
      }));
    }
  }, [ensureRuns, loadRunsList, selectedKey]);

  const groups = React.useMemo(() => {
    if (!selectedRunIds.length) return [];
    return buildGroups(state.perRun, selectedRunIds);
  }, [state.perRun, selectedKey]);

  const providerDeltas = React.useMemo(() => {
    if (!groups.length || selectedRunIds.length < 2) return [];
    const first = selectedRunIds[0]!;
    const last = selectedRunIds[selectedRunIds.length - 1]!;
    const map = new Map<
      string,
      { winsA: number; winsB: number; quotesA: number; quotesB: number }
    >();

    for (const g of groups) {
      const A = g.runs[first],
        B = g.runs[last];
      if (!A || !B) continue;

      const provs = new Set([
        ...Object.keys(A.providers || {}),
        ...Object.keys(B.providers || {}),
      ]);
      for (const p of provs) {
        const a = A.providers[p],
          b = B.providers[p];
        const cur = map.get(p) ?? {
          winsA: 0,
          winsB: 0,
          quotesA: 0,
          quotesB: 0,
        };
        if (a && (a.output != null || a.time != null)) cur.quotesA += 1;
        if (b && (b.output != null || b.time != null)) cur.quotesB += 1;
        if (A.winner === p) cur.winsA += 1;
        if (B.winner === p) cur.winsB += 1;
        map.set(p, cur);
      }
    }

    const rows = Array.from(map.entries()).map(([provider, v]) => {
      const wrA = v.quotesA ? (v.winsA / v.quotesA) * 100 : 0;
      const wrB = v.quotesB ? (v.winsB / v.quotesB) * 100 : 0;
      return {
        provider,
        winRateFirst: wrA,
        winRateLast: wrB,
        delta: wrB - wrA,
      };
    });
    rows.sort((a, b) => b.delta - a.delta);
    return rows;
  }, [groups, selectedKey]);

  const filterOptions: FilterOptions = React.useMemo(() => {
    const fromSet = new Set<string>();
    const toSet = new Set<string>();
    const amountSet = new Set<number>();
    const provSet = new Set<string>();

    for (const g of groups) {
      const fromName = (g.from_symbol || g.from_address) ?? "";
      const toName = (g.to_symbol || g.to_address) ?? "";
      if (fromName) fromSet.add(fromName);
      if (toName) toSet.add(toName);
      amountSet.add(Math.round(Number(g.amount_usd) * 100) / 100);
      for (const rid of selectedRunIds) {
        const R = g.runs[rid];
        if (!R) continue;
        for (const p of Object.keys(R.providers || {})) provSet.add(p);
      }
    }

    return {
      fromTokens: Array.from(fromSet).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" })
      ),
      toTokens: Array.from(toSet).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" })
      ),
      amountsUSD: Array.from(amountSet).sort((a, b) => a - b),
      providers: orderProviders(Array.from(provSet)),
    };
  }, [groups, selectedKey]);

  const summary: Summary = React.useMemo(() => {
    const totalGroups = groups.length;
    let changedCount = 0;
    const winMap = new Map<string, number>();
    if (selectedRunIds.length >= 2) {
      const first = selectedRunIds[0]!;
      const last = selectedRunIds[selectedRunIds.length - 1]!;
      for (const g of groups) {
        const a = g.runs[first]?.winner || "";
        const b = g.runs[last]?.winner || "";
        if (a !== b) changedCount++;
      }
    }
    for (const g of groups) {
      for (const rid of selectedRunIds) {
        const w = g.runs[rid]?.winner;
        if (w && w !== "All Error") winMap.set(w, (winMap.get(w) ?? 0) + 1);
      }
    }
    const providerWins = Array.from(winMap.entries())
      .map(([provider, wins]) => ({ provider, wins }))
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 6);
    return { totalGroups, changedCount, providerWins };
  }, [groups, selectedKey]);

  return {
    runsList: state.runsList,
    loading: state.loading,
    error: state.error,
    groups,
    providerDeltas,
    filterOptions,
    summary,
    refetch,
  };
}
