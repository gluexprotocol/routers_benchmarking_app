import clsx from "clsx";

export const TitleSkeleton: React.FC = () => {
  return (
    <section className="w-full" aria-labelledby="dashboard-title">
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
          <div className="bg-white/10 rounded-md w-full h-10 animate-pulse" />
        </div>
      </div>
    </section>
  );
};

export const StatsSkeleton: React.FC = () => {
  return (
    <div className="gap-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-8">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-background-secondary p-6 border border-border-secondary rounded-xl"
        >
          {/* title */}
          <div className="bg-white/10 rounded w-28 h-4 animate-pulse" />
          {/* value */}
          <div className="bg-white/10 mt-12 rounded w-24 h-8 animate-pulse" />
          {/* subtitle */}
          <div className="bg-white/10 mt-2 rounded w-20 h-4 animate-pulse" />
        </div>
      ))}
    </div>
  );
};

export const ProvidersSkeleton: React.FC = () => {
  return (
    <div className="mb-12">
      <div className="bg-gradient-to-br from-gradient-verde-from to-gradient-verde-to p-2.5 rounded-xl">
        <div
          className={clsx(
            "gap-2.5 grid grid-cols-6",
            "[&>.provider-card]:col-span-6",
            "sm:[&>.provider-card]:col-span-3",
            "lg:[&>.provider-card]:col-span-2",
            "sm:[&>.provider-card:last-child:nth-child(2n+1)]:col-span-6",
            "lg:[&>.provider-card:nth-last-child(2):nth-child(3n+1)]:col-span-3",
            "lg:[&>.provider-card:last-child:nth-child(3n+2)]:col-span-3",
            "lg:[&>.provider-card:last-child:nth-child(3n+1)]:col-span-6"
          )}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={`sk-${i}`}
              className="bg-background-secondary opacity-80 rounded-xl h-full provider-card"
            >
              <div className="flex flex-col p-6 gradient-border-content h-full">
                {/* Header */}
                <div className="flex justify-between items-start mb-5">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/10 rounded-xl w-12 h-12 animate-pulse" />
                    <div className="space-y-1">
                      <div className="bg-white/10 rounded w-28 h-4 animate-pulse" />
                      <div className="bg-white/10 rounded w-24 h-3 animate-pulse" />
                    </div>
                  </div>
                  <div className="bg-white/10 rounded-full w-16 h-5 animate-pulse" />
                </div>

                {/* Stats grid */}
                <div className="flex-grow gap-2 grid grid-cols-2">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="space-y-1.5">
                      <div className="bg-white/10 rounded w-20 h-3 animate-pulse" />
                      <div className="bg-white/10 rounded w-16 h-5 animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const TableSkeleton = () => {
  const providers = Array.from({ length: 2 }).map((_, i) => ({
    id: `provider-${i + 1}`,
    name: `Provider ${i + 1}`,
  }));

  return (
    <div className="overflow-hidden">
      <div className="mb-6">
        <h2 className="mb-1 font-bold text-primary text-2xl">
          Detailed Results
        </h2>
        <p className="text-secondary">
          Complete trading data with provider performance, response times,
          outputs and winner analysis
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="bg-background-secondary rounded-xl w-full">
          <thead>
            <tr className="font-aeonik text-tertiary text-sm whitespace-nowrap">
              <th className="px-5 py-2.5">From Token</th>
              <th className="px-5 py-2.5">To Token</th>
              <th className="px-5 py-2.5">Amount (USD)</th>

              {providers.map((p) => (
                <th key={`${p.id}-time`} className="px-5 py-2.5">
                  {p.name} Time
                </th>
              ))}

              {providers.map((p) => (
                <th key={`${p.id}-output`} className="px-5 py-2.5">
                  {p.name} Output
                </th>
              ))}

              <th className="px-5 py-2.5">Output Diff</th>
              <th className="px-5 py-2.5">Winner</th>
            </tr>
          </thead>

          <tbody className="text-tertiary text-sm">
            {Array.from({ length: 10 }).map((_, i) => (
              <tr key={i} className="opacity-90">
                {/* From Token */}
                <td className="px-5 py-2.5 text-center">
                  <div className="bg-white/10 mx-auto rounded w-20 h-4 animate-pulse" />
                </td>
                {/* To Token */}
                <td className="px-5 py-2.5 text-center">
                  <div className="bg-white/10 mx-auto rounded w-20 h-4 animate-pulse" />
                </td>
                {/* Amount */}
                <td className="px-5 py-2.5 text-center">
                  <div className="bg-white/10 mx-auto rounded w-24 h-4 animate-pulse" />
                </td>

                {/* Provider Times */}
                {providers.map((p) => (
                  <td
                    key={`${i}-${p.id}-time`}
                    className="px-5 py-2.5 text-center"
                  >
                    <div className="bg-white/10 mx-auto rounded w-16 h-4 animate-pulse" />
                  </td>
                ))}

                {/* Provider Outputs */}
                {providers.map((p) => (
                  <td
                    key={`${i}-${p.id}-out`}
                    className="px-5 py-2.5 text-center"
                  >
                    <div className="bg-white/10 mx-auto rounded w-16 h-4 animate-pulse" />
                  </td>
                ))}

                {/* Output Diff */}
                <td className="px-5 py-2.5 text-center">
                  <div className="bg-white/10 mx-auto rounded w-16 h-4 animate-pulse" />
                </td>

                {/* Winner */}
                <td className="px-6 py-2.5">
                  <div className="bg-white/10 mx-auto rounded-xl w-16 h-5 animate-pulse" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
