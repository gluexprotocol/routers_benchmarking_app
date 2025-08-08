"use client";

import { memo } from "react";
import { motion } from "framer-motion";

interface StatsCardsProps {
  data: BenchmarkData;
}

export const StatsCards = memo<StatsCardsProps>(({ data }) => {
  const cards = [
    {
      title: "Top Performer",
      value: data.topPerformer.name || "—",
      subtitle: data.topPerformer.name
        ? `<span class="text-[#01B469]">${(
            data.topPerformer.winRate ?? 0
          ).toFixed(2)}%</span> 
          <span class="text-quaternary">win rate</span>`
        : "",
      subtitleColor: "",
    },
    {
      title: "Total Trades",
      value: new Intl.NumberFormat().format(data.totalTrades),
      subtitle: "",
      subtitleColor: "",
    },
    {
      title: "Active Providers",
      value: String(data.activeProviders).padStart(2, "0"),
      subtitle: "",
      subtitleColor: "",
    },
    {
      title: "Last Updated",
      value: new Date(data.lastUpdated.date!).toLocaleDateString(),
      subtitle: `Run #${data.lastUpdated.run ?? "—"}`,
      subtitleColor: undefined,
    },
  ];

  return (
    <div className="gap-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-8">
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-background-secondary p-6 border border-border-secondary rounded-xl"
        >
          <h3 className="text-tertiary">{card.title}</h3>

          <h2 className="mt-12 mb-1 font-bold text-primary-shade text-3xl">
            {card.value}
          </h2>
          <div
            className={`text-sm ${card.subtitleColor ?? "text-quaternary"}`}
            dangerouslySetInnerHTML={{ __html: card.subtitle }}
          />
        </motion.div>
      ))}
    </div>
  );
});

StatsCards.displayName = "StatsCards";
