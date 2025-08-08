"use client";

import React from "react";
import { ChainSelector } from "./chains";

interface TitleCardProps {
  selectedChain: string | number;
  onChainChange: (chainId: string) => void;
}

const TitleCard: React.FC<TitleCardProps> = ({
  selectedChain,
  onChainChange,
}) => {
  return (
    <section className={`w-full`} aria-labelledby="dashboard-title">
      <div className="flex md:flex-row flex-col md:justify-between md:items-end gap-4 md:gap-6">
        <div className="min-w-0">
          <h2
            id="dashboard-title"
            className="mb-1 font-bold text-primary text-2xl sm:text-3xl leading-tight"
          >
            Performance Overview
          </h2>
          <p className="text-secondary text-sm sm:text-base">
            Benchmarking DEX Aggregators on the basis of quotes and speed
          </p>
        </div>

        <div className="w-full md:w-auto md:min-w-[260px]">
          <label htmlFor="chain-selector" className="sr-only">
            Select chain
          </label>
          <ChainSelector
            selectedChain={selectedChain}
            onChainChange={onChainChange}
            className="w-full"
          />
        </div>
      </div>
    </section>
  );
};

export default TitleCard;
