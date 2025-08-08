"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { Logo } from "~/components/brand";

export const Header = () => {
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 pb-5 border-b border-border-secondary"
      role="banner"
    >
      <div className="flex sm:flex-row flex-col justify-between items-end gap-4">
        <Link href="/" aria-label="GlueX - Home" className="">
          <Logo
            background="transparent"
            logo="full_light"
            className=""
            imageClassName="w-[168px]"
          />
        </Link>

        <nav
          className="hidden md:flex items-center gap-6 uppercase"
          aria-label="Primary"
        >
          <Link
            href="https://docs.gluex.xyz/"
            target="_blank"
            className="text-tertiary hover:text-primary text-sm transition-colors"
          >
            Docs
          </Link>
          <Link
            href="https://github.com/gluexprotocol/routers_benchmarking_app"
            target="_blank"
            className="text-tertiary hover:text-primary text-sm transition-colors"
          >
            Github
          </Link>
        </nav>
      </div>
    </motion.header>
  );
};

Header.displayName = "Header";
