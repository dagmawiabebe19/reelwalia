"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { CheckIcon, CloseIcon } from "@/components/commercials/CommercialIcons";
import {
  BUDGET_RANGES,
  COMMERCIAL_CONTACT_EMAIL,
  COMMERCIAL_FORM_ANCHOR,
  COMMERCIAL_REFERENCE_EVENT,
  INQUIRY_HONEYPOT_FIELD,
  PLATFORMS,
  TIMELINES,
  type Platform,
} from "@/lib/commercials/constants";
import {
  INQUIRY_LIMITS,
  validateCommercialInquiry,
  type InquiryFieldErrors,
} from "@/lib/commercials/validation";

type ReferenceOption = { id: string; title: string };

interface FormState {
  name: string;
  email: string;
  company: string;
  phone: string;
  budget_range: string;
  timeline: string;
  platforms: Platform[];
  message: string;
  reference_commercial_id: string;
}

const EMPTY: FormState = {
  name: "",
  email: "",
  company: "",
  phone: "",
  budget_range: "",
  timeline: "",
  platforms: [],
  message: "",
  reference_commercial_id: "",
};

const inputClass =
  "commercial-input mt-2 h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-base text-white placeholder:text-zinc-600 transition focus:border-commercial-red focus:bg-white/[0.06] focus:outline-none sm:h-auto sm:py-3 sm:text-sm";

function Field({
  label,
  htmlFor,
  error,
  optional,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-300">
        {label}
        {optional && <span className="ml-1.5 font-normal normal-case tracking-normal text-zinc-600">optional</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1.5 text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function readUtm(): { utm_source: string | null; utm_medium: string | null; utm_campaign: string | null } {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
  };
}

export function CommercialInquiryForm({ references }: { references: ReferenceOption[] }) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [honeypot, setHoneypot] = useState("");
  const [errors, setErrors] = useState<InquiryFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const onReference = (e: Event) => {
      const id = (e as CustomEvent<{ id?: string }>).detail?.id;
      if (id && references.some((r) => r.id === id)) {
        setForm((f) => ({ ...f, reference_commercial_id: id }));
        setDone(false);
      }
    };
    window.addEventListener(COMMERCIAL_REFERENCE_EVENT, onReference);
    return () => window.removeEventListener(COMMERCIAL_REFERENCE_EVENT, onReference);
  }, [references]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const togglePlatform = (p: Platform) =>
    set("platforms", form.platforms.includes(p) ? form.platforms.filter((x) => x !== p) : [...form.platforms, p]);

  const reference = references.find((r) => r.id === form.reference_commercial_id) ?? null;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitError(null);

    const payload = { ...form, ...readUtm(), [INQUIRY_HONEYPOT_FIELD]: honeypot };
    const result = validateCommercialInquiry(payload);
    if (!result.ok) {
      setErrors(result.errors);
      const first = Object.keys(result.errors)[0];
      if (first) document.getElementById(`inquiry-${first}`)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/commercial-inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        fieldErrors?: InquiryFieldErrors;
      };
      if (!res.ok) {
        if (data.fieldErrors) setErrors(data.fieldErrors);
        setSubmitError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setDone(true);
      setForm(EMPTY);
    } catch {
      setSubmitError(`Network error. Please try again or email ${COMMERCIAL_CONTACT_EMAIL}.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id={COMMERCIAL_FORM_ANCHOR} className="commercial-inquiry scroll-mt-6 border-t border-white/[0.06] py-8 sm:py-24">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:gap-12 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-commercial-red sm:text-xs sm:tracking-[0.28em]">
            Get a Quote
          </p>
          <h2 className="mt-3 font-display text-[1.9rem] uppercase leading-none tracking-wide text-white sm:text-5xl">
            Hire us to make your advertisement
          </h2>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-zinc-400 sm:text-base">
            Tell us about your brand and what you want people to feel. We&apos;ll come back with ideas,
            a timeline, and a quote within 24 hours.
          </p>
        </div>

        {done ? (
          <div
            className="commercial-thanks flex flex-col items-center justify-center rounded-3xl border border-commercial-red/30 bg-gradient-to-b from-commercial-red/10 to-transparent px-6 py-16 text-center"
            role="status"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-commercial-red text-white">
              <CheckIcon className="h-7 w-7" />
            </span>
            <p className="mt-6 font-display text-3xl uppercase tracking-wide text-white">Thank you!</p>
            <p className="mt-2 text-sm text-zinc-300">We&apos;ll get back to you within 24 hours.</p>
            <button
              type="button"
              onClick={() => setDone(false)}
              className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400 hover:text-white"
            >
              Send another inquiry
            </button>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            noValidate
            className="commercial-form relative space-y-5 rounded-3xl border border-white/[0.07] bg-white/[0.02] p-5 sm:p-8"
          >
            <div aria-hidden className="absolute -left-[10000px] h-px w-px overflow-hidden">
              <label htmlFor={`inquiry-${INQUIRY_HONEYPOT_FIELD}`}>Leave this field empty</label>
              <input
                id={`inquiry-${INQUIRY_HONEYPOT_FIELD}`}
                name={INQUIRY_HONEYPOT_FIELD}
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            {reference && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-commercial-red/40 bg-commercial-red/10 px-4 py-3">
                <p className="min-w-0 text-sm text-zinc-200">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-commercial-red">Like this: </span>
                  <span className="font-semibold">{reference.title}</span>
                </p>
                <button
                  type="button"
                  onClick={() => set("reference_commercial_id", "")}
                  className="shrink-0 rounded-full p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
                  aria-label="Remove reference"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Name" htmlFor="inquiry-name" error={errors.name}>
                <input
                  id="inquiry-name"
                  className={inputClass}
                  value={form.name}
                  maxLength={INQUIRY_LIMITS.name}
                  autoComplete="name"
                  onChange={(e) => set("name", e.target.value)}
                />
              </Field>
              <Field label="Email" htmlFor="inquiry-email" error={errors.email}>
                <input
                  id="inquiry-email"
                  type="email"
                  inputMode="email"
                  className={inputClass}
                  value={form.email}
                  maxLength={INQUIRY_LIMITS.email}
                  autoComplete="email"
                  onChange={(e) => set("email", e.target.value)}
                />
              </Field>
              <Field label="Company" htmlFor="inquiry-company" optional error={errors.company}>
                <input
                  id="inquiry-company"
                  className={inputClass}
                  value={form.company}
                  maxLength={INQUIRY_LIMITS.company}
                  autoComplete="organization"
                  onChange={(e) => set("company", e.target.value)}
                />
              </Field>
              <Field label="Phone" htmlFor="inquiry-phone" optional error={errors.phone}>
                <input
                  id="inquiry-phone"
                  type="tel"
                  inputMode="tel"
                  className={inputClass}
                  value={form.phone}
                  maxLength={INQUIRY_LIMITS.phone}
                  autoComplete="tel"
                  onChange={(e) => set("phone", e.target.value)}
                />
              </Field>
              <Field label="Budget" htmlFor="inquiry-budget_range" optional error={errors.budget_range}>
                <select
                  id="inquiry-budget_range"
                  className={`${inputClass} appearance-none`}
                  value={form.budget_range}
                  onChange={(e) => set("budget_range", e.target.value)}
                >
                  <option value="">Select a range</option>
                  {BUDGET_RANGES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Timeline" htmlFor="inquiry-timeline" optional error={errors.timeline}>
                <select
                  id="inquiry-timeline"
                  className={`${inputClass} appearance-none`}
                  value={form.timeline}
                  onChange={(e) => set("timeline", e.target.value)}
                >
                  <option value="">Select a timeline</option>
                  {TIMELINES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Where will it run?" optional error={errors.platforms}>
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Platforms">
                {PLATFORMS.map((p) => {
                  const active = form.platforms.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      aria-pressed={active}
                      onClick={() => togglePlatform(p)}
                      className={`commercial-chip rounded-full border px-4 py-2 text-xs font-semibold transition ${
                        active
                          ? "border-commercial-red bg-commercial-red/15 text-white"
                          : "border-white/15 text-zinc-400 hover:border-white/35 hover:text-white"
                      }`}
                    >
                      {active && <CheckIcon className="-ml-1 mr-1 inline h-3.5 w-3.5" />}
                      {p}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="What do you need?" htmlFor="inquiry-message" error={errors.message}>
              <textarea
                id="inquiry-message"
                rows={5}
                className={`${inputClass} h-auto min-h-[8rem] resize-y py-3`}
                value={form.message}
                maxLength={INQUIRY_LIMITS.message}
                placeholder="Your product, audience, the feeling you want to leave people with…"
                onChange={(e) => set("message", e.target.value)}
              />
            </Field>

            {submitError && (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">
                {submitError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex h-12 w-full items-center justify-center rounded-full bg-gradient-to-r from-commercial-red to-commercial-deep px-8 text-sm font-bold uppercase tracking-[0.08em] text-white shadow-none transition hover:from-commercial-deep hover:to-commercial-deep disabled:cursor-wait disabled:opacity-60 sm:h-auto sm:py-4 sm:tracking-[0.16em] sm:shadow-[0_10px_40px_rgba(229,57,53,0.3)]"
            >
              {submitting ? "Sending…" : "Send Inquiry"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
