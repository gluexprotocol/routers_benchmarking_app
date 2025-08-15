"use client";

import * as React from "react";
import clsx from "clsx";

type Val = string | number;

export type MultiOption<T extends Val = Val> = {
  value: T;
  label: string;
  title?: string;
  iconSrc?: string;
};

type Props<T extends Val = Val> = {
  id: string;
  label: string;
  options: MultiOption<T>[];
  selected: T[];
  onChange: (next: T[]) => void;
  placeholder?: string;
  maxTags?: number;
  showSearch?: boolean;
  className?: string;
};

const ROW_HEIGHT = 36; // px
const LIST_HEIGHT = 260; // px
const PADDING = 6; // rows extra render margin

export function MultiSelect<T extends Val = Val>({
  id,
  label,
  options,
  selected,
  onChange,
  placeholder = "Search…",
  maxTags = 3,
  showSearch = true,
  className,
}: Props<T>) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const btnRef = React.useRef<HTMLButtonElement | null>(null);
  const popRef = React.useRef<HTMLDivElement | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const searchRef = React.useRef<HTMLInputElement | null>(null);

  const q = query.trim().toLowerCase();
  const filtered = React.useMemo(
    () =>
      q
        ? options.filter(
            (o) =>
              o.label.toLowerCase().includes(q) ||
              String(o.value).toLowerCase().includes(q)
          )
        : options,
    [q, options]
  );

  // Virtualization calculations
  const [scrollTop, setScrollTop] = React.useState(0);
  const total = filtered.length;
  const visibleCount = Math.ceil(LIST_HEIGHT / ROW_HEIGHT);
  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - PADDING);
  const end = Math.min(total, start + visibleCount + PADDING * 2);
  const topPad = start * ROW_HEIGHT;
  const bottomPad = Math.max(0, (total - end) * ROW_HEIGHT);
  const windowed = filtered.slice(start, end);

  // Outside click close
  React.useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (popRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        btnRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Focus search on open
  React.useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 0);
    } else {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  const isSelected = React.useCallback(
    (v: T) => selected.some((s) => s === v),
    [selected]
  );

  const toggleOne = (v: T) => {
    if (isSelected(v)) onChange(selected.filter((x) => x !== v));
    else onChange([...selected, v]);
  };

  const clearAll = () => onChange([]);
  const selectAllVisible = () =>
    onChange(
      Array.from(new Set([...selected, ...filtered.map((o) => o.value)]))
    );

  // Keyboard nav inside list
  const onListKeyDown = (e: React.KeyboardEvent) => {
    if (!filtered.length) return;
    if (
      ["ArrowDown", "ArrowUp", "Home", "End", "PageDown", "PageUp"].includes(
        e.key
      )
    ) {
      e.preventDefault();
    }
    if (e.key === "ArrowDown") {
      setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Home") {
      setActiveIndex(0);
    } else if (e.key === "End") {
      setActiveIndex(filtered.length - 1);
    } else if (e.key === "PageDown") {
      setActiveIndex((i) => Math.min(filtered.length - 1, i + visibleCount));
    } else if (e.key === "PageUp") {
      setActiveIndex((i) => Math.max(0, i - visibleCount));
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[activeIndex];
      if (opt) toggleOne(opt.value);
    }
    // keep active in view
    const targetTop = activeIndex * ROW_HEIGHT;
    const cur = listRef.current;
    if (cur) {
      if (targetTop < cur.scrollTop) cur.scrollTop = targetTop;
      else if (targetTop + ROW_HEIGHT > cur.scrollTop + LIST_HEIGHT) {
        cur.scrollTop = targetTop - LIST_HEIGHT + ROW_HEIGHT;
      }
    }
  };

  // Render collapsed chips/summary
  const summary = React.useMemo(() => {
    if (!selected.length) return "Any";
    const labels = selected
      .map((v) => options.find((o) => o.value === v)?.label || String(v))
      .slice(0, maxTags);
    const more = selected.length - labels.length;
    return (
      <span className="flex flex-wrap items-center gap-1">
        {labels.map((l) => (
          <span
            key={l}
            className="px-1.5 py-0.5 border border-border-secondary rounded-full text-[11px]"
          >
            {l}
          </span>
        ))}
        {more > 0 && (
          <span className="px-1.5 py-0.5 border border-border-secondary rounded-full text-[11px]">
            +{more}
          </span>
        )}
      </span>
    );
  }, [selected, options, maxTags]);

  return (
    <div className={clsx("min-w-0", className)}>
      <label htmlFor={id} className="block mb-1 text-tertiary text-xs">
        {label}
      </label>

      <div className="relative" aria-label={`${label} multi select`}>
        <button
          ref={btnRef}
          id={id}
          type="button"
          className="flex justify-between items-center gap-2 bg-background-secondary px-2 py-2 border border-border-secondary rounded-md w-full text-sm text-left"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span
            className={clsx("truncate", !selected.length && "text-secondary")}
          >
            {selected.length ? summary : placeholder}
          </span>
          <span className="text-tertiary text-xs">
            {selected.length ? `${selected.length} selected` : ""}
          </span>
        </button>

        {open && (
          <div
            ref={popRef}
            className="right-0 left-0 z-30 absolute bg-background-secondary shadow-xl mt-2 border border-border-secondary rounded-lg"
            role="dialog"
            aria-modal="true"
          >
            {/* Search + actions */}
            <div className="flex items-center gap-2 p-2 border-b border-border-secondary">
              {showSearch && (
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActiveIndex(0);
                    listRef.current?.scrollTo({ top: 0 });
                  }}
                  placeholder={placeholder}
                  aria-label={`${label} search`}
                  className="bg-background-secondary px-2 py-1.5 border border-border-secondary rounded-md outline-none ring-0 w-full text-sm"
                />
              )}
              <button
                type="button"
                onClick={selectAllVisible}
                className="hover:bg-background-secondary px-2 py-2 border border-border-secondary rounded-md text-xs whitespace-nowrap"
                title="Select all (filtered)"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="hover:bg-background-secondary px-2 py-2 border border-border-secondary rounded-md text-xs"
                title="Clear all"
              >
                Clear
              </button>
            </div>

            {/* Listbox (virtualized) */}
            <div
              ref={listRef}
              role="listbox"
              aria-multiselectable="true"
              tabIndex={0}
              onKeyDown={onListKeyDown}
              onScroll={(e) =>
                setScrollTop((e.target as HTMLDivElement).scrollTop)
              }
              className="max-h-[260px] overflow-auto"
              style={{ height: LIST_HEIGHT }}
            >
              <div style={{ height: topPad }} />
              {windowed.length ? (
                windowed.map((o, i) => {
                  const idx = start + i;
                  const sel = isSelected(o.value);
                  const active = idx === activeIndex;
                  return (
                    <div
                      key={`${String(o.value)}-${idx}`}
                      role="option"
                      aria-selected={sel}
                      className={clsx(
                        "flex items-center gap-2 px-3 py-2 last:border-0 border-b border-border-secondary/60 cursor-pointer",
                        active
                          ? "bg-background-secondary"
                          : "hover:bg-background-secondary"
                      )}
                      onMouseMove={() => setActiveIndex(idx)}
                      onClick={() => toggleOne(o.value)}
                      title={o.title ?? o.label}
                      style={{ height: ROW_HEIGHT }}
                    >
                      <input
                        type="checkbox"
                        checked={sel}
                        onChange={() => toggleOne(o.value)}
                        aria-label={o.label}
                        className="accent-current"
                      />
                      {o.iconSrc ? (
                        <img
                          src={o.iconSrc}
                          alt=""
                          aria-hidden="true"
                          className="rounded w-4 h-4"
                        />
                      ) : null}
                      <span className="truncate">{o.label}</span>
                    </div>
                  );
                })
              ) : (
                <div className="px-3 py-4 text-secondary text-sm">
                  No options.
                </div>
              )}
              <div style={{ height: bottomPad }} />
            </div>

            <div className="flex justify-end p-2 border-t border-border-secondary">
              <button
                type="button"
                className="hover:bg-background-secondary px-3 py-1.5 border border-border-secondary rounded-md text-sm"
                onClick={() => {
                  setOpen(false);
                  btnRef.current?.focus();
                }}
                aria-label="Close"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SR-only status updates */}
      <span className="sr-only" role="status" aria-live="polite">
        {selected.length} {label} selected
      </span>
    </div>
  );
}
