"use client";

import * as React from "react";
import { MultiOption, MultiSelect } from "~/components/ui/multi-select";
import { getProviderIcon } from "~/modules/benchmark/hooks/provider";

type Props = {
  fromOptions: string[];
  toOptions: string[];
  amountOptions: number[];
  providerOptions: string[]; // for filtering options (names)
  providerOrder: string[]; // canonical order for columns
  visibleProviders: string[]; // currently visible columns
  onChangeVisibleProviders: (next: string[]) => void;

  value: {
    from: string[];
    to: string[];
    amounts: number[];
    providers: string[]; // filter by provider presence
  };
  onChange: (v: Props["value"]) => void;
  onReset: () => void;
};

export const FiltersBar: React.FC<Props> = ({
  fromOptions,
  toOptions,
  amountOptions,
  providerOptions,
  providerOrder,
  visibleProviders,
  onChangeVisibleProviders,
  value,
  onChange,
  onReset,
}) => {
  const Money = (n: number) =>
    n.toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    });
  const amountLabel = (n: number) =>
    n.toLocaleString(undefined, {
      notation: "compact",
      maximumFractionDigits: 1,
    });

  // MultiSelect options
  const fromOpts: MultiOption<string>[] = React.useMemo(
    () => fromOptions.map((t) => ({ value: t, label: t })),
    [fromOptions]
  );
  const toOpts: MultiOption<string>[] = React.useMemo(
    () => toOptions.map((t) => ({ value: t, label: t })),
    [toOptions]
  );
  const amtOpts: MultiOption<number>[] = React.useMemo(
    () =>
      amountOptions.map((n) => ({
        value: n,
        label: amountLabel(n),
        title: Money(n),
      })),
    [amountOptions]
  );

  const providerColumnOpts: MultiOption<string>[] = React.useMemo(
    () =>
      providerOrder.map((p) => ({
        value: p,
        label: p,
        iconSrc: getProviderIcon(p),
      })),
    [providerOrder]
  );

  // Keep column selection sorted by canonical providerOrder
  const sortByOrder = React.useCallback(
    (sel: string[]) => {
      const pos = new Map(providerOrder.map((p, i) => [p, i]));
      return [...new Set(sel)]
        .filter((p) => pos.has(p))
        .sort((a, b) => pos.get(a)! - pos.get(b)!);
    },
    [providerOrder]
  );

  const setColumns = (next: string[]) =>
    onChangeVisibleProviders(sortByOrder(next));
  const showAllCols = () => onChangeVisibleProviders([...providerOrder]);
  const hideAllCols = () => onChangeVisibleProviders([]);
  const resetColOrder = () =>
    onChangeVisibleProviders(sortByOrder(visibleProviders));

  return (
    <section
      aria-label="Filters"
      className="bg-background-secondary/60 mt-4 p-4 border border-border-secondary rounded-xl"
    >
      <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {/* From */}
        <MultiSelect
          id="filter-from"
          label="From Token"
          options={fromOpts}
          selected={value.from}
          onChange={(from) => onChange({ ...value, from })}
          placeholder="Any token"
          maxTags={2}
        />

        {/* To */}
        <MultiSelect
          id="filter-to"
          label="To Token"
          options={toOpts}
          selected={value.to}
          onChange={(to) => onChange({ ...value, to })}
          placeholder="Any token"
          maxTags={2}
        />

        {/* Amount */}
        <MultiSelect
          id="filter-amounts"
          label="USD Amount"
          options={amtOpts}
          selected={value.amounts}
          onChange={(amounts) => onChange({ ...value, amounts })}
          placeholder="Any amount"
          maxTags={2}
        />

        {/* Providers: Filter / Columns */}
        <MultiSelect
          id="columns-providers"
          label="Providers"
          options={providerColumnOpts}
          selected={visibleProviders}
          onChange={setColumns}
          placeholder="Pick providers to show"
          maxTags={4}
          className="!mt-0"
        />
      </div>

      {/* <div className="mt-3">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1 hover:bg-background-secondary px-3 py-2 border border-border-secondary rounded-md text-sm"
          aria-label="Reset filters"
        >
          Reset
        </button>
      </div> */}
    </section>
  );
};
