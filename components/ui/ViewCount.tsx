import { SHOW_VIEW_COUNTS } from "@/lib/feature-flags";
import { formatViewCount } from "@/lib/format";

interface ViewCountProps {
  count: number | null | undefined;
  className?: string;
  /** Inline span for lines like "Episode 1 · N views" */
  inline?: boolean;
  prefix?: string;
}

export function ViewCount({
  count,
  className = "text-sm text-gray-500",
  inline = false,
  prefix = "",
}: ViewCountProps) {
  if (!SHOW_VIEW_COUNTS) return null;

  const formatted = formatViewCount(count);
  if (formatted == null) return null;

  const text = `${prefix}${formatted} views`;

  if (inline) {
    return <span className={className}>{text}</span>;
  }

  return <p className={className}>{text}</p>;
}
