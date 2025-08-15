"use client";

import React from "react";
import { MultiOption, MultiSelect } from "~/components/ui/multi-select";

type RunMeta = { id: number; start_time: string | null };

type Props = {
  runs: RunMeta[];
  selected: number[];
  onChange: (next: number[]) => void;
};

type SortMode = "newest" | "oldest" | "id-asc" | "id-desc";

export const RunsPicker: React.FC<Props> = ({ runs, selected, onChange }) => {
  const [sort, setSort] = React.useState<SortMode>("newest");

  const fmt = (s: string | null) => (s ? new Date(s).toLocaleString() : "—");

  // we carry parsed timestamp to sort efficiently then map to MultiSelect options
  const runsSorted = React.useMemo(() => {
    const withTs = runs.map((r) => ({
      ...r,
      ts: r.start_time ? Date.parse(r.start_time) : 0,
    }));
    const arr = withTs.slice();

    if (sort === "newest") arr.sort((a, b) => b.ts - a.ts || b.id - a.id);
    if (sort === "oldest") arr.sort((a, b) => a.ts - b.ts || a.id - b.id);
    if (sort === "id-asc") arr.sort((a, b) => a.id - b.id);
    if (sort === "id-desc") arr.sort((a, b) => b.id - a.id);

    return arr;
  }, [runs, sort]);

  const options: MultiOption<number>[] = React.useMemo(
    () =>
      runsSorted.map((r) => ({
        value: r.id,
        // label contains both id and time so MultiSelect search matches either
        label: `#${r.id} • ${fmt(r.start_time)}`,
        title: r.start_time ? fmt(r.start_time) : undefined,
      })),
    [runsSorted]
  );

  const sortAsc = React.useCallback(
    (ids: number[]) => [...new Set(ids)].sort((a, b) => a - b),
    []
  );

  const setSelected = (next: number[]) => onChange(sortAsc(next));

  const selectLatest = (n: number) => {
    const ids = runsSorted.slice(0, n).map((r) => r.id);
    setSelected([...selected, ...ids]);
  };

  const clearAll = () => onChange([]);

  const nothing = runs.length === 0;

  return (
    <section
      aria-label="Runs selector"
      className="bg-background-secondary/60 p-4 border border-border-secondary rounded-xl"
    >
      <div className="flex justify-between items-center mb-2">
        <div className="text-tertiary text-xs">Select runs to compare</div>

        {/* Sort toggle */}
        <div className="flex items-center gap-2 text-xs" aria-label="Sort runs">
          <label className="text-tertiary">Sort:</label>
          <select
            className="bg-background-secondary py-1 pr-7 pl-2 border border-border-secondary rounded-md outline-none text-xs appearance-none"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            aria-label="Sort runs by"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="id-asc">ID (Asc)</option>
            <option value="id-desc">ID (Desc)</option>
          </select>
        </div>
      </div>

      {/* MultiSelect with virtualization + search */}
      <MultiSelect
        id="runs-picker"
        label="Runs"
        options={options}
        selected={selected}
        onChange={setSelected}
        placeholder={
          nothing ? "No runs available" : "Search by #ID or date/time…"
        }
        maxTags={3}
      />

      {/* Quick actions + selected badges */}
      <div className="flex flex-col gap-2 mt-3">
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Run quick actions"
        >
          <button
            type="button"
            onClick={() => selectLatest(2)}
            className="hover:bg-background-secondary px-2 py-1.5 border border-border-secondary rounded-md text-xs cursor-pointer"
            disabled={nothing}
            aria-disabled={nothing}
            title="Add the 2 most recent runs"
          >
            Latest 2
          </button>
          <button
            type="button"
            onClick={() => selectLatest(2)}
            className="hover:bg-background-secondary px-2 py-1.5 border border-border-secondary rounded-md text-xs cursor-pointer"
            disabled={nothing}
            aria-disabled={nothing}
            title="Add the 2 most recent runs"
          >
            Latest 3
          </button>
          <button
            type="button"
            onClick={() => selectLatest(5)}
            className="hover:bg-background-secondary px-2 py-1.5 border border-border-secondary rounded-md text-xs cursor-pointer"
            disabled={nothing}
            aria-disabled={nothing}
            title="Add the 5 most recent runs"
          >
            Latest 5
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="hover:bg-background-secondary px-2 py-1.5 border border-border-secondary rounded-md text-xs cursor-pointer"
            disabled={selected.length === 0}
            aria-disabled={selected.length === 0}
            title="Clear all selected runs"
          >
            Clear all
          </button>

          <span className="ml-auto text-tertiary text-xs" aria-live="polite">
            {selected.length}/{runs.length} selected
          </span>
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2" aria-live="polite">
            {selected.map((id) => (
              <span
                key={id}
                className="px-2 py-1 border border-border-secondary rounded-full text-xs"
              >
                #{id}
                <button
                  type="button"
                  className="opacity-70 hover:opacity-100 ml-1"
                  onClick={() => onChange(selected.filter((x) => x !== id))}
                  aria-label={`Remove run ${id}`}
                  title="Remove"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
