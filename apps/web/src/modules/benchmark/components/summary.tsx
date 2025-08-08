"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { useMediaQuery } from "~/hooks";
import { X } from "lucide-react";

type SortMode = "best" | "fastest";

interface TradeDetailsModalProps {
  open: boolean;
  onClose: () => void;
  trade: TradeResult | null;
  providers: Provider[];
}

const fmtMoney = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
  currencyDisplay: "narrowSymbol",
});

const fmtCompact = new Intl.NumberFormat(undefined, {
  notation: "compact",
  maximumFractionDigits: 2,
});

const trimZeros = (s: string) =>
  s.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "");

const formatOutput = (v: number | null | undefined): string => {
  if (typeof v !== "number" || !Number.isFinite(v)) return "N/A";
  const av = Math.abs(v);
  if (av > 0 && av < 1e-6) return "~0.000001";
  if (av < 1) return trimZeros(v.toFixed(6));
  if (av < 1_000) return trimZeros(v.toFixed(2));
  return fmtCompact.format(v);
};

const formatTime = (v: number | null | undefined) =>
  typeof v === "number" && Number.isFinite(v) ? `${v.toFixed(3)}s` : "—";

export const TradeDetailsModal: React.FC<TradeDetailsModalProps> = ({
  open,
  onClose,
  trade,
  providers,
}) => {
  const [sortMode, setSortMode] = React.useState<SortMode>("best");

  const isMobile = useMediaQuery("(max-width: 767px)");

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const rows = React.useMemo(() => {
    if (!trade) return [];
    return providers.map((p) => {
      const r = trade.providers[p.key] ?? { time: null, output: null };
      return {
        id: p.id,
        key: p.key,
        name: p.name,
        icon: p.icon,
        time: r?.time ?? null,
        output: r?.output ?? null,
        isWinner:
          trade.winner &&
          (trade.winner === p.name ||
            trade.winner === p.id ||
            trade.winner === p.key),
      };
    });
  }, [trade, providers]);

  const bestOutput = React.useMemo(() => {
    const outs = rows
      .map((r) => r.output)
      .filter((n): n is number => typeof n === "number");
    return outs.length ? Math.max(...outs) : null;
  }, [rows]);

  const bestTime = React.useMemo(() => {
    const ts = rows
      .map((r) => r.time)
      .filter((n): n is number => typeof n === "number");
    return ts.length ? Math.min(...ts) : null;
  }, [rows]);

  const sorted = React.useMemo(() => {
    const arr = [...rows];
    // push empty to bottom
    arr.sort((a, b) => {
      const aHas = a.output != null || a.time != null;
      const bHas = b.output != null || b.time != null;
      return aHas === bHas ? 0 : aHas ? -1 : 1;
    });

    if (sortMode === "fastest") {
      return arr.sort((a, b) => {
        const ta = typeof a.time === "number" ? a.time : Infinity;
        const tb = typeof b.time === "number" ? b.time : Infinity;
        return ta - tb;
      });
    }
    // best by output
    return arr.sort((a, b) => {
      const oa = typeof a.output === "number" ? a.output : -Infinity;
      const ob = typeof b.output === "number" ? b.output : -Infinity;
      return ob - oa;
    });
  }, [rows, sortMode]);

  // Animations
  const overlay = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  };
  const panelDesktop = {
    hidden: { opacity: 0, scale: 0.96, y: 12 },
    visible: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.98, y: 8 },
  };

  const panelMobile = {
    hidden: { y: "120%" },
    visible: { y: 40 },
    exit: { y: "120%" },
  };

  return (
    <AnimatePresence>
      {open && trade && (
        <motion.div
          className="z-[70] fixed inset-0 flex justify-center items-end md:items-center"
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* overlay */}
          <motion.button
            aria-label="Close"
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur"
            variants={overlay}
            transition={{ duration: 0.2 }}
          />

          {/* panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            variants={isMobile ? panelMobile : panelDesktop}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className={clsx(
              "relative w-full md:max-w-3xl overflow-hidden",
              "bg-background-secondary",
              "border border-border-secondary",
              isMobile
                ? "rounded-t-xl h-[90vh] max-h-[90vh]"
                : "rounded-xl max-h-[80vh]"
            )}
            style={{ display: "flex", flexDirection: "column" }}
          >
            {/* sticky header */}
            <div className="top-0 z-10 sticky bg-background-secondary px-5 md:px-6 pt-3 md:pt-5 pb-3 md:pb-4 border-b border-border-secondary">
              <div className="flex justify-between items-end md:items-end gap-3">
                <div className="min-w-0">
                  <div className="text-secondary text-xs md:text-sm">
                    {trade.chain ? `Chain: ${trade.chain}` : ""}
                  </div>
                  <h3 className="font-semibold text-primary text-lg md:text-xl truncate">
                    {trade.fromToken} → {trade.toToken}
                  </h3>
                  <div className="text-tertiary text-xs md:text-sm">
                    Input: {formatOutput(Number(trade.input_amount ?? 0))} •
                    USD: {fmtMoney.format(Number(trade.amount || 0))}
                  </div>
                </div>

                <div className="bg-black p-0 border border-border-secondary rounded-md">
                  <button
                    onClick={() => setSortMode("best")}
                    className={clsx(
                      "px-2.5 py-1 rounded h-full font-medium text-xs",
                      sortMode === "best"
                        ? "bg-green-tertiary text-primary"
                        : "text-tertiary hover:text-primary cursor-pointer"
                    )}
                  >
                    Best
                  </button>
                  <button
                    onClick={() => setSortMode("fastest")}
                    className={clsx(
                      "px-2.5 py-1 rounded h-full font-medium text-xs",
                      sortMode === "fastest"
                        ? "bg-green-tertiary text-primary"
                        : "text-tertiary hover:text-primary cursor-pointer"
                    )}
                  >
                    Fastest
                  </button>
                </div>

                <button
                  onClick={onClose}
                  className="top-2.5 right-2.5 absolute text-tertiary hover:text-primary cursor-pointer"
                >
                  <X />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* provider cards grid */}
              <div className="gap-3 grid grid-cols-1 sm:grid-cols-2 mt-4 px-5 md:px-6 pb-5">
                {sorted.map((row, idx) => {
                  const isBestOut =
                    typeof row.output === "number" &&
                    bestOutput != null &&
                    Math.abs(row.output - bestOutput) < 1e-9;
                  const isFastest =
                    typeof row.time === "number" &&
                    bestTime != null &&
                    Math.abs(row.time - bestTime) < 1e-9;

                  return (
                    <motion.div
                      key={`${row.id}-${idx}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className={clsx(
                        "bg-background-secondary",
                        "border border-border-secondary",
                        "rounded-lg p-4"
                      )}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {/* icon */}
                          {typeof row.icon === "string" &&
                          /^https?:\/\//.test(row.icon) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={row.icon}
                              alt={row.name}
                              className="rounded-md w-10 h-10 object-cover"
                            />
                          ) : (
                            <span className="text-lg">{row.icon}</span>
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold text-primary text-xl truncate">
                              {row.name}
                            </div>
                            <div className="text-secondary text-xs">
                              {row.isWinner ? "Best Quote" : "Quote"}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap justify-end items-center gap-1">
                          {row.isWinner && (
                            <span className="px-2 py-0.5 border border-border-secondary rounded-full text-[10px]">
                              Winner
                            </span>
                          )}
                          {isBestOut && (
                            <span className="px-2 py-0.5 border border-emerald-400 rounded-full text-[10px] text-emerald-300">
                              Best Return
                            </span>
                          )}
                          {isFastest && (
                            <span className="px-2 py-0.5 border border-blue-300 rounded-full text-[10px] text-blue-200">
                              Fastest
                            </span>
                          )}
                          {row.output == null && row.time == null && (
                            <span className="px-2 py-0.5 border border-border-secondary rounded-full text-[10px] text-tertiary">
                              No Quote
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="gap-3 grid grid-cols-2 mt-3">
                        <div>
                          <div className="text-secondary text-xs">Output</div>
                          <div
                            className={clsx(
                              "font-semibold",
                              isBestOut ? "text-[#01CF7A]" : "text-primary"
                            )}
                            title={
                              row.output == null
                                ? "No quote"
                                : String(row.output)
                            }
                          >
                            {formatOutput(row.output)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-secondary text-xs">Time</div>
                          <div
                            className={clsx(
                              "font-semibold",
                              isFastest
                                ? "text-[#01CF7A]"
                                : typeof row.time === "number" && row.time > 6
                                ? "text-[#EF4444]"
                                : "text-primary"
                            )}
                            title={
                              row.time == null
                                ? "No time"
                                : `${row.time.toFixed(3)}s`
                            }
                          >
                            {formatTime(row.time)}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
