import React from "react";
import { Metadata, NextPage, Viewport } from "next";
import dynamic from "next/dynamic";

import { siteConfig } from "~/config";

import "~/styles/global.css";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  creator: "",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: [siteConfig.image],
    creator: siteConfig.socials.twitter.handle,
  },
  icons: {},
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#191919" },
  ],
};

const TailwindSizeIndicator = dynamic(
  () => import("~/modules/indicators/components/size/tailwind-size")
);

const RootLayout: NextPage<IChildren> = ({ children }: IProvider) => {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="dark bg-background">
        <TailwindSizeIndicator />
        {children}
      </body>
    </html>
  );
};

export default RootLayout;
