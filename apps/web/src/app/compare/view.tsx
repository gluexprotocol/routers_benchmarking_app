"use client";

import React from "react";
import clsx from "clsx";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

import { FiltersBar } from "~/modules/benchmark/components/filters";
import { RunsPicker } from "~/modules/benchmark/components/runs";
import { getProviderIcon } from "~/modules/benchmark/hooks/provider";
import { useCompareClient } from "~/modules/benchmark/hooks/use-compare-client";

type SortField = "amount" | "from" | "to" | "changed";
type SortDir = "asc" | "desc";

export const CompareView = () => {
  const [selectedRuns, setSelectedRuns] = React.useState<number[]>([]);
  const {
    runsList,
    groups,
    providerDeltas,
    filterOptions,
    loading,
    error,
    refetch,
  } = useCompareClient(selectedRuns);

  const toCentsRounded = (n: number) => Math.round(Number(n ?? 0) * 100) / 100;

  // provider columns (order-preserving)
  const [visibleProviders, setVisibleProviders] = React.useState<string[]>(
    filterOptions.providers
  );
  React.useEffect(() => {
    setVisibleProviders((prev) => {
      if (!prev.length) return filterOptions.providers;
      const keep = prev.filter((p) => filterOptions.providers.includes(p));
      const missing = filterOptions.providers.filter((p) => !keep.includes(p));
      return [...keep, ...missing];
    });
  }, [filterOptions.providers]);

  // filters
  const [filters, setFilters] = React.useState({
    from: [] as string[],
    to: [] as string[],
    amounts: [] as number[],
    providers: [] as string[],
  });
  const resetFilters = () =>
    setFilters({ from: [], to: [], amounts: [], providers: [] });

  const baseline = selectedRuns[0];
  const latest = selectedRuns[selectedRuns.length - 1];

  const filteredRows = React.useMemo(() => {
    let list = groups;
    if (filters.from.length) {
      list = list.filter((g) => {
        const fromName = (g.from_symbol || g.from_address) ?? "";
        return !!fromName && filters.from.includes(fromName);
      });
    }
    if (filters.to.length) {
      list = list.filter((g) => {
        const toName = (g.to_symbol || g.to_address) ?? "";
        return !!toName && filters.to.includes(toName);
      });
    }
    if (filters.amounts.length) {
      list = list.filter((g) =>
        filters.amounts.includes(toCentsRounded(Number(g.amount_usd)))
      );
    }
    if (filters.providers.length) {
      list = list.filter((g) => {
        const runs = Object.values(g.runs);
        return runs.some((R) =>
          filters.providers.some((p) => Boolean(R.providers?.[p]))
        );
      });
    }
    return list;
  }, [groups, filters]);

  // sort
  const [sortField, setSortField] = React.useState<SortField>("changed");
  const [sortDir, setSortDir] = React.useState<SortDir>("desc");
  const sorted = React.useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filteredRows].sort((a, b) => {
      if (sortField === "amount") return (a.amount_usd - b.amount_usd) * dir;
      if (sortField === "from")
        return (
          String(a.from_symbol || "").localeCompare(
            String(b.from_symbol || "")
          ) * dir
        );
      if (sortField === "to")
        return (
          String(a.to_symbol || "").localeCompare(String(b.to_symbol || "")) *
          dir
        );
      if (sortField === "changed") {
        const ca =
          baseline && latest
            ? (a.runs[baseline]?.winner || "") !==
              (a.runs[latest]?.winner || "")
            : false;
        const cb =
          baseline && latest
            ? (b.runs[baseline]?.winner || "") !==
              (b.runs[latest]?.winner || "")
            : false;
        return (Number(ca) - Number(cb)) * dir;
      }
      return 0;
    });
  }, [filteredRows, sortField, sortDir, baseline, latest]);

  // pagination
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  React.useEffect(() => {
    setPage(1);
  }, [sorted.length, pageSize, filters, sortField, sortDir]);
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIdx = (page - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, total);
  const visible = React.useMemo(
    () => sorted.slice(startIdx, endIdx),
    [sorted, startIdx, endIdx]
  );

  const SortBtn = ({ field, label }: { field: SortField; label: string }) => (
    <button
      type="button"
      onClick={() => {
        if (sortField === field)
          setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        else {
          setSortField(field);
          setSortDir("desc");
        }
      }}
      className="flex items-center gap-1 hover:text-primary text-sm"
      aria-label={`Sort by ${label}`}
      aria-pressed={sortField === field}
    >
      {label}
      {sortField === field ? (
        sortDir === "asc" ? (
          <ArrowUp className="w-4 h-4" />
        ) : (
          <ArrowDown className="w-4 h-4" />
        )
      ) : (
        <ArrowUpDown className="opacity-60 w-4 h-4" />
      )}
    </button>
  );

  // modal
  const [openKey, setOpenKey] = React.useState<string | null>(null);
  const [lastFocus, setLastFocus] = React.useState<HTMLElement | null>(null);
  const [modalShowAllProviders, setModalShowAllProviders] =
    React.useState(false);
  const closeModal = () => {
    setOpenKey(null);
    lastFocus?.focus();
  };
  const fmtMoney = (n: number) =>
    n.toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
      currencyDisplay: "narrowSymbol",
    });

  React.useEffect(() => {
    if (!openKey) {
      setModalShowAllProviders(false);
    }
  }, [openKey]);

  // status text
  const statusText = loading
    ? "Loading…"
    : error
    ? `Error: ${error}`
    : total
    ? "Data loaded"
    : "No data";

  return (
    <div className="mx-auto px-4 py-8 container">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-bold text-primary text-3xl">Compare Benchmarks</h1>
        <p className="text-secondary">
          Select runs, filter trades, and compare every provider’s output &
          speed across runs — all client-side.
        </p>
      </motion.div>

      {/* Runs picker */}
      <div className="mt-6">
        <RunsPicker
          runs={runsList}
          selected={selectedRuns}
          onChange={setSelectedRuns}
        />
      </div>

      {/* Provider deltas headline */}
      {providerDeltas.length > 0 && (
        <section className="bg-background-secondary/60 mt-4 p-4 border border-border-secondary rounded-xl">
          <div className="mb-2 text-tertiary text-xs">
            Provider win-rate change (first vs last selected)
          </div>
          <div className="gap-2 grid grid-cols-1 md:grid-cols-3">
            {providerDeltas.slice(0, 6).map((r) => (
              <div
                key={r.provider}
                className="p-3 border border-border-secondary rounded-md"
              >
                <div className="flex items-center gap-2">
                  <img
                    src={getProviderIcon(r.provider)}
                    alt={`${r.provider} icon`}
                    className="rounded w-5 h-5"
                  />
                  <div className="font-medium text-primary">{r.provider}</div>
                </div>
                <div className="mt-1 text-secondary text-sm">
                  {r.winRateFirst.toFixed(2)}% → {r.winRateLast.toFixed(2)}% (
                  {r.delta >= 0 ? "+" : ""}
                  {r.delta.toFixed(2)}%)
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Filters */}
      <FiltersBar
        fromOptions={filterOptions.fromTokens}
        toOptions={filterOptions.toTokens}
        amountOptions={filterOptions.amountsUSD}
        providerOptions={filterOptions.providers}
        providerOrder={filterOptions.providers}
        visibleProviders={visibleProviders}
        onChangeVisibleProviders={setVisibleProviders}
        value={filters}
        onChange={setFilters}
        onReset={resetFilters}
      />

      {/* Table */}
      <div className="mt-6 overflow-x-auto no-scrollbar">
        <table
          className="bg-background-secondary rounded-xl w-full"
          aria-busy={loading}
          aria-describedby="tableStatus"
        >
          <caption className="sr-only">
            Provider outputs and times per group across selected runs
          </caption>
          <thead>
            <tr className="text-tertiary text-sm whitespace-nowrap">
              <th className="px-5 py-4 text-left">
                <SortBtn field="from" label="From" />
              </th>
              <th className="px-5 py-4 text-left">
                <SortBtn field="to" label="To" />
              </th>
              <th className="px-5 py-4 text-left">
                <SortBtn field="amount" label="USD" />
              </th>
              {visibleProviders.map((p) => (
                <th key={`prov-${p}`} className="px-5 py-4 text-left">
                  {p}
                </th>
              ))}
              {/* <th className="px-5 py-4 text-left">
                <SortBtn field="changed" label="Changed winner" />
              </th> */}
            </tr>
          </thead>

          <tbody className="text-tertiary text-sm">
            {/* Loading skeleton */}
            {loading && (
              <>
                {Array.from({ length: 8 }).map((_, i) => (
                  <tr key={`s-${i}`} className="animate-pulse">
                    {Array.from({ length: 4 + visibleProviders.length }).map(
                      (__, j) => (
                        <td key={`s-${i}-${j}`} className="px-5 py-3">
                          <div className="bg-border-secondary/40 rounded h-4" />
                        </td>
                      )
                    )}
                  </tr>
                ))}
              </>
            )}

            {!loading &&
              visible.map((g) => {
                // const changed =
                //   baseline && latest
                //     ? (g.runs[baseline]?.winner || "") !==
                //       (g.runs[latest]?.winner || "")
                //     : false;

                return (
                  <tr
                    key={g.key}
                    className="opacity-90 hover:opacity-100 transition-opacity cursor-pointer"
                    tabIndex={0}
                    role="button"
                    aria-label={`Open details for ${
                      g.from_symbol || g.from_address
                    } to ${g.to_symbol || g.to_address}`}
                    aria-controls="groupDetailsDialog"
                    onClick={(e) => {
                      setLastFocus(e.currentTarget as HTMLElement);
                      setOpenKey(g.key);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setLastFocus(e.currentTarget as HTMLElement);
                        setOpenKey(g.key);
                      }
                    }}
                    title={`${g.from_symbol || g.from_address} → ${
                      g.to_symbol || g.to_address
                    }`}
                  >
                    <td className="px-5 py-3 text-primary">
                      {g.from_symbol || g.from_address.slice(0, 8)}
                    </td>
                    <td className="px-5 py-3 text-primary">
                      {g.to_symbol || g.to_address.slice(0, 8)}
                    </td>
                    <td className="px-5 py-3">
                      {fmtMoney(Number(g.amount_usd || 0))}
                    </td>

                    {visibleProviders.map((prov) => (
                      <td
                        key={`${g.key}-${prov}`}
                        className="px-5 py-3 align-top"
                      >
                        <div className="flex flex-col gap-1">
                          {selectedRuns.map((rid) => {
                            const R = g.runs[rid];
                            const stat = R?.providers?.[prov];
                            const isWinner = R?.winner === prov;
                            return (
                              <div
                                key={`${g.key}-${prov}-${rid}`}
                                className="flex justify-between items-center gap-3"
                              >
                                <span className="text-secondary text-xs">
                                  #{rid}
                                </span>
                                <div
                                  className={clsx(
                                    "flex-1 tabular-nums text-right",
                                    isWinner ? "text-[#01CF7A]" : "text-primary"
                                  )}
                                >
                                  {stat?.output == null
                                    ? "N/A"
                                    : stat.output.toLocaleString(undefined, {
                                        maximumFractionDigits: 18,
                                      })}
                                  <span className="opacity-70 ml-2 text-xs">
                                    {typeof stat?.time === "number"
                                      ? `${stat.time.toFixed(3)}s`
                                      : "—"}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    ))}

                    {/* <td className="px-5 py-3">{changed ? "Yes" : "No"}</td> */}
                  </tr>
                );
              })}

            {!loading && !error && visible.length === 0 && (
              <tr>
                <td className="px-5 py-6" colSpan={4 + visibleProviders.length}>
                  {selectedRuns.length < 2
                    ? "Select at least two runs to compare."
                    : "No matching rows for the selected filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex sm:flex-row flex-col sm:justify-between sm:items-center gap-3 mt-3 text-sm">
        <div className="text-tertiary" aria-live="polite" id="tableStatus">
          {total > 0 ? (
            <>
              Showing <span className="text-primary">{startIdx + 1}</span>–
              <span className="text-primary">{endIdx}</span> of{" "}
              <span className="text-primary">{total}</span>
            </>
          ) : (
            <>—</>
          )}
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2">
            <span className="text-tertiary text-xs">Rows / page</span>
            <select
              className="bg-background-secondary py-1.5 pr-8 pl-2 border focus:border-primary/60 border-border-secondary rounded-md outline-none text-sm appearance-none"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              aria-label="Rows per page"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <ArrowDown
              className="opacity-60 -ml-7 w-4 h-4 pointer-events-none"
              aria-hidden="true"
            />
          </label>

          <div
            className="flex items-center gap-1"
            role="group"
            aria-label="Pagination"
          >
            <button
              type="button"
              className="hover:bg-background-secondary disabled:opacity-50 px-2 py-1.5 border border-border-secondary rounded-md transition-colors"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-tertiary" aria-live="polite">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              className="hover:bg-background-secondary disabled:opacity-50 px-2 py-1.5 border border-border-secondary rounded-md transition-colors"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal details */}
      {/* Modal details */}
      {openKey &&
        (() => {
          const g = sorted.find((x) => x.key === openKey);
          if (!g) return null;

          // collect providers present in this group (across selected runs)
          const present = new Set<string>();
          for (const rid of selectedRuns) {
            const R = g.runs[rid];
            if (!R) continue;
            Object.keys(R.providers || {}).forEach((p) => present.add(p));
          }

          // keep global provider order the user picked (visibleProviders first), then the rest by filterOptions.providers
          const orderedAllProviders = [
            ...visibleProviders.filter((p) => present.has(p)),
            ...filterOptions.providers.filter(
              (p) => !visibleProviders.includes(p) && present.has(p)
            ),
          ];

          // cap by default for heavy groups, allow expand
          const cap = 12;
          const modalProviders = modalShowAllProviders
            ? orderedAllProviders
            : orderedAllProviders.slice(0, cap);

          // per-run ranks / maxima for nice badges and tiny bars
          const runMaxOut: Record<number, number> = {};
          const runMinTime: Record<number, number> = {};
          const runOutRanks: Record<number, Record<string, number>> = {};
          const runTimeRanks: Record<number, Record<string, number>> = {};

          for (const rid of selectedRuns) {
            const R = g.runs[rid];
            if (!R) continue;

            // outputs
            const outs: Array<{ p: string; v: number }> = [];
            // times
            const times: Array<{ p: string; v: number }> = [];

            for (const p of orderedAllProviders) {
              const v = R.providers?.[p];
              if (v?.output != null && Number.isFinite(v.output))
                outs.push({ p, v: v.output! });
              if (v?.time != null && Number.isFinite(v.time))
                times.push({ p, v: v.time! });
            }

            if (outs.length) {
              outs.sort((a, b) => b.v - a.v);
              runMaxOut[rid] = outs[0]!.v;
              runOutRanks[rid] = {};
              outs.forEach((row, idx) => (runOutRanks[rid]![row.p] = idx + 1));
            } else {
              runMaxOut[rid] = 0;
              runOutRanks[rid] = {};
            }

            if (times.length) {
              times.sort((a, b) => a.v - b.v);
              runMinTime[rid] = times[0]!.v;
              runTimeRanks[rid] = {};
              times.forEach(
                (row, idx) => (runTimeRanks[rid]![row.p] = idx + 1)
              );
            } else {
              runMinTime[rid] = 0;
              runTimeRanks[rid] = {};
            }
          }

          // quick CSV export for this group
          const exportCSV = () => {
            const rows: string[][] = [];
            const header = ["Provider"];
            for (const rid of selectedRuns)
              header.push(
                `#${rid} Output`,
                `#${rid} Time(s)`,
                `#${rid} Winner?`,
                `#${rid} Fastest?`
              );
            rows.push(header);

            for (const p of orderedAllProviders) {
              const line: string[] = [p];
              for (const rid of selectedRuns) {
                const R = g.runs[rid];
                const stat = R?.providers?.[p];
                line.push(
                  stat?.output == null ? "" : String(stat.output),
                  stat?.time == null ? "" : String(stat.time),
                  R?.winner === p ? "Y" : "",
                  stat?.time != null &&
                    R?.fastest_time != null &&
                    Math.abs(
                      (stat.time as number) - (R.fastest_time as number)
                    ) < 1e-12
                    ? "Y"
                    : ""
                );
              }
              rows.push(line);
            }

            const csv = rows
              .map((r) =>
                r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")
              )
              .join("\n");
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${g.from_symbol || g.from_address}_${
              g.to_symbol || g.to_address
            }_${Number(g.amount_usd)}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          };

          const copyJSON = async () => {
            const payload: any = {
              key: g.key,
              from: g.from_symbol || g.from_address,
              to: g.to_symbol || g.to_address,
              amount_usd: g.amount_usd,
              runs: {},
            };
            for (const rid of selectedRuns) {
              const R = g.runs[rid];
              payload.runs[rid] = {
                winner: R?.winner ?? null,
                fastest_time: R?.fastest_time ?? null,
                providers: R?.providers ?? {},
              };
            }
            try {
              await navigator.clipboard.writeText(
                JSON.stringify(payload, null, 2)
              );
            } catch {}
          };

          const dialogTitleId = "groupDetailsTitle";

          return (
            <div
              className="z-50 fixed inset-0 flex justify-center items-end md:items-center"
              role="dialog"
              aria-modal="true"
              aria-labelledby={dialogTitleId}
              id="groupDetailsDialog"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation();
                  closeModal();
                }
              }}
            >
              <button
                className="absolute inset-0 bg-black/50 backdrop-blur"
                onClick={closeModal}
                aria-label="Close dialog"
              />
              <div className="relative bg-background-secondary border border-border-secondary md:rounded-xl rounded-t-xl focus:outline-none w-full md:max-w-[1100px] max-h-[90vh] overflow-y-auto">
                {/* Sticky header with actions */}
                <div className="top-0 z-10 sticky flex flex-wrap justify-between items-center gap-2 bg-background-secondary px-4 md:px-6 py-3 border-b border-border-secondary">
                  <h3
                    id={dialogTitleId}
                    className="font-semibold text-primary text-lg truncate"
                  >
                    {g.from_symbol || g.from_address} →{" "}
                    {g.to_symbol || g.to_address} •{" "}
                    {fmtMoney(Number(g.amount_usd || 0))}
                  </h3>

                  <div className="flex items-center gap-2">
                    {orderedAllProviders.length > cap && (
                      <button
                        type="button"
                        className="hover:bg-background-secondary px-2 py-1.5 border border-border-secondary rounded-md text-sm"
                        onClick={() => setModalShowAllProviders((v) => !v)}
                      >
                        {modalShowAllProviders
                          ? "Show fewer providers"
                          : `Show all providers (${orderedAllProviders.length})`}
                      </button>
                    )}
                    <button
                      type="button"
                      className="hover:bg-background-secondary px-2 py-1.5 border border-border-secondary rounded-md text-sm"
                      onClick={exportCSV}
                    >
                      Export CSV
                    </button>
                    <button
                      type="button"
                      className="hover:bg-background-secondary px-2 py-1.5 border border-border-secondary rounded-md text-sm"
                      onClick={copyJSON}
                    >
                      Copy JSON
                    </button>
                    <button
                      type="button"
                      className="hover:bg-background-secondary px-2 py-1.5 border border-border-secondary rounded-md"
                      onClick={closeModal}
                      aria-label="Close details"
                      title="Close"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-4 md:p-6">
                  {/* Run summaries */}
                  <div className="gap-3 grid grid-cols-1 md:grid-cols-2">
                    {selectedRuns.map((rid) => {
                      const R = g.runs[rid];
                      const maxOut = runMaxOut[rid] ?? 0;
                      const minTime = runMinTime[rid] ?? 0;
                      // 2nd best output for spread
                      let second = 0;
                      const outs: number[] = [];
                      if (R) {
                        for (const p of orderedAllProviders) {
                          const v = R.providers?.[p]?.output;
                          if (v != null && Number.isFinite(v)) outs.push(v);
                        }
                      }
                      if (outs.length >= 2) {
                        outs.sort((a, b) => b - a);
                        second = outs[1] ?? 0;
                      }

                      const spreadAbs = maxOut && second ? maxOut - second : 0;
                      const spreadPct =
                        maxOut && second
                          ? ((maxOut - second) / maxOut) * 100
                          : 0;

                      return (
                        <div
                          key={`summary-${rid}`}
                          className="p-4 border border-border-secondary rounded-lg"
                        >
                          <div className="mb-1 text-secondary text-xs">
                            Run #{rid}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {R?.winner ? (
                              R.winner === "All Error" ? (
                                <span className="px-2 py-0.5 border border-border-secondary rounded-full text-[11px]">
                                  No Quote
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 border border-emerald-400 rounded-full text-[11px] text-emerald-300">
                                  Winner: {R.winner}
                                </span>
                              )
                            ) : (
                              <span className="px-2 py-0.5 border border-border-secondary rounded-full text-[11px]">
                                Tie
                              </span>
                            )}
                            {minTime > 0 && (
                              <span className="px-2 py-0.5 border border-border-secondary rounded-full text-[11px]">
                                Fastest: {minTime.toFixed(3)}s
                              </span>
                            )}
                            {maxOut > 0 && second > 0 && (
                              <span className="px-2 py-0.5 border border-border-secondary rounded-full text-[11px]">
                                Spread:{" "}
                                {spreadAbs.toLocaleString(undefined, {
                                  maximumFractionDigits: 10,
                                })}{" "}
                                ({spreadPct.toFixed(2)}%)
                              </span>
                            )}
                          </div>

                          {/* tiny legend */}
                          {/* <div className="mt-3 text-tertiary text-xs">
                            <span className="inline-block mr-2">
                              Output rank/time rank badges
                            </span>
                          </div> */}
                        </div>
                      );
                    })}
                  </div>

                  {/* Comparison matrix */}
                  <div className="relative -mx-4 md:-mx-6 mt-4">
                    {/* scroll container */}
                    <div className="px-4 md:px-6 overflow-x-auto overscroll-x-contain no-scrollbar">
                      <table className="bg-background-secondary border border-border-secondary rounded-lg w-max min-w-full">
                        {/* column sizing: provider fixed, each run has 2 cols */}
                        <colgroup>
                          <col style={{ width: 220 }} /> {/* provider col */}
                          {selectedRuns.map((_) => (
                            <React.Fragment key={`cg-${_}`}>
                              <col style={{ minWidth: 160 }} /> {/* output */}
                              <col style={{ minWidth: 120 }} /> {/* time */}
                            </React.Fragment>
                          ))}
                        </colgroup>

                        <thead>
                          <tr className="text-tertiary text-xs">
                            <th className="left-0 z-30 sticky bg-background-secondary px-4 py-3 border-r border-border-secondary w-[220px] min-w-[220px] max-w-[220px] text-left shrink-0">
                              Provider
                            </th>
                            {selectedRuns.map((rid) => (
                              <th
                                key={`h-${rid}`}
                                colSpan={2}
                                className="px-4 py-3 text-left"
                              >
                                Run #{rid}
                                <div className="opacity-70 text-[11px] whitespace-nowrap">
                                  Output • Time
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>

                        <tbody className="text-sm">
                          {modalProviders.map((p) => (
                            <tr
                              key={`row-${p}`}
                              className="border-t border-border-secondary"
                            >
                              {/* provider cell (sticky + fixed width) */}
                              <td
                                className="left-0 z-20 sticky bg-background-secondary px-4 py-3 border-r border-border-secondary w-[220px] min-w-[220px] max-w-[220px] text-left shrink-0"
                                title={p}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <img
                                    src={getProviderIcon(p)}
                                    alt={`${p} icon`}
                                    className="rounded w-5 h-5 shrink-0"
                                  />
                                  <span className="block max-w-[160px] text-primary truncate">
                                    {p}
                                  </span>
                                </div>
                              </td>

                              {selectedRuns.map((rid) => {
                                const R = g.runs[rid];
                                const stat = R?.providers?.[p];
                                const out = stat?.output ?? null;
                                const t = stat?.time ?? null;
                                const isWinner = R?.winner === p;
                                const isFastest =
                                  typeof t === "number" &&
                                  R?.fastest_time != null &&
                                  Math.abs(t - (R.fastest_time as number)) <
                                    1e-12;

                                const rankOut =
                                  out != null
                                    ? runOutRanks[rid]?.[p]
                                    : undefined;
                                const rankTime =
                                  t != null
                                    ? runTimeRanks[rid]?.[p]
                                    : undefined;

                                return (
                                  <React.Fragment key={`cell-${p}-${rid}`}>
                                    {/* Output cell */}
                                    <td className="px-4 py-3 min-w-[160px] align-top whitespace-nowrap">
                                      <div
                                        className={clsx(
                                          "font-medium tabular-nums",
                                          isWinner
                                            ? "text-[#01CF7A]"
                                            : "text-primary"
                                        )}
                                      >
                                        {out == null
                                          ? "N/A"
                                          : out.toLocaleString(undefined, {
                                              maximumFractionDigits: 18,
                                            })}
                                        {rankOut ? (
                                          <span className="ml-2 px-1.5 py-0.5 border border-border-secondary rounded text-[10px] text-tertiary">
                                            #{rankOut}
                                          </span>
                                        ) : null}
                                      </div>
                                    </td>

                                    {/* Time cell */}
                                    <td className="px-4 py-3 min-w-[120px] align-top whitespace-nowrap">
                                      <div
                                        className={clsx(
                                          "font-medium tabular-nums",
                                          isFastest
                                            ? "text-[#01CF7A]"
                                            : "text-primary"
                                        )}
                                      >
                                        {t == null ? "—" : `${t.toFixed(3)}s`}
                                        {rankTime ? (
                                          <span className="ml-2 px-1.5 py-0.5 border border-border-secondary rounded text-[10px] text-tertiary">
                                            #{rankTime}
                                          </span>
                                        ) : null}
                                      </div>
                                    </td>
                                  </React.Fragment>
                                );
                              })}
                            </tr>
                          ))}

                          {modalProviders.length === 0 && (
                            <tr>
                              <td
                                className="px-4 py-6 text-tertiary"
                                colSpan={1 + selectedRuns.length * 2}
                              >
                                No providers to display.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* foot note */}
                  {/* <div className="mt-3 text-tertiary text-xs">
                    Notes: Output bars are normalized per run. Ranks ignore N/A
                    values. “Winner” = highest output; “Fastest” = lowest time.
                  </div> */}
                </div>
              </div>
            </div>
          );
        })()}

      {/* Footer state */}
      <div className="mt-4 text-tertiary text-sm" aria-live="polite">
        {loading ? (
          "Loading…"
        ) : error ? (
          <span className="text-red-400">Error: {error}</span>
        ) : (
          <>
            Showing <span className="text-primary">{sorted.length}</span> rows
            {selectedRuns.length ? (
              <>
                {" "}
                • Runs:{" "}
                <span className="text-primary">{selectedRuns.join(", ")}</span>
              </>
            ) : null}
          </>
        )}
        <button
          type="button"
          onClick={refetch}
          className="hover:bg-background-secondary ml-3 px-2 py-1.5 border border-border-secondary rounded-md"
          aria-label="Refresh data"
        >
          Refresh
        </button>
      </div>

      {/* SR-only status mirror */}
      <p className="sr-only" role="status" aria-live="polite">
        {statusText}
      </p>
    </div>
  );
};
