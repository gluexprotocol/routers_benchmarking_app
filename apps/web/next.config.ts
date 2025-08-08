import type { NextConfig } from "next";

import MillionLint from "@million/lint";
import BundleAnalyzer from "@next/bundle-analyzer";
import withPlaiceholder from "@plaiceholder/next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  compress: true,

  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
    reactRemoveProperties: { properties: ["^data-testid$"] },
  },

  modularizeImports: {
    lodash: { transform: "lodash/{{member}}" },
    "lucide-react": {
      transform: "lucide-react/dist/esm/icons/{{member}}",
    },
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ipfs.io", pathname: "/**" },
      { protocol: "https", hostname: "google.com", pathname: "/**" },
      { protocol: "https", hostname: "icons.llamao.fi", pathname: "/**" },
      { protocol: "https", hostname: "raw.githubusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "assets.coingecko.com", pathname: "/**" },
    ],
  },

  webpack: (config) => {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });

    return config;
  },

  experimental: {
    optimizePackageImports: ["~/modules/*", "~/components/*"],
    webpackMemoryOptimizations: true,
    typedRoutes: true,
  },

  // async headers() {
  //   return [
  //     {
  //       source: "/(.*).(js|css)",
  //       headers: [{ key: "Cache-Control", value: "public,max-age=31536000,immutable" }],
  //     },
  //   ]
  // },
};

const withPlugins = [
  BundleAnalyzer({
    enabled: process.env.ANALYZE === "true",
    logLevel: "info",
    analyzerMode: "static",
  }),
  MillionLint.next({ rsc: true, enabled: process.env.MILLION === "true" }),
  withPlaiceholder,
  // withPWA({ dest: "public", disable: process.env.NODE_ENV !== "production" }),
  // createNextIntlPlugin(),
];

const configWithPlugins = withPlugins.reduce(
  (acc, plugin) => plugin(acc),
  nextConfig
);

export default configWithPlugins;
