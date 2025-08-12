"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";

import { CHAINS } from "~/data/chains";
import { TradeDetailsModal } from "./summary";

interface DetailedResultsTableProps {
  tradeResults: TradeResult[];
  providers: Provider[];
  onRetry?: () => void;
  selectedChain?: string;
}

type SortField =
  | "tradingPair"
  | "input_amount"
  | "amount"
  | "winner"
  | "outputDiff";
type SortDirection = "asc" | "desc";

const fmtMoney = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
  currencyDisplay: "narrowSymbol",
});
const fmtNum0 = new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 });

/** Build a compact page list like: [1, '…', 4, 5, 6, 7, 8, '…', 20] */
function getPageItems(page: number, totalPages: number, maxLength = 9) {
  if (totalPages <= maxLength) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const left = Math.max(2, page - 2);
  const right = Math.min(totalPages - 1, page + 2);

  const items: (number | "…")[] = [1];
  if (left > 2) items.push("…");
  for (let p = left; p <= right; p++) items.push(p);
  if (right < totalPages - 1) items.push("…");
  items.push(totalPages);
  return items;
}

export const DetailedResultsTable = memo<DetailedResultsTableProps>(
  ({ tradeResults, providers, onRetry }) => {
    const [sortField, setSortField] = useState<SortField>("amount");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);

    // dropdown filters
    const [fromSel, setFromSel] = useState<string>("");
    const [toSel, setToSel] = useState<string>("");
    const [minUsdSel, setMinUsdSel] = useState<string>("");
    const [maxUsdSel, setMaxUsdSel] = useState<string>("");
    const [winnerSel, setWinnerSel] = useState<string>("");

    const [selected, setSelected] = useState<TradeResult | null>(null);
    const [open, setOpen] = useState(false);

    const hasRows = Array.isArray(tradeResults) && tradeResults.length > 0;
    const hasProviders = Array.isArray(providers) && providers.length > 0;

    const openModal = (row: TradeResult) => {
      setSelected(row);
      setOpen(true);
    };
    const closeModal = () => setOpen(false);

    const handleSort = (field: SortField) => {
      if (sortField === field) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDirection("desc");
      }
    };

    const SortButton = ({
      field,
      children,
    }: {
      field: SortField;
      children: React.ReactNode;
    }) => (
      <button
        onClick={() => handleSort(field)}
        className="flex items-center gap-1 hover:text-primary text-sm transition-colors cursor-pointer"
      >
        {children}
        {sortField === field ? (
          sortDirection === "asc" ? (
            <ArrowUp className="w-4 h-4" />
          ) : (
            <ArrowDown className="w-4 h-4" />
          )
        ) : (
          <ArrowUpDown className="opacity-50 w-4 h-4" />
        )}
      </button>
    );

    const formatTime = (v: number | null | undefined) =>
      typeof v === "number" && Number.isFinite(v) ? `${v.toFixed(3)}s` : "—";

    const trimZeros = (s: string) =>
      s.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "");

    const formatOutput = (v: number | null | undefined): string => {
      if (typeof v !== "number" || !Number.isFinite(v)) return "N/A";
      const av = Math.abs(v);
      if (av > 0 && av < 1e-6) return "~0.000001";
      if (av < 1) return trimZeros(v.toFixed(6));
      if (av < 1_000) return trimZeros(v.toFixed(2));
      return fmtNum0.format(v);
    };

    /* ----------------------------- context-aware options ---------------------------- */
    const fromTokenOptions = useMemo(() => {
      if (!hasRows) return [] as string[];
      const s = new Set<string>();
      for (const r of tradeResults) {
        if (toSel && String(r.toToken ?? "") !== toSel) continue;
        if (winnerSel && String(r.winner ?? "") !== winnerSel) continue;
        if (r.fromToken) s.add(String(r.fromToken));
      }
      return Array.from(s).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" })
      );
    }, [hasRows, tradeResults, toSel, winnerSel]);

    const toTokenOptions = useMemo(() => {
      if (!hasRows) return [] as string[];
      const s = new Set<string>();
      for (const r of tradeResults) {
        if (fromSel && String(r.fromToken ?? "") !== fromSel) continue;
        if (winnerSel && String(r.winner ?? "") !== winnerSel) continue;
        if (r.toToken) s.add(String(r.toToken));
      }
      return Array.from(s).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" })
      );
    }, [hasRows, tradeResults, fromSel, winnerSel]);

    const usdAmountOptions = useMemo(() => {
      if (!hasRows) return [] as number[];
      const s = new Set<number>();
      for (const r of tradeResults) {
        if (fromSel && String(r.fromToken ?? "") !== fromSel) continue;
        if (toSel && String(r.toToken ?? "") !== toSel) continue;
        if (winnerSel && String(r.winner ?? "") !== winnerSel) continue;

        const raw = (r as any).amount;
        const n =
          typeof raw === "number"
            ? raw
            : Number(String(raw).replace(/[^0-9.+-eE]/g, ""));
        if (Number.isFinite(n)) s.add(n);
      }
      return Array.from(s).sort((a, b) => a - b);
    }, [hasRows, tradeResults, fromSel, toSel, winnerSel]);

    const winnerOptions = useMemo(() => {
      if (!hasRows) return [] as string[];
      const s = new Set<string>();
      for (const r of tradeResults) {
        if (fromSel && String(r.fromToken ?? "") !== fromSel) continue;
        if (toSel && String(r.toToken ?? "") !== toSel) continue;
        const w = String(r.winner ?? "");
        if (w) s.add(w);
      }
      const arr = Array.from(s);
      const top = arr.filter((w) => w === "GlueX" || w === "All Error");
      const rest = arr.filter((w) => w !== "GlueX" && w !== "All Error");
      rest.sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" })
      );
      return [...top, ...rest];
    }, [hasRows, tradeResults, fromSel, toSel]);

    /* ------------------------------ filtering ------------------------------ */
    const minUsdNum = useMemo(() => {
      if (minUsdSel === "") return null;
      const n = Number(minUsdSel);
      return Number.isFinite(n) ? n : null;
    }, [minUsdSel]);

    const maxUsdNum = useMemo(() => {
      if (maxUsdSel === "") return null;
      const n = Number(maxUsdSel);
      return Number.isFinite(n) ? n : null;
    }, [maxUsdSel]);

    // guard against min > max by swapping in-place
    const [minBound, maxBound] = useMemo<[number | null, number | null]>(() => {
      if (
        minUsdNum != null &&
        maxUsdNum != null &&
        Number.isFinite(minUsdNum) &&
        Number.isFinite(maxUsdNum) &&
        minUsdNum > maxUsdNum
      ) {
        return [maxUsdNum, minUsdNum];
      }
      return [minUsdNum, maxUsdNum];
    }, [minUsdNum, maxUsdNum]);

    const filteredResults = useMemo(() => {
      if (!hasRows) return [];
      return tradeResults.filter((r) => {
        const fromOk = fromSel ? String(r.fromToken ?? "") === fromSel : true;
        const toOk = toSel ? String(r.toToken ?? "") === toSel : true;
        const winnerOk = winnerSel
          ? String(r.winner ?? "") === winnerSel
          : true;

        const rawAmt = (r as any).amount;
        const amt =
          typeof rawAmt === "number"
            ? rawAmt
            : Number(String(rawAmt).replace(/[^0-9.+-eE]/g, ""));

        const minOk =
          minBound == null ? true : Number.isFinite(amt) && amt >= minBound;
        const maxOk =
          maxBound == null ? true : Number.isFinite(amt) && amt <= maxBound;

        return fromOk && toOk && winnerOk && minOk && maxOk;
      });
    }, [hasRows, tradeResults, fromSel, toSel, winnerSel, minBound, maxBound]);

    const hasActiveFilters =
      !!fromSel || !!toSel || !!winnerSel || !!minUsdSel || !!maxUsdSel;

    /* ------------------------------- sorting ------------------------------- */
    const sortedResults = useMemo(() => {
      if (!filteredResults.length) return [];
      return [...filteredResults].sort((a, b) => {
        let aValue: any = a[sortField];
        let bValue: any = b[sortField];

        if (sortField === "amount") {
          aValue = Number(aValue);
          bValue = Number(bValue);
        } else if (sortField === "outputDiff") {
          aValue = a.outputDiff ?? -Infinity;
          bValue = b.outputDiff ?? -Infinity;
        } else if (sortField === "tradingPair" || sortField === "winner") {
          aValue = String(aValue ?? "");
          bValue = String(bValue ?? "");
        }

        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }, [filteredResults, sortField, sortDirection]);

    /* ----------------------------- pagination ----------------------------- */
    const total = sortedResults.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    useEffect(() => {
      setPage(1);
    }, [
      fromSel,
      toSel,
      winnerSel,
      minBound,
      maxBound,
      sortField,
      sortDirection,
      pageSize,
    ]);

    const startIdx = (page - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, total);
    const visibleResults = useMemo(
      () => sortedResults.slice(startIdx, endIdx),
      [sortedResults, startIdx, endIdx]
    );

    const resetFilters = useCallback(() => {
      setFromSel("");
      setToSel("");
      setWinnerSel("");
      setMinUsdSel("");
      setMaxUsdSel("");
    }, []);

    /* --------------------------------- UI --------------------------------- */

    if (!hasRows || !hasProviders) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="overflow-hidden"
        >
          <div className="mb-6">
            <h2 className="mb-1 font-bold text-primary text-2xl">
              Detailed Results
            </h2>
            <p className="text-secondary">
              Complete trading data with provider performance, response times,
              outputs and winner analysis
            </p>
          </div>

          <div className="bg-background-secondary p-8 border border-border-secondary rounded-xl text-center">
            <div className="font-semibold text-primary text-lg">
              No trade data available
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center bg-[color:var(--color-green-tertiary)]/20 hover:bg-[color:var(--color-green-tertiary)]/30 mt-3 px-3 py-2 rounded-md text-[color:var(--color-primary)] text-sm transition-colors"
              >
                Retry
              </button>
            )}
          </div>
        </motion.div>
      );
    }

    return (
      <>
        <TradeDetailsModal
          open={open}
          onClose={closeModal}
          trade={selected}
          providers={providers}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="overflow-hidden"
        >
          <div className="mb-6">
            <h2 className="mb-1 font-bold text-primary text-2xl">
              Detailed Results
            </h2>
            <p className="text-secondary">
              Detailed tabulated results comparing performance of{" "}
              {providers.map((p) => p.name).join(", ")} in terms of response
              times and output values
            </p>
          </div>

          <div className="bg-background-secondary/60 mb-3 p-4 border border-border-secondary rounded-xl">
            <div className="items-end gap-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
              {/* From token */}
              <label className="flex flex-col gap-1">
                <span className="text-tertiary text-xs">From Token</span>
                <select
                  value={fromSel}
                  onChange={(e) => setFromSel(e.target.value)}
                  className="bg-background-secondary px-3 py-2 border focus:border-primary/60 border-border-secondary rounded-md outline-none text-sm"
                >
                  <option value="">All</option>
                  {fromTokenOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              {/* To token */}
              <label className="flex flex-col gap-1">
                <span className="text-tertiary text-xs">To Token</span>
                <select
                  value={toSel}
                  onChange={(e) => setToSel(e.target.value)}
                  className="bg-background-secondary px-3 py-2 border focus:border-primary/60 border-border-secondary rounded-md outline-none text-sm"
                >
                  <option value="">All</option>
                  {toTokenOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              {/* Winner */}
              <label className="flex flex-col gap-1">
                <span className="text-tertiary text-xs">Winner</span>
                <select
                  value={winnerSel}
                  onChange={(e) => setWinnerSel(e.target.value)}
                  className="bg-background-secondary px-3 py-2 border focus:border-primary/60 border-border-secondary rounded-md outline-none text-sm"
                >
                  <option value="">All</option>
                  {winnerOptions.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </label>
              {/* Min USD */}
              <label className="flex flex-col gap-1">
                <span className="text-tertiary text-xs">Min USD</span>
                <select
                  value={minUsdSel}
                  onChange={(e) => setMinUsdSel(e.target.value)}
                  className="bg-background-secondary px-3 py-2 border focus:border-primary/60 border-border-secondary rounded-md outline-none text-sm"
                >
                  <option value="">Any</option>
                  {usdAmountOptions.map((n) => (
                    <option key={`min-${n}`} value={String(n)}>
                      {fmtMoney.format(n)}
                    </option>
                  ))}
                </select>
              </label>
              {/* Max USD */}
              <label className="flex flex-col gap-1">
                <span className="text-tertiary text-xs">Max USD</span>
                <select
                  value={maxUsdSel}
                  onChange={(e) => setMaxUsdSel(e.target.value)}
                  className="bg-background-secondary px-3 py-2 border focus:border-primary/60 border-border-secondary rounded-md outline-none text-sm"
                >
                  <option value="">Any</option>
                  {usdAmountOptions.map((n) => (
                    <option key={`max-${n}`} value={String(n)}>
                      {fmtMoney.format(n)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mb-3">
              {fromSel && (
                <button
                  onClick={() => setFromSel("")}
                  className="px-2 py-1 border border-border-secondary rounded-full text-xs"
                >
                  From: {fromSel} ✕
                </button>
              )}
              {toSel && (
                <button
                  onClick={() => setToSel("")}
                  className="px-2 py-1 border border-border-secondary rounded-full text-xs"
                >
                  To: {toSel} ✕
                </button>
              )}
              {winnerSel && (
                <button
                  onClick={() => setWinnerSel("")}
                  className="px-2 py-1 border border-border-secondary rounded-full text-xs"
                >
                  Winner: {winnerSel} ✕
                </button>
              )}
              {minUsdSel && (
                <button
                  onClick={() => setMinUsdSel("")}
                  className="px-2 py-1 border border-border-secondary rounded-full text-xs"
                >
                  Min: {fmtMoney.format(Number(minUsdSel))} ✕
                </button>
              )}
              {maxUsdSel && (
                <button
                  onClick={() => setMaxUsdSel("")}
                  className="px-2 py-1 border border-border-secondary rounded-full text-xs"
                >
                  Max: {fmtMoney.format(Number(maxUsdSel))} ✕
                </button>
              )}
              <button
                onClick={resetFilters}
                className="ml-1 px-2 py-1 border border-border-secondary rounded-full text-xs"
                title="Clear all"
              >
                Clear all
              </button>
            </div>
          )}

          <div className="flex justify-between items-center mb-4">
            <p className="text-tertiary text-sm">
              Showing{" "}
              <span className="text-primary">{total ? startIdx + 1 : 0}</span>–
              <span className="text-primary">{endIdx}</span> of{" "}
              <span className="text-primary">{total}</span>
              {hasActiveFilters && (
                <> (filtered from {tradeResults.length} total)</>
              )}
            </p>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="hover:bg-background-secondary disabled:opacity-50 p-2 border border-border-secondary rounded-lg transition-colors disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="px-2 text-tertiary text-sm">
                  Page {page} of {totalPages}
                </span>

                <button
                  onClick={() =>
                    setPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={page === totalPages}
                  className="hover:bg-background-secondary disabled:opacity-50 p-2 border border-border-secondary rounded-lg transition-colors disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 hover:bg-background-secondary px-3 py-2 border border-border-secondary rounded-md text-xs transition-colors"
                  title="Reset filters"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto no-scrollbar">
            <table className="bg-background-secondary rounded-xl w-full">
              <thead>
                <tr className="font-aeonik text-tertiary text-sm whitespace-nowrap">
                  <th className="px-5 py-4 text-left">
                    <SortButton field="input_amount">Token Amount</SortButton>
                  </th>
                  <th className="px-5 py-4 text-left">From Token</th>
                  <th className="px-5 py-4 text-left">To Token</th>
                  <th className="px-5 py-4 text-left">
                    <SortButton field="amount">Token Amount USD</SortButton>
                  </th>
                  <th className="px-5 py-4 text-left">Chain</th>

                  {providers.map((provider) => (
                    <th
                      key={`${provider.id}-output`}
                      className="px-5 py-4 text-left"
                    >
                      {provider.name} Quote
                    </th>
                  ))}

                  {providers.map((provider) => (
                    <th
                      key={`${provider.id}-time`}
                      className="px-5 py-4 text-left"
                    >
                      {provider.name} Time
                    </th>
                  ))}

                  <th className="px-5 py-4 text-left">
                    <SortButton field="winner">Winner</SortButton>
                  </th>
                </tr>
              </thead>

              <tbody className="text-tertiary text-sm">
                {visibleResults.map((result, index) => {
                  const EPS = 1e-12;

                  const timesRaw = providers
                    .map((p) => result.providers[p.key]?.time)
                    .filter(
                      (v): v is number =>
                        typeof v === "number" && Number.isFinite(v)
                    );
                  const minTime = timesRaw.length
                    ? Math.min(...timesRaw)
                    : null;
                  const numFastest =
                    minTime == null
                      ? 0
                      : timesRaw.filter((t) => Math.abs(t - minTime) < EPS)
                          .length;

                  const outputsRawAll = providers.map(
                    (p) => result.providers[p.key]?.output ?? null
                  );
                  const outputsRaw = outputsRawAll.filter(
                    (v): v is number =>
                      typeof v === "number" && Number.isFinite(v)
                  );
                  const maxRaw = outputsRaw.length
                    ? Math.max(...outputsRaw)
                    : null;
                  const numTopRaw =
                    maxRaw == null
                      ? 0
                      : outputsRaw.filter((v) => Math.abs(v - maxRaw) < EPS)
                          .length;

                  let secondBestRaw: number | undefined;
                  if (outputsRaw.length >= 2) {
                    const sortedRaw = [...outputsRaw].sort((a, b) => b - a);
                    const idx = sortedRaw.findIndex(
                      (v) => Math.abs(v - sortedRaw[0]!) >= EPS
                    );
                    secondBestRaw = idx === -1 ? undefined : sortedRaw[idx];
                  }

                  return (
                    <motion.tr
                      key={result.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className="opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                      onClick={() => openModal(result)}
                      title={result.tradingPair}
                    >
                      <td className="px-5 py-2.5 text-primary/80 text-left">
                        {formatOutput(Number(result.input_amount ?? 0))}
                      </td>

                      <td className="px-5 py-2.5 font-medium text-primary/90 text-left">
                        <span
                          className="inline-block max-w-[14ch] truncate"
                          title={result.fromToken}
                        >
                          {result.fromToken}
                        </span>
                      </td>

                      <td className="px-5 py-2.5 font-medium text-primary/90 text-left">
                        <span
                          className="inline-block max-w-[14ch] truncate"
                          title={result.toToken}
                        >
                          {result.toToken}
                        </span>
                      </td>

                      <td className="px-5 py-2.5 text-primary/80 text-left">
                        {fmtMoney.format(Number(result.amount || 0))}
                      </td>

                      <td className="px-5 py-2.5 text-primary/80 text-left">
                        {CHAINS.find((c) => c.id === result.chain)?.name ||
                          "Unknown"}
                      </td>

                      {providers.map((provider) => {
                        const o =
                          result.providers[provider.key]?.output ?? null;

                        const isUniqueRawBest =
                          numTopRaw === 1 &&
                          maxRaw != null &&
                          o != null &&
                          Math.abs(o - maxRaw) < EPS;

                        const isRawTiedBest =
                          numTopRaw > 1 &&
                          maxRaw != null &&
                          o != null &&
                          Math.abs(o - maxRaw) < EPS;

                        const outClass =
                          o == null
                            ? "text-xs"
                            : isUniqueRawBest || isRawTiedBest
                            ? "text-[#01CF7A]"
                            : "";

                        const showDeltaBadge =
                          isUniqueRawBest &&
                          secondBestRaw != null &&
                          maxRaw != null;
                        let deltaPercentage = 0;
                        if (
                          showDeltaBadge &&
                          secondBestRaw != null &&
                          maxRaw != null &&
                          secondBestRaw !== 0
                        ) {
                          deltaPercentage =
                            ((maxRaw - secondBestRaw) / secondBestRaw) * 100;
                        }

                        return (
                          <td
                            key={`${result.id}-${provider.id}-output`}
                            className={`px-5 py-2.5 text-left ${outClass}`}
                            title={
                              o == null
                                ? "No quote"
                                : o.toLocaleString(undefined, {
                                    maximumFractionDigits: 18,
                                  })
                            }
                          >
                            <div className="flex flex-col items-left leading-tight">
                              <span className="tabular-nums">
                                {formatOutput(o)}
                              </span>

                              {showDeltaBadge && deltaPercentage > 0 ? (
                                <span className="opacity-80 mt-0.5 tabular-nums text-[10px]">
                                  {deltaPercentage > 0.001
                                    ? `(+${deltaPercentage.toFixed(3)}%)`
                                    : `(~0.001%)`}
                                </span>
                              ) : (
                                <span className="opacity-0 mt-0.5 text-[8px] select-none">
                                  (—)
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {providers.map((provider) => {
                        const t = result.providers[provider.key]?.time ?? null;
                        const isUniqueFastest =
                          numFastest === 1 &&
                          minTime != null &&
                          t != null &&
                          Math.abs(t - minTime) < EPS;

                        const isSlow = typeof t === "number" && t > 6;

                        const timeClass =
                          t == null
                            ? "text-xs"
                            : isUniqueFastest
                            ? "text-[#01CF7A]"
                            : isSlow
                            ? "text-[#EF4444]"
                            : "";

                        return (
                          <td
                            key={`${result.id}-${provider.id}-time`}
                            className={`px-5 py-2.5 text-left ${timeClass}`}
                            title={t == null ? "No quote" : `${t.toFixed(3)}s`}
                          >
                            {formatTime(t)}
                          </td>
                        );
                      })}

                      <td className="px-6 py-2.5">
                        {result.winner === "All Error" ? (
                          <></>
                        ) : result.winner === "GlueX" ? (
                          <span className="px-2 py-1 border border-green-tertiary rounded-xl font-medium text-green-primary text-xs">
                            GlueX
                          </span>
                        ) : (
                          <span className="px-2 py-1 border border-border-secondary rounded-xl font-medium text-xs">
                            {providers.find((p) => p.name === result.winner)
                              ?.name || result.winner}
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom Pagination */}
          <div className="flex sm:flex-row flex-col sm:justify-between sm:items-center gap-3 mt-3 text-sm">
            <div className="text-tertiary">
              {total > 0 ? (
                <>
                  Showing{" "}
                  <span className="font-medium text-primary">
                    {startIdx + 1}
                  </span>
                  –<span className="font-medium text-primary">{endIdx}</span> of{" "}
                  <span className="font-medium text-primary">{total}</span>
                </>
              ) : (
                <>—</>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Rows / page */}
              <label className="flex items-center gap-2">
                <span className="text-tertiary text-xs">Rows / page</span>
                <div className="relative">
                  <select
                    className="bg-background-secondary py-1.5 pr-8 pl-2 border focus:border-primary/60 border-border-secondary rounded-md outline-none text-sm appearance-none"
                    value={pageSize}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      setPageSize(n);
                      setPage(1);
                    }}
                    aria-label="Rows per page"
                    title="Rows per page"
                  >
                    {[10, 25, 50, 100].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <span className="top-1/2 right-2 absolute opacity-60 -translate-y-1/2 pointer-events-none">
                    <ArrowDown className="w-4 h-4" />
                  </span>
                </div>
              </label>

              {/* Numbered pagination */}
              <div className="flex items-center gap-1">
                <button
                  className="hover:bg-background-secondary disabled:opacity-50 px-2 py-1.5 border border-border-secondary rounded-md transition-colors"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  aria-label="Previous page"
                  title="Previous page"
                >
                  Prev
                </button>

                {getPageItems(page, totalPages).map((item, i) =>
                  item === "…" ? (
                    <span key={`ellipsis-${i}`} className="px-2 select-none">
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setPage(item as number)}
                      className={
                        "min-w-8 h-8 px-2 rounded-md border transition-colors " +
                        (item === page
                          ? "border-primary/60 text-primary bg-background-secondary"
                          : "border-border-secondary hover:bg-background-secondary")
                      }
                      aria-current={item === page ? "page" : undefined}
                      aria-label={`Go to page ${item}`}
                      title={`Page ${item}`}
                    >
                      {item}
                    </button>
                  )
                )}

                <button
                  className="hover:bg-background-secondary disabled:opacity-50 px-2 py-1.5 border border-border-secondary rounded-md transition-colors"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  aria-label="Next page"
                  title="Next page"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </>
    );
  }
);

DetailedResultsTable.displayName = "DetailedResultsTable";
