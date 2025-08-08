export const ErrorState = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) => (
  <div className="bg-background-secondary p-6 border border-border-secondary rounded-xl">
    <div className="text-[color:var(--color-tertiary)] text-sm">{message}</div>
    <button
      onClick={onRetry}
      className="inline-flex items-center bg-[color:var(--color-green-tertiary)]/20 hover:bg-[color:var(--color-green-tertiary)]/30 mt-3 px-3 py-2 rounded-md text-[color:var(--color-primary)] text-sm transition-colors"
    >
      Retry
    </button>
  </div>
);
