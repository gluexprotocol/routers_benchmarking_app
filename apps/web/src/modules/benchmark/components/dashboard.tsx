"use client";

import { motion } from "framer-motion";
import { useCallback, useState } from "react";

import { useBenchmarkData } from "../hooks/use-benchmark-data";
import { ErrorState } from "./error";
import { Header } from "./header";
import { ProvidersGrid } from "./providers";
import {
  ProvidersSkeleton,
  StatsSkeleton,
  TableSkeleton,
  TitleSkeleton,
} from "./skeleton";
import { StatsCards } from "./stats";
import { DetailedResultsTable } from "./tabular";
import TitleCard from "./title";

export const Dashboard = () => {
  const [selectedChain, setSelectedChain] = useState("all");
  const { data, loading, error, refetch } = useBenchmarkData(selectedChain);

  const handleChainChange = useCallback((chainId: string) => {
    setSelectedChain(chainId);
  }, []);

  return (
    <div className="">
      <div className="mx-auto px-4 py-8 container">
        <Header />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-8 mt-12"
        >
          <div className="space-y-8">
            {loading ? (
              <>
                <TitleSkeleton />
                <StatsSkeleton />
              </>
            ) : error ? (
              <>
                <TitleCard
                  selectedChain={selectedChain}
                  onChainChange={handleChainChange}
                />
                <ErrorState message={error} onRetry={refetch} />
              </>
            ) : data ? (
              <>
                <TitleCard
                  selectedChain={selectedChain}
                  onChainChange={handleChainChange}
                />
                <StatsCards data={data} />
              </>
            ) : (
              <>
                <TitleSkeleton />
                <StatsSkeleton />
              </>
            )}
          </div>

          {loading ? (
            <ProvidersSkeleton />
          ) : error ? (
            <ErrorState message={error} onRetry={refetch} />
          ) : data ? (
            <ProvidersGrid providers={data.providers} />
          ) : null}

          {loading ? (
            <TableSkeleton />
          ) : error ? (
            <ErrorState message={error} onRetry={refetch} />
          ) : data ? (
            <DetailedResultsTable
              // @ts-ignore
              tradeResults={data.tradeResults}
              providers={data.providers}
              onRetry={refetch}
              selectedChain={selectedChain}
            />
          ) : null}
        </motion.div>
      </div>
    </div>
  );
};
