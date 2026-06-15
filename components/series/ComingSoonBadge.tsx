interface ComingSoonBadgeProps {
  className?: string;
  size?: "sm" | "md";
}

export function ComingSoonBadge({
  className = "",
  size = "sm",
}: ComingSoonBadgeProps) {
  const sizeClass =
    size === "md"
      ? "px-3 py-1.5 text-sm"
      : "px-2 py-1 text-xs";

  return (
    <span
      className={`font-display uppercase tracking-wide text-white ${sizeClass} rounded-md bg-obsidian-red ${className}`}
    >
      Coming Soon
    </span>
  );
}
