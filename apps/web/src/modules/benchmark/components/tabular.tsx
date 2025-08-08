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

const fmtNum0 = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

export const DetailedResultsTable = memo<DetailedResultsTableProps>(
  ({ tradeResults, providers, onRetry, selectedChain }) => {
    const [sortField, setSortField] = useState<SortField>("amount");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

    const [selected, setSelected] = useState<TradeResult | null>(null);
    const [open, setOpen] = useState(false);

    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

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

    const toggleRowExpansion = (rowId: string) => {
      setExpandedRows((prev) => {
        const next = new Set(prev);
        next.has(rowId) ? next.delete(rowId) : next.add(rowId);
        return next;
      });
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
      if (av > 0 && av < 1e-6) {
        return "~0.000001";
      }
      if (av < 1) {
        return trimZeros(v.toFixed(6));
      }
      if (av < 1_000) {
        return trimZeros(v.toFixed(2));
      }
      return fmtNum0.format(v);
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
            <div className="mt-1 text-secondary text-sm">
              A benchmark run may be in progress or data isn’t ready yet. Please
              check again in ~10 minutes.
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
                    <SortButton field="input_amount">Input Amount</SortButton>
                  </th>

                  <th className="px-5 py-4">From Token</th>
                  <th className="px-5 py-4">To Token</th>

                  <th className="px-5 py-4">
                    <SortButton field="amount">Input USD</SortButton>
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

                  {/* <th className="px-5 py-4">
                  <SortButton field="outputDiff">Output Diff</SortButton>
                </th> */}

                  <th className="px-5 py-4">
                    <SortButton field="winner">Winner</SortButton>
                  </th>
                </tr>
              </thead>

              <tbody className="text-tertiary text-sm">
                {sortedResults.map((result, index) => {
                  // Per-row best/worst computations
                  const times = providers
                    .map((p) => result.providers[p.key]?.time)
                    .filter(
                      (v): v is number =>
                        typeof v === "number" && Number.isFinite(v)
                    );
                  const minTime = times.length ? Math.min(...times) : null;

                  const outputs = providers
                    .map((p) => result.providers[p.key]?.output)
                    .filter(
                      (v): v is number =>
                        typeof v === "number" && Number.isFinite(v)
                    );
                  const maxOutput = outputs.length
                    ? Math.max(...outputs)
                    : null;

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
                        const isBest =
                          minTime != null &&
                          t != null &&
                          Math.abs(t - minTime) < 1e-9;
                        const isSlow = typeof t === "number" && t > 6;

                        const timeClass =
                          t == null
                            ? "text-xs"
                            : isBest
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

                      {/* Outputs */}
                      {providers.map((provider) => {
                        const o =
                          result.providers[provider.key]?.output ?? null;
                        const isBest =
                          maxOutput != null &&
                          o != null &&
                          Math.abs(o - maxOutput) < 1e-9;

                        const outClass =
                          o == null
                            ? "text-xs"
                            : isBest
                            ? "text-[#01CF7A]"
                            : "";

                        return (
                          <td
                            key={`${result.id}-${provider.id}-output`}
                            className={`px-5 py-2.5 text-center ${outClass}`}
                            title={o == null ? "No quote" : fmtNum0.format(o)}
                          >
                            {formatOutput(o)}
                          </td>
                        );
                      })}

                      {/* Output Diff */}
                      {/* <td className="px-5 py-2.5 text-center">
                      <span
                        className={clsx(
                          result.outputDiff && result.outputDiff > 0
                            ? "text-[#01CF7A]"
                            : result.outputDiff === 0 ||
                              result.outputDiff == null
                            ? "text-xs"
                            : "text-[#EF4444]"
                        )}
                        title={
                          result.outputDiff != null
                            ? `${(result.outputDiff * 100).toFixed(
                                result.outputDiff * 100 > 0 ? 2 : 4
                              )}%`
                            : "—"
                        }
                      >
                        {result.outputDiff === 0
                          ? "—"
                          : formatPct(result.outputDiff)}
                      </span>
                    </td> */}

                      {/* Winner */}
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
        </motion.div>
      </>
    );
  }
);

DetailedResultsTable.displayName = "DetailedResultsTable";
