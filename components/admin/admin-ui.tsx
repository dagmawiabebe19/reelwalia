import type { SeriesStatus } from "@/lib/types/database";

const STATUS_LABELS: Record<SeriesStatus, string> = {
  published: "Published",
  coming_soon: "Coming Soon",
  in_development: "In Development",
  draft: "Draft",
  completed: "Completed",
};

const STATUS_PILL: Record<SeriesStatus, string> = {
  published: "rw-admin-pill-green",
  coming_soon: "rw-admin-pill-amber",
  in_development: "rw-admin-pill-sky",
  draft: "rw-admin-pill-zinc",
  completed: "rw-admin-pill-purple",
};

export function SeriesStatusPill({ status }: { status: SeriesStatus | string }) {
  const key = status as SeriesStatus;
  const label = STATUS_LABELS[key] ?? status.replace(/_/g, " ");
  const pillClass = STATUS_PILL[key] ?? "rw-admin-pill-zinc";

  return <span className={pillClass}>{label}</span>;
}

export function AdminPageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rw-admin-page-header">
      <div>
        <h1 className="rw-admin-page-title">{title}</h1>
        {subtitle && <p className="rw-admin-page-subtitle">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
