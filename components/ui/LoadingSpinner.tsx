interface LoadingSpinnerProps {
  className?: string;
  label?: string;
}

export function LoadingSpinner({
  className = "h-8 w-8",
  label = "Loading",
}: LoadingSpinnerProps) {
  return (
    <div
      className={`inline-block animate-spin rounded-full border-2 border-white/20 border-t-obsidian-red ${className}`}
      role="status"
      aria-label={label}
    />
  );
}
