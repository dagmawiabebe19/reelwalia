"use client";

import { useState, useTransition } from "react";
import { updateDealTerms } from "@/app/admin/submissions/actions";
import { AdminPanelHeading } from "@/components/admin/admin-ui";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  DISTRIBUTION_TYPES,
  REVENUE_SHARE_PRESETS,
} from "@/lib/submissions/constants";
import {
  dealTermsFromSubmission,
  type DealTermsFields,
  type DealTermsInput,
  validateDealTermsInput,
} from "@/lib/submissions/deal-terms";

function DealCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-obsidian-red"
      />
      {label}
    </label>
  );
}

export function DealTermsPanel({
  submissionId,
  initialDealTerms,
}: {
  submissionId: string;
  initialDealTerms: DealTermsFields;
}) {
  const [form, setForm] = useState<DealTermsInput>(() =>
    dealTermsFromSubmission(initialDealTerms)
  );
  const [savedForm, setSavedForm] = useState<DealTermsInput>(() =>
    dealTermsFromSubmission(initialDealTerms)
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isDirty = JSON.stringify(form) !== JSON.stringify(savedForm);

  const update = <K extends keyof DealTermsInput>(key: K, value: DealTermsInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const saveDealTerms = () => {
    setError(null);
    const validated = validateDealTermsInput(form);
    if (!validated.ok) {
      setError(validated.error);
      return;
    }

    startTransition(async () => {
      try {
        await updateDealTerms(submissionId, validated.data);
        const nextForm = dealTermsFromSubmission(validated.data);
        setForm(nextForm);
        setSavedForm(nextForm);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Update failed");
      }
    });
  };

  return (
    <div className="rw-admin-panel">
      <AdminPanelHeading
        title="Deal Terms"
        subtitle="Admin only. Track licensing terms from negotiation through launch."
      />

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-wide text-zinc-500">
            Distribution Type
          </span>
          <select
            value={form.distributionType}
            onChange={(e) => update("distributionType", e.target.value)}
            className="rw-form-select py-2 text-sm"
          >
            <option value="">Select distribution type</option>
            {DISTRIBUTION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-wide text-zinc-500">
            Revenue Share
          </span>
          <select
            value={form.revenueSharePreset}
            onChange={(e) => {
              const value = e.target.value;
              update("revenueSharePreset", value);
              if (value !== "custom") {
                update("revenueShareCustom", "");
              }
            }}
            className="rw-form-select py-2 text-sm"
          >
            <option value="">Select revenue share</option>
            {REVENUE_SHARE_PRESETS.map((preset) => (
              <option key={preset} value={preset}>
                {preset}
              </option>
            ))}
            <option value="custom">Custom</option>
          </select>
        </label>

        {form.revenueSharePreset === "custom" && (
          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-xs uppercase tracking-wide text-zinc-500">
              Custom Revenue Share
            </span>
            <input
              type="text"
              value={form.revenueShareCustom}
              onChange={(e) => update("revenueShareCustom", e.target.value)}
              className="rw-form-input py-2 text-sm"
              placeholder="e.g. 70/30"
            />
          </label>
        )}

        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-wide text-zinc-500">
            License Fee (optional)
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={form.licenseFee}
            onChange={(e) => update("licenseFee", e.target.value)}
            className="rw-form-input py-2 text-sm"
            placeholder="5000"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-wide text-zinc-500">Launch Date</span>
          <input
            type="date"
            value={form.launchDate}
            onChange={(e) => update("launchDate", e.target.value)}
            className="rw-form-input py-2 text-sm"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 border-t border-white/[0.06] pt-4">
        <DealCheckbox
          label="Contract Sent"
          checked={form.contractSent}
          onChange={(checked) => update("contractSent", checked)}
        />
        <DealCheckbox
          label="Contract Signed"
          checked={form.contractSigned}
          onChange={(checked) => update("contractSigned", checked)}
        />
        <DealCheckbox
          label="Content Delivered"
          checked={form.contentDelivered}
          onChange={(checked) => update("contentDelivered", checked)}
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={saveDealTerms}
          disabled={pending || !isDirty}
          className="rw-btn-primary min-h-10 px-4 py-2 text-sm"
        >
          {pending ? (
            <LoadingSpinner className="h-4 w-4" label="Saving deal terms" />
          ) : (
            "Save Deal Terms"
          )}
        </button>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    </div>
  );
}
