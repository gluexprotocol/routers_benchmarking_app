"use client";

import { memo, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { TradeDetailsModal } from "./summary";
import { CHAINS } from "~/data/chains";

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

export const DetailedResultsTable = memo<DetailedResultsTableProps>(
  ({ tradeResults, providers, onRetry, selectedChain }) => {
    const [sortField, setSortField] = useState<SortField>("amount");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

    const [selected, setSelected] = useState<TradeResult | null>(null);
    const [open, setOpen] = useState(false);

    const hasRows = tradeResults && tradeResults.length > 0;
    const hasProviders = providers && providers.length > 0;

    const openModal = (row: TradeResult) => {
      setSelected(row);
      setOpen(true);
    };
    const closeModal = () => setOpen(false);

    const sortedResults = useMemo(() => {
      if (!hasRows) return [];
      return [...tradeResults].sort((a, b) => {
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
    }, [hasRows, tradeResults, sortField, sortDirection]);

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

    const displayResolution = (v: number) => {
      const av = Math.abs(v);
      if (av > 0 && av < 1e-6) return 1e-6;
      if (av < 1) return 1e-6; // 6 dp
      if (av < 1_000) return 1e-2; // 2 dp
      return 1e-4; // up to 4 dp
    };

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

          <div className="overflow-x-auto no-scrollbar">
            <table className="bg-background-secondary rounded-xl w-full">
              <thead>
                <tr className="font-aeonik text-tertiary text-sm whitespace-nowrap">
                  <th className="px-5 py-4">
                    <SortButton field="input_amount">Token Amount</SortButton>
                  </th>

                  <th className="px-5 py-4">From Token</th>
                  <th className="px-5 py-4">To Token</th>

                  <th className="px-5 py-4">
                    <SortButton field="amount">Token Amount USD</SortButton>
                  </th>

                  <th className="px-5 py-4">Chain</th>

                  {providers.map((provider) => (
                    <th key={`${provider.id}-time`} className="px-5 py-4">
                      {provider.name} Time
                    </th>
                  ))}

                  {providers.map((provider) => (
                    <th key={`${provider.id}-output`} className="px-5 py-4">
                      {provider.name} Output
                    </th>
                  ))}

                  <th className="px-5 py-4">
                    <SortButton field="winner">Winner</SortButton>
                  </th>
                </tr>
              </thead>

              <tbody className="text-tertiary text-sm">
                {sortedResults.map((result, index) => {
                  // Times (best = lowest), unique best only
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

                  // RAW outputs (best = highest), with epsilon tolerance
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

                  // second best raw (for +Δ)
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
                      <td className="px-5 py-2.5 text-primary/80 text-center">
                        {formatOutput(Number(result.input_amount ?? 0))}
                      </td>

                      <td className="px-5 py-2.5 font-medium text-primary/90 text-center">
                        <span
                          className="inline-block max-w-[14ch] truncate"
                          title={result.fromToken}
                        >
                          {result.fromToken}
                        </span>
                      </td>

                      <td className="px-5 py-2.5 font-medium text-primary/90 text-center">
                        <span
                          className="inline-block max-w-[14ch] truncate"
                          title={result.toToken}
                        >
                          {result.toToken}
                        </span>
                      </td>

                      <td className="px-5 py-2.5 text-primary/80 text-center">
                        {fmtMoney.format(Number(result.amount || 0))}
                      </td>

                      <td className="px-5 py-2.5 text-primary/80 text-center">
                        {CHAINS.find((c) => c.id === result.chain)?.name ||
                          "Unknown"}
                      </td>

                      {/* Times */}
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
                            className={`px-5 py-2.5 text-center ${timeClass}`}
                            title={t == null ? "No quote" : `${t.toFixed(3)}s`}
                          >
                            {formatTime(t)}
                          </td>
                        );
                      })}

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

                        const deltaRaw =
                          showDeltaBadge && secondBestRaw != null
                            ? maxRaw - secondBestRaw
                            : 0;

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
                            className={`px-5 py-2.5 text-center ${outClass}`}
                            title={
                              o == null
                                ? "No quote"
                                : o.toLocaleString(undefined, {
                                    maximumFractionDigits: 18,
                                  })
                            }
                          >
                            <div className="flex flex-col items-center leading-tight">
                              <span className="tabular-nums">
                                {formatOutput(o)}
                              </span>

                              {showDeltaBadge && deltaPercentage > 0 ? (
                                <span className="opacity-80 mt-0.5 tabular-nums text-[8px]">
                                  {deltaPercentage > 0.001
                                    ? `(+${deltaPercentage.toFixed(3)}%)`
                                    : `(~0.001%)`}
                                </span>
                              ) : (
                                <span className="opacity-0 mt-0.5 text-[8px] select-none">
                                  (—)
                                </span>
                              )}
                              {/* {showDeltaBadge && deltaRaw > 0 ? (
                                <span className="opacity-80 mt-0.5 tabular-nums text-[8px]">
                                  (+{formatOutput(deltaRaw)})
                                </span>
                              ) : (
                                <span className="opacity-0 mt-0.5 text-[8px] select-none">
                                  (—)
                                </span>
                              )} */}
                            </div>
                          </td>
                        );
                      })}

                      {/* Winner chip — only if single RAW winner */}
                      <td className="px-6 py-2.5">
                        {result.winner === "All Error" || numTopRaw !== 1 ? (
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
        </motion.div>
      </>
    );
  }
);

DetailedResultsTable.displayName = "DetailedResultsTable";
