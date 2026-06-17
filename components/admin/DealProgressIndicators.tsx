import {
  isDealTrackingStatus,
  isReadyToLaunch,
  type DealTermsFields,
} from "@/lib/submissions/deal-terms";

function Indicator({
  active,
  label,
  activeClass,
}: {
  active: boolean;
  label: string;
  activeClass: string;
}) {
  return (
    <span
      className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
        active
          ? activeClass
          : "border-white/[0.06] text-zinc-600"
      }`}
      title={label}
    >
      {label}
    </span>
  );
}

export function DealProgressIndicators({
  submissionStatus,
  deal,
}: {
  submissionStatus: string;
  deal: Pick<
    DealTermsFields,
    "contract_sent" | "contract_signed" | "content_delivered" | "launch_date"
  >;
}) {
  if (!isDealTrackingStatus(submissionStatus)) {
    return <span className="text-xs text-zinc-600">—</span>;
  }

  const ready = isReadyToLaunch(deal);

  return (
    <div className="flex max-w-[14rem] flex-col gap-1">
      <Indicator
        active={deal.contract_sent}
        label="Contract Sent"
        activeClass="border-sky-400/40 text-sky-400"
      />
      <Indicator
        active={deal.contract_signed}
        label="Contract Signed"
        activeClass="border-purple-400/40 text-purple-400"
      />
      <Indicator
        active={ready}
        label="Ready To Launch"
        activeClass="border-emerald-400/40 text-emerald-400"
      />
    </div>
  );
}
