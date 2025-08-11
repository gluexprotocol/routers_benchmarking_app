"use client";

import { memo, useMemo } from "react";
import Image from "next/image";
import clsx from "clsx";
import { motion } from "framer-motion";
import { Info } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

interface ProvidersGridProps {
  providers: Provider[];
  onRetry?: () => void;
}

export const ProvidersGrid = memo<ProvidersGridProps>(
  ({ providers, onRetry }) => {
    const isEmpty = !providers || providers.length === 0;

    const { topWinRateId, fastestId } = useMemo(() => {
      let topWinRateId: string | null = null;
      let bestWin = -Infinity;
      let fastestId: string | null = null;
      let bestTime = Infinity;

      for (const p of providers ?? []) {
        if (Number.isFinite(p.winRate) && p.winRate > bestWin) {
          bestWin = p.winRate;
          topWinRateId = p.id;
        }
        if (Number.isFinite(p.avgResponse) && p.avgResponse < bestTime) {
          bestTime = p.avgResponse;
          fastestId = p.id;
        }
      }
      return { topWinRateId, fastestId };
    }, [providers]);

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mb-12"
      >
        <div className="bg-gradient-to-br from-gradient-verde-from to-gradient-verde-to p-2.5 rounded-xl">
          {isEmpty ? (
            <EmptyProvidersState onRetry={onRetry} />
          ) : (
            <div
              className={clsx(
                "gap-2.5 grid grid-cols-6",
                "[&>.provider-card]:col-span-6",
                "sm:[&>.provider-card]:col-span-3",
                "lg:[&>.provider-card]:col-span-2",
                "sm:[&>.provider-card:last-child:nth-child(2n+1)]:col-span-6",
                "lg:[&>.provider-card:nth-last-child(2):nth-child(3n+1)]:col-span-3",
                "lg:[&>.provider-card:last-child:nth-child(3n+2)]:col-span-3",
                "lg:[&>.provider-card:last-child:nth-child(3n+1)]:col-span-6"
              )}
            >
              {providers.map((provider, index) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  index={index}
                  isTopWin={provider.id === topWinRateId}
                  isFastest={provider.id === fastestId}
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    );
  }
);

ProvidersGrid.displayName = "ProvidersGrid";

interface ProviderCardProps {
  provider: Provider;
  index: number;
  isTopWin?: boolean;
  isFastest?: boolean;
}

const pct = (v: number) => `${Number.isFinite(v) ? v.toFixed(2) : "0.00"}%`;
const sec = (s: number) => (Number.isFinite(s) ? `${s.toFixed(2)}s` : "—");

export const ProviderCard = memo<ProviderCardProps>(
  ({ provider, index, isTopWin, isFastest }) => {
    const winPct = Number.isFinite(provider.winRate) ? provider.winRate : 0;
    const partPct = Number.isFinite(provider.participation)
      ? provider.participation
      : 0;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ y: -2, opacity: 1 }}
        transition={{ delay: index * 0.06 }}
        className="bg-background-secondary opacity-90 hover:opacity-100 rounded-xl h-full provider-card"
      >
        <div className="p-6 gradient-border-content h-full">
          {/* Header */}
          <div className="flex justify-between items-start mb-5">
            <div className="flex items-center gap-3">
              <span className="text-xl">
                <Image
                  src={provider.icon}
                  alt={provider.name}
                  width={1080}
                  height={1080}
                  className="rounded-xl w-12"
                />
              </span>
              <div className="leading-tight">
                <h3 className="font-semibold text-primary text-2xl">
                  {provider.name}
                </h3>
                <div className="text-secondary text-xs">
                  {provider.totalQuotes} quotes • {provider.errors} errors
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isTopWin && (
                <span className="hidden lg:block opacity-80 hover:opacity-100 px-2.5 py-0.5 border border-emerald-400 rounded-full font-medium text-emerald-400 text-xs transition-all">
                  Top Win Rate
                </span>
              )}
              {isFastest && (
                <span className="hidden lg:block opacity-80 hover:opacity-100 px-2.5 py-0.5 border border-blue-300 rounded-full font-medium text-blue-300 text-xs transition-all">
                  Fastest
                </span>
              )}
              <div className="opacity-80 hover:opacity-100 px-2.5 py-0.5 border border-green-primary rounded-full font-medium text-green-primary text-xs transition-all">
                {provider.wins} wins
              </div>
            </div>
          </div>

          <div className="gap-2 grid grid-cols-2">
            {/* Win Rate */}
            <div className="flex flex-col space-y-0.5">
              <div className="flex items-center gap-1 text-secondary text-sm">
                Win Rate
                <Tooltip placement="top" delay={80}>
                  <TooltipTrigger asChild>
                    <span
                      aria-label="What is Win Rate?"
                      className="inline-flex align-middle cursor-pointer"
                    >
                      <Info className="w-4 h-4 text-secondary" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>
                      Shows how often {provider.name} gave the best quote for a
                      trade
                    </p>
                    <p className="mt-1 text-muted-foreground text-xs">
                      Note: if two providers give the same best quote, neither
                      is counted as a winner so totals may not reach 100%
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="font-bold text-primary text-xl">
                {pct(winPct)}
              </div>
            </div>

            {/* Participation */}
            <div className="flex flex-col space-y-0.5">
              <div className="flex items-center gap-1 text-secondary text-sm">
                Participation
                <Tooltip placement="top" delay={80}>
                  <TooltipTrigger asChild>
                    <span
                      aria-label="What is Participation?"
                      className="inline-flex align-middle cursor-pointer"
                    >
                      <Info className="w-4 h-4 text-secondary" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>
                      Shows how often {provider.name} successfully took part in
                      trades compared to all trades they were involved in
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="font-bold text-primary text-xl">
                {pct(partPct)}
              </div>
            </div>

            {/* Successful Trades */}
            <div className="space-y-0.5">
              <div className="flex items-center gap-1 text-secondary text-sm">
                Successful Trades
                <Tooltip placement="top" delay={80}>
                  <TooltipTrigger asChild>
                    <span
                      aria-label="What are Successful Trades?"
                      className="inline-flex align-middle cursor-pointer"
                    >
                      <Info className="w-4 h-4 text-secondary" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>
                      Number of trades {provider.name} successfully provided a
                      quote compared to total trades they attempted
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="font-bold text-primary text-xl">
                {provider.successfulTrades} / {provider.totalTrades}
              </div>
            </div>

            {/* Avg Response */}
            <div className="space-y-0.5">
              <div className="flex items-center gap-1 text-secondary text-sm">
                Avg Response
                <Tooltip placement="top" delay={80}>
                  <TooltipTrigger asChild>
                    <span
                      aria-label="What is Avg Response?"
                      className="inline-flex align-middle cursor-pointer"
                    >
                      <Info className="w-4 h-4 text-secondary" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>
                      Average time {provider.name} took to respond with a quote
                      (considered only for successful quotes)
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className={clsx("font-bold text-primary text-xl")}>
                {sec(provider.avgResponse)}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }
);

ProviderCard.displayName = "ProviderCard";

const EmptyProvidersState = ({ onRetry }: { onRetry?: () => void }) => {
  return (
    <div className="bg-background-secondary p-8 border border-border-secondary rounded-xl">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="font-semibold text-primary text-lg">
          No provider data available
        </div>
        <div className="text-secondary text-sm">
          A new benchmark run may be in progress or data isn’t ready yet. Please
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
    </div>
  );
};
