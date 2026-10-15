"use client";

import { useState } from "react";
import { CommercialsManager } from "@/components/admin/commercials/CommercialsManager";
import { CommercialInquiriesTable } from "@/components/admin/commercials/CommercialInquiriesTable";
import type { Commercial, CommercialInquiry } from "@/lib/commercials/constants";

type Tab = "commercials" | "inquiries";

export function CommercialsAdmin({
  initialTab,
  commercials,
  inquiries,
}: {
  initialTab: Tab;
  commercials: Commercial[];
  inquiries: CommercialInquiry[];
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const newCount = inquiries.filter((i) => i.status === "new").length;

  const selectTab = (next: Tab) => {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "inquiries") url.searchParams.set("tab", "inquiries");
    else url.searchParams.delete("tab");
    window.history.replaceState(null, "", url);
  };

  const tabClass = (active: boolean) =>
    `inline-flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-semibold transition ${
      active ? "border-obsidian-red text-white" : "border-transparent text-zinc-500 hover:text-zinc-200"
    }`;

  return (
    <div className="space-y-6">
      <div className="flex gap-6 border-b border-white/[0.08]" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "commercials"} className={tabClass(tab === "commercials")} onClick={() => selectTab("commercials")}>
          Commercials
          <span className="text-xs font-normal text-zinc-500">{commercials.length}</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === "inquiries"} className={tabClass(tab === "inquiries")} onClick={() => selectTab("inquiries")}>
          Inquiries
          {newCount > 0 && (
            <span className="rounded-full bg-obsidian-red px-2 py-0.5 text-[10px] font-bold text-white" aria-label={`${newCount} new`}>
              {newCount}
            </span>
          )}
        </button>
      </div>

      {tab === "commercials" ? (
        <CommercialsManager commercials={commercials} />
      ) : (
        <CommercialInquiriesTable inquiries={inquiries} commercials={commercials} />
      )}
    </div>
  );
}
