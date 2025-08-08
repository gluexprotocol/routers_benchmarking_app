"use client";

import React from "react";
import Image from "next/image";
import clsx from "clsx";
import { ChevronDown, Check, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { CHAINS } from "~/data/chains";

interface ChainSelectorProps {
  selectedChain?: string | number;
  onChainChange: (chainId: string) => void;
  className?: string;
}

export const ChainSelector: React.FC<ChainSelectorProps> = ({
  selectedChain,
  onChainChange,
  className = "",
}) => {
  const chains = CHAINS;

  const [isOpen, setIsOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState<number>(-1);
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);

  // auto-select first chain if none is provided
  React.useEffect(() => {
    if (!selectedChain && chains.length > 0) {
      const firstChain = chains[0];
      if (firstChain) {
        onChainChange(String(firstChain.id));
      }
    }
  }, [selectedChain, chains, onChainChange]);

  const normalizedSelected =
    typeof selectedChain === "string" ? Number(selectedChain) : selectedChain;

  const selected = React.useMemo(() => {
    return chains.find((c) => c.id === normalizedSelected) || chains[0];
  }, [chains, normalizedSelected]);

  const filteredChains = React.useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    if (!q) {
      return chains;
    }

    return chains.filter((c) => {
      const hay = `${c.name} ${c.identifier ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [chains, searchTerm]);

  const handleToggle = React.useCallback(() => {
    setIsOpen((p) => !p);
  }, []);

  const handleSelect = React.useCallback(
    (id: number) => {
      onChainChange(String(id));
      setIsOpen(false);
      setSearchTerm("");
      setActiveIndex(-1);
    },
    [onChainChange]
  );

  // outside click
  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // keyboard navigation
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => setActiveIndex(0), 0);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => {
        const next = Math.min((i < 0 ? -1 : i) + 1, filteredChains.length - 1);
        scrollIntoView(next);
        return next;
      });
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => {
        const next = Math.max((i < 0 ? filteredChains.length : i) - 1, 0);
        scrollIntoView(next);
        return next;
      });
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const item = filteredChains[activeIndex];
      if (item) handleSelect(item.id);
      return;
    }
  };

  const scrollIntoView = (index: number) => {
    const container = listRef.current;
    if (!container) return;
    const el = container.querySelector<HTMLButtonElement>(
      `button[data-idx="${index}"]`
    );
    if (el) {
      const { offsetTop, offsetHeight } = el;
      const { scrollTop, clientHeight } = container;
      if (offsetTop < scrollTop) container.scrollTop = offsetTop;
      else if (offsetTop + offsetHeight > scrollTop + clientHeight)
        container.scrollTop = offsetTop + offsetHeight - clientHeight;
    }
  };

  const highlight = (text: string, q: string) => {
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span style={{ color: "var(--color-green-primary)" }}>
          {text.slice(idx, idx + q.length)}
        </span>
        {text.slice(idx + q.length)}
      </>
    );
  };

  return (
    <div
      ref={wrapperRef}
      className={`relative ${className}`}
      onKeyDown={onKeyDown}
    >
      {/* Trigger */}
      <button
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`
          group flex items-center justify-between gap-3
          w-full min-w-[240px]
          px-3 py-2 rounded-lg
          transition-colors
          bg-background-secondary
          border border-border-secondary
          text-primary
          hover:text-white
          hover:border-green-tertiary
          focus:outline-none focus-visible:ring-1 focus-visible:ring-green-tertiary
        `}
      >
        <div className="flex items-center gap-2 truncate">
          {selected?.logo ? (
            <Image
              src={selected.logo}
              alt={selected.name}
              width={18}
              height={18}
              className="rounded-sm"
            />
          ) : (
            <div className="bg-border-secondary rounded-sm w-[18px] h-[18px]" />
          )}
          <span className="font-medium text-sm">
            {selected?.name ?? "Select"}
          </span>
        </div>

        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.18 }}
        >
          <ChevronDown className="w-4 h-4 text-tertiary group-hover:text-white" />
        </motion.div>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className={`
              absolute left-0 right-0 z-50 mt-2
              rounded-lg overflow-hidden
              bg-background-secondary
              border border-border-secondary
              shadow-[0_10px_28px_rgba(0,0,0,0.35)]
            `}
          >
            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border-secondary">
              <Search className="w-4 h-4 text-tertiary" />
              <input
                type="text"
                placeholder="Search chains..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setActiveIndex(0);
                }}
                className={`
                  bg-transparent flex-1 text-sm
                  text-primary
                  placeholder-tertiary
                  focus:outline-none
                `}
                autoFocus
              />
            </div>

            {/* List */}
            <div
              ref={listRef}
              className="focus:outline-none max-h-72 overflow-y-auto"
              role="listbox"
            >
              {filteredChains.map((chain, idx) => {
                const isSelected = String(chain.id) === String(selected?.id);
                const isActive = idx === activeIndex;

                return (
                  <button
                    key={`${chain.id}`}
                    data-idx={idx}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => handleSelect(chain.id)}
                    role="option"
                    aria-selected={isSelected}
                    className={clsx(
                      "flex justify-between items-center gap-3 px-3 py-2.5 w-full text-primary text-left transition-colors",
                      isActive ? "bg-white/5" : "hover:bg-white/5",
                      chain.isComingSoon && "opacity-60 cursor-not-allowed"
                    )}
                    disabled={chain.isComingSoon}
                    title={chain.name}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {chain.logo ? (
                        <Image
                          src={chain.logo}
                          alt={chain.name}
                          width={18}
                          height={18}
                          className="flex-none rounded-sm"
                        />
                      ) : (
                        <div className="flex-none bg-border-secondary rounded-sm w-[18px] h-[18px]" />
                      )}
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm truncate">
                          {highlight(chain.name, searchTerm)}
                        </span>

                        {chain.isComingSoon && (
                          <span className="flex-none bg-yellow-500/15 px-1.5 py-[2px] rounded font-medium text-[10px] text-yellow-300">
                            Coming Soon
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isSelected && (
                        <Check className="w-4 h-4 text-green-primary" />
                      )}
                    </div>
                  </button>
                );
              })}

              {filteredChains.length === 0 && (
                <div className="px-4 py-4 text-tertiary text-sm text-center">
                  No chains found
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
