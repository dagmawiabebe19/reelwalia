"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  compareSubmissionsByAcquisitionPriority,
  getAcquisitionStatusBadgeClass,
  getAcquisitionStatusLabel,
} from "@/lib/submissions/acquisition-status";
import {
  ACQUISITION_SUBMISSION_STATUSES,
  PROJECT_STAGES,
  PROJECT_TYPES,
  SUBMISSION_GENRES,
} from "@/lib/submissions/constants";
import {
  getProjectStageBadgeClass,
  getProjectStageLabel,
} from "@/lib/submissions/project-stage";
import { DealProgressIndicators } from "@/components/admin/DealProgressIndicators";

export type SubmissionListItem = {
  id: string;
  creator_name: string;
  project_title: string;
  project_type: string;
  project_stage: string;
  genre: string;
  custom_genre: string | null;
  logline: string;
  submission_status: string;
  contract_sent: boolean;
  contract_signed: boolean;
  content_delivered: boolean;
  launch_date: string | null;
  created_at: string;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function SubmissionsDashboard({
  submissions,
}: {
  submissions: SubmissionListItem[];
}) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [genreFilter, setGenreFilter] = useState("all");
  const [creatorFilter, setCreatorFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSubmissions = useMemo(() => {
    const creatorQuery = creatorFilter.trim().toLowerCase();
    const search = searchQuery.trim().toLowerCase();

    const filtered = submissions.filter((item) => {
      if (statusFilter !== "all" && item.submission_status !== statusFilter) {
        return false;
      }
      if (stageFilter !== "all" && item.project_stage !== stageFilter) {
        return false;
      }
      if (typeFilter !== "all" && item.project_type !== typeFilter) {
        return false;
      }
      if (genreFilter !== "all" && item.genre !== genreFilter) {
        return false;
      }
      if (creatorQuery && !item.creator_name.toLowerCase().includes(creatorQuery)) {
        return false;
      }
      if (
        search &&
        !item.project_title.toLowerCase().includes(search) &&
        !item.creator_name.toLowerCase().includes(search) &&
        !item.logline.toLowerCase().includes(search)
      ) {
        return false;
      }
      return true;
    });

    return [...filtered].sort(compareSubmissionsByAcquisitionPriority);
  }, [
    submissions,
    statusFilter,
    stageFilter,
    typeFilter,
    genreFilter,
    creatorFilter,
    searchQuery,
  ]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-wide text-zinc-500">Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rw-form-select py-2 text-sm"
          >
            <option value="all">All statuses</option>
            {ACQUISITION_SUBMISSION_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-wide text-zinc-500">Project Stage</span>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="rw-form-select py-2 text-sm"
          >
            <option value="all">All stages</option>
            {PROJECT_STAGES.map((stage) => (
              <option key={stage.value} value={stage.value}>
                {stage.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-wide text-zinc-500">Project Type</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rw-form-select py-2 text-sm"
          >
            <option value="all">All types</option>
            {PROJECT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-wide text-zinc-500">Genre</span>
          <select
            value={genreFilter}
            onChange={(e) => setGenreFilter(e.target.value)}
            className="rw-form-select py-2 text-sm"
          >
            <option value="all">All genres</option>
            {SUBMISSION_GENRES.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-wide text-zinc-500">Creator Name</span>
          <input
            type="text"
            value={creatorFilter}
            onChange={(e) => setCreatorFilter(e.target.value)}
            className="rw-form-input py-2 text-sm"
            placeholder="Filter by creator"
          />
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-wide text-zinc-500">Search</span>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="rw-form-input py-2 text-sm"
          placeholder="Search by title, creator, or logline"
        />
      </label>

      <p className="text-xs text-zinc-500">
        Showing {filteredSubmissions.length} of {submissions.length} submissions
      </p>

      {!filteredSubmissions.length ? (
        <p className="text-sm text-gray-400">No submissions match your filters.</p>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-lg border border-white/[0.08] md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/[0.08] bg-white/[0.02] text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Deal Progress</th>
                  <th className="px-4 py-3 font-medium">Project Type</th>
                  <th className="px-4 py-3 font-medium">Project Stage</th>
                  <th className="px-4 py-3 font-medium">Creator Name</th>
                  <th className="px-4 py-3 font-medium">Submission Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.08]">
                {filteredSubmissions.map((item) => (
                  <tr key={item.id} className="transition hover:bg-white/[0.03]">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/submissions/${item.id}`}
                        className="font-medium hover:text-obsidian-red"
                      >
                        {item.project_title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium uppercase ${getAcquisitionStatusBadgeClass(item.submission_status)}`}
                      >
                        {getAcquisitionStatusLabel(item.submission_status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <DealProgressIndicators
                        submissionStatus={item.submission_status}
                        deal={{
                          contract_sent: item.contract_sent,
                          contract_signed: item.contract_signed,
                          content_delivered: item.content_delivered,
                          launch_date: item.launch_date,
                        }}
                      />
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{item.project_type}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium uppercase ${getProjectStageBadgeClass(item.project_stage)}`}
                      >
                        {getProjectStageLabel(item.project_stage)}
                      </span>
                    </td>
                    <td className="px-4 py-3">{item.creator_name}</td>
                    <td className="px-4 py-3 text-zinc-400">
                      {formatDate(item.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-white/[0.08] rounded-lg border border-white/[0.08] md:hidden">
            {filteredSubmissions.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/admin/submissions/${item.id}`}
                  className="block space-y-2 px-4 py-4 transition hover:bg-white/[0.03]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{item.project_title}</p>
                    <span
                      className={`shrink-0 text-xs font-medium uppercase ${getAcquisitionStatusBadgeClass(item.submission_status)}`}
                    >
                      {getAcquisitionStatusLabel(item.submission_status)}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-400">{item.creator_name}</p>
                  <p className="text-xs text-zinc-500">
                    {item.project_type} · {formatDate(item.created_at)}
                  </p>
                  <DealProgressIndicators
                    submissionStatus={item.submission_status}
                    deal={{
                      contract_sent: item.contract_sent,
                      contract_signed: item.contract_signed,
                      content_delivered: item.content_delivered,
                      launch_date: item.launch_date,
                    }}
                  />
                  <span
                    className={`inline-block text-xs font-medium uppercase ${getProjectStageBadgeClass(item.project_stage)}`}
                  >
                    {getProjectStageLabel(item.project_stage)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
