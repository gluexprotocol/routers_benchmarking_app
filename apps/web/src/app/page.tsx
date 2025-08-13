import React from "react";
import { Metadata } from "next";

import HomeView from "./view";
import HomeSROnly from "~/components/seo/home-sr";

export const metadata: Metadata = {
  title: "Aggregator Benchmarking | GlueX Protocol",
  description:
    "Find out who is the best DEX aggregator on the basis of quotes, speed and reliability. Benchmark top providers across EVM chains (arbitrum, avalanche, base, bnb, ethereum, gnosis, hyperevm, optimism, polygon, sonic, unichain) comparing providers such as GlueX, 1inch, Odos, Bebop, Velora, 0x, Li.Fi, Bungee, Jumper, Enso, and Liqdswap for best prices and fastest quotes",
  keywords: [
    "aggregator benchmarking",
    "DEX aggregator comparison",
    "DEX benchmarking",
    "EVM chains benchmark",
    "Arbitrum DEX aggregator",
    "Avalanche DEX aggregator",
    "Base chain aggregator",
    "BNB Chain aggregator",
    "Ethereum DEX performance",
    "Gnosis DEX comparison",
    "HyperEVM benchmark",
    "Optimism aggregator",
    "Polygon aggregator benchmarking",
    "Sonic chain aggregator",
    "Unichain aggregator",
    "GlueX vs 1inch",
    "Odos aggregator performance",
    "Bebop aggregator",
    "Velora aggregator",
    "0x aggregator speed",
    "Li.Fi vs Jumper",
    "Enso aggregator",
    "Liqdswap benchmark",
    "best DEX aggregator",
    "fastest DEX quotes",
    "provider quote comparison",
    "best aggregator speed",
  ],
  openGraph: {
    images: [
      "https://raw.githubusercontent.com/gluexprotocol/public_assets/refs/heads/main/og/benchmark/og.jpg",
    ],
  },
};

const HomePage = () => {
  return (
    <>
      <HomeSROnly />
      <HomeView />
    </>
  );
};

export default HomePage;
