import { ADMIN_DATE_PRESETS, type DatePreset } from "@/lib/admin/analytics-range";

type AdminDateRangeFormProps = {
  preset: DatePreset;
  from: string;
  to: string;
  action?: string;
  method?: "get" | "post";
  submitLabel?: string;
  children?: React.ReactNode;
  hiddenFields?: Record<string, string>;
};

export function AdminDateRangeForm({
  preset,
  from,
  to,
  action,
  method = "get",
  submitLabel = "Apply",
  children,
  hiddenFields,
}: AdminDateRangeFormProps) {
  return (
    <form method={method} action={action} className="rw-admin-panel space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {children}
        <label className="block space-y-1.5">
          <span className="rw-form-label">Date range</span>
          <select
            name="preset"
            defaultValue={preset}
            className="w-full rounded-lg border border-white/[0.12] bg-black px-3 py-2 text-sm text-white"
          >
            {ADMIN_DATE_PRESETS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="rw-form-label">From (custom)</span>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="w-full rounded-lg border border-white/[0.12] bg-black px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="rw-form-label">To (custom)</span>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="w-full rounded-lg border border-white/[0.12] bg-black px-3 py-2 text-sm text-white"
          />
        </label>
      </div>
      {hiddenFields &&
        Object.entries(hiddenFields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
      <button type="submit" className="rw-btn-primary">
        {submitLabel}
      </button>
    </form>
  );
}

export function AdminDateRangeHiddenFields({
  preset,
  from,
  to,
}: {
  preset: DatePreset;
  from: string;
  to: string;
}) {
  return (
    <>
      <input type="hidden" name="preset" value={preset} />
      <input type="hidden" name="from" value={from} />
      <input type="hidden" name="to" value={to} />
    </>
  );
}
