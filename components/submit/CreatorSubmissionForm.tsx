"use client";

import { useMemo, useState, useTransition } from "react";
import { submitCreatorProject } from "@/app/submit/actions";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  PRODUCTION_STATUSES,
  PROJECT_STAGES,
  PROJECT_TYPES,
  SUBMISSION_GENRES,
} from "@/lib/submissions/constants";
import { UN_COUNTRIES } from "@/lib/submissions/countries";
import { isFilmProject, isSeriesProject, LOGLINE_MAX_LENGTH } from "@/lib/submissions/project-type";
import { CUSTOM_GENRE_MAX_LENGTH } from "@/lib/submissions/genre";
import {
  wordCount,
  type CreatorSubmissionInput,
} from "@/lib/submissions/validation";

const initialState: CreatorSubmissionInput = {
  creatorName: "",
  email: "",
  phone: "",
  company: "",
  country: "",
  instagram: "",
  website: "",
  imdb: "",
  projectTitle: "",
  projectType: "",
  genre: "",
  customGenre: "",
  logline: "",
  description: "",
  episodeCount: "",
  averageEpisodeLength: "",
  runtimeMinutes: "",
  productionStatus: "",
  projectStage: "",
  targetAudience: "",
  trailerAvailable: "",
  trailerLink: "",
  screenerLink: "",
  youtubeLink: "",
  vimeoLink: "",
  googleDriveLink: "",
  dropboxLink: "",
  projectWebsiteLink: "",
  posterLink: "",
  heroBannerLink: "",
  ownsDistributionRights: "",
  releasedElsewhere: "",
  releasedElsewhereWhere: "",
  rightsConfirmed: "",
  additionalNotes: "",
};

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="rw-form-label">
        {label}
        {required && <span className="text-obsidian-red"> *</span>}
      </span>
      {hint && <span className="rw-form-hint block">{hint}</span>}
      {children}
    </label>
  );
}

function RadioGroup({
  name,
  value,
  onChange,
  options,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-4">
      {options.map((option) => (
        <label
          key={option.value}
          className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-300"
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="h-4 w-4 accent-obsidian-red"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rw-form-section">
      <h2 className="rw-form-section-title">{title}</h2>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

export function CreatorSubmissionForm() {
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();

  const descriptionWords = useMemo(() => wordCount(form.description), [form.description]);
  const showSeriesFields = isSeriesProject(form.projectType);
  const showFilmFields = isFilmProject(form.projectType);
  const showCustomGenre = form.genre === "Other";

  const update = (key: keyof CreatorSubmissionInput, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateProjectType = (value: string) => {
    setForm((prev) => {
      const next = { ...prev, projectType: value };
      if (isSeriesProject(value)) {
        next.runtimeMinutes = "";
      } else if (isFilmProject(value)) {
        next.episodeCount = "";
        next.averageEpisodeLength = "";
      } else {
        next.episodeCount = "";
        next.averageEpisodeLength = "";
        next.runtimeMinutes = "";
      }
      return next;
    });
  };

  const updateGenre = (value: string) => {
    setForm((prev) => ({
      ...prev,
      genre: value,
      customGenre: value === "Other" ? prev.customGenre : "",
    }));
  };

  const updateTrailerAvailable = (value: string) => {
    setForm((prev) => ({
      ...prev,
      trailerAvailable: value,
      trailerLink: value === "yes" ? prev.trailerLink : "",
    }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await submitCreatorProject(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  if (submitted) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-8 text-center sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-obsidian-red/40 bg-obsidian-red/10">
          <svg
            className="h-7 w-7 text-obsidian-red"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="M5 13l4 4L19 7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="mt-6 font-display text-2xl uppercase tracking-wide">
          Thank You
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-400">
          Your submission has been received. If ReelWalia is interested in your
          project, our team will contact you directly to discuss next steps.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Section title="Creator Information">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full Name" required>
            <input
              type="text"
              autoComplete="name"
              value={form.creatorName}
              onChange={(e) => update("creatorName", e.target.value)}
              className="rw-form-input"
              required
            />
          </Field>
          <Field label="Email Address" required>
            <input
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="rw-form-input"
              required
            />
          </Field>
          <Field label="Phone Number">
            <input
              type="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className="rw-form-input"
            />
          </Field>
          <Field label="Company / Studio">
            <input
              type="text"
              value={form.company}
              onChange={(e) => update("company", e.target.value)}
              className="rw-form-input"
            />
          </Field>
          <Field label="Country">
            <input
              type="text"
              list="submit-country-options"
              autoComplete="country-name"
              value={form.country}
              onChange={(e) => update("country", e.target.value)}
              className="rw-form-input"
              placeholder="Type to search countries"
            />
            <datalist id="submit-country-options">
              {UN_COUNTRIES.map((country) => (
                <option key={country} value={country} />
              ))}
            </datalist>
          </Field>
          <Field label="Instagram">
            <input
              type="text"
              placeholder="@handle or profile URL"
              value={form.instagram}
              onChange={(e) => update("instagram", e.target.value)}
              className="rw-form-input"
            />
          </Field>
          <Field label="Website">
            <input
              type="url"
              placeholder="https://"
              value={form.website}
              onChange={(e) => update("website", e.target.value)}
              className="rw-form-input"
            />
          </Field>
          <Field label="IMDb">
            <input
              type="url"
              placeholder="https://"
              value={form.imdb}
              onChange={(e) => update("imdb", e.target.value)}
              className="rw-form-input"
            />
          </Field>
        </div>
      </Section>

      <Section title="Project Information">
        <Field label="Project Title" required>
          <input
            type="text"
            value={form.projectTitle}
            onChange={(e) => update("projectTitle", e.target.value)}
            className="rw-form-input"
            required
          />
        </Field>

        <Field
          label="Logline"
          required
          hint="One sentence that captures the core conflict of your story."
        >
          <input
            type="text"
            value={form.logline}
            onChange={(e) => update("logline", e.target.value.slice(0, LOGLINE_MAX_LENGTH))}
            className="rw-form-input"
            placeholder="A disgraced rodeo rider must choose between family loyalty and his dream of becoming a champion."
            maxLength={LOGLINE_MAX_LENGTH}
            required
          />
          <p
            className={`text-xs ${
              form.logline.length > LOGLINE_MAX_LENGTH ? "text-zinc-500" : "text-zinc-400"
            }`}
          >
            {form.logline.length} / {LOGLINE_MAX_LENGTH} characters
          </p>
        </Field>

        <Field label="Project Type" required>
          <select
            value={form.projectType}
            onChange={(e) => updateProjectType(e.target.value)}
            className="rw-form-select"
            required
          >
            <option value="">Select a project type</option>
            {PROJECT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Genre" required>
          <select
            value={form.genre}
            onChange={(e) => updateGenre(e.target.value)}
            className="rw-form-select"
            required
          >
            <option value="">Select a genre</option>
            {SUBMISSION_GENRES.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
        </Field>

        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
            showCustomGenre ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            {showCustomGenre && (
              <Field
                label="Custom Genre"
                required
                hint="Tell us how you would categorize your project."
              >
                <input
                  type="text"
                  value={form.customGenre}
                  onChange={(e) =>
                    update("customGenre", e.target.value.slice(0, CUSTOM_GENRE_MAX_LENGTH))
                  }
                  className="rw-form-input animate-subscribe-slide-up"
                  placeholder="Historical Drama, Sports Drama, Political Thriller, Faith-Based, True Crime, Musical"
                  maxLength={CUSTOM_GENRE_MAX_LENGTH}
                  required
                />
              </Field>
            )}
          </div>
        </div>

        <Field
          label="Description"
          required
          hint="Tell us about the story, characters, audience, themes, and what makes this project unique."
        >
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            className="rw-form-textarea"
            rows={6}
            required
          />
          <p
            className={`text-xs ${
              descriptionWords < 50 || descriptionWords > 300
                ? "text-zinc-500"
                : "text-zinc-400"
            }`}
          >
            {descriptionWords} / 300 words (50 minimum)
          </p>
        </Field>

        <Field
          label="Target Audience"
          hint="Who do you believe this project is for?"
        >
          <input
            type="text"
            value={form.targetAudience}
            onChange={(e) => update("targetAudience", e.target.value)}
            className="rw-form-input"
            placeholder="Fans of Yellowstone, ReelShort, romance dramas, documentaries, westerns, etc."
          />
        </Field>

        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
            showSeriesFields ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            {showSeriesFields && (
              <div className="grid gap-4 sm:grid-cols-2 animate-subscribe-slide-up">
                <Field label="Number of Episodes" required>
                  <input
                    type="number"
                    min={1}
                    value={form.episodeCount}
                    onChange={(e) => update("episodeCount", e.target.value)}
                    className="rw-form-input"
                    required
                  />
                </Field>
                <Field label="Average Episode Length" required hint="e.g. 2–3 minutes">
                  <input
                    type="text"
                    value={form.averageEpisodeLength}
                    onChange={(e) => update("averageEpisodeLength", e.target.value)}
                    className="rw-form-input"
                    required
                  />
                </Field>
              </div>
            )}
          </div>
        </div>

        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
            showFilmFields ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            {showFilmFields && (
              <Field label="Runtime (minutes)" required>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={form.runtimeMinutes}
                  onChange={(e) => update("runtimeMinutes", e.target.value)}
                  className="rw-form-input animate-subscribe-slide-up"
                  placeholder="90"
                  required
                />
              </Field>
            )}
          </div>
        </div>

        <Field
          label="Project Stage"
          required
          hint="Tell us where your project currently stands."
        >
          <select
            value={form.projectStage}
            onChange={(e) => update("projectStage", e.target.value)}
            className="rw-form-select"
            required
          >
            <option value="">Select project stage</option>
            {PROJECT_STAGES.map((stage) => (
              <option key={stage.value} value={stage.value}>
                {stage.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Production Status" required>
          <select
            value={form.productionStatus}
            onChange={(e) => update("productionStatus", e.target.value)}
            className="rw-form-select"
            required
          >
            <option value="">Select status</option>
            {PRODUCTION_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title="Media Links">
        <Field label="Trailer Available?" required>
          <RadioGroup
            name="trailerAvailable"
            value={form.trailerAvailable}
            onChange={updateTrailerAvailable}
            options={[
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
            ]}
          />
        </Field>

        {form.trailerAvailable === "yes" && (
          <Field label="Trailer Link" required>
            <input
              type="url"
              placeholder="https://"
              value={form.trailerLink}
              onChange={(e) => update("trailerLink", e.target.value)}
              className="rw-form-input"
              required
            />
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["screenerLink", "Private Screener Link"],
              ["youtubeLink", "YouTube Link"],
              ["vimeoLink", "Vimeo Link"],
              ["googleDriveLink", "Google Drive Link"],
              ["dropboxLink", "Dropbox Link"],
              ["projectWebsiteLink", "Website Link"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <input
                type="url"
                placeholder="https://"
                value={form[key]}
                onChange={(e) => update(key, e.target.value)}
                className="rw-form-input"
              />
            </Field>
          ))}
        </div>
      </Section>

      <Section title="Artwork">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Poster Link">
            <input
              type="url"
              placeholder="https://"
              value={form.posterLink}
              onChange={(e) => update("posterLink", e.target.value)}
              className="rw-form-input"
            />
          </Field>
          <Field label="Hero Banner Link">
            <input
              type="url"
              placeholder="https://"
              value={form.heroBannerLink}
              onChange={(e) => update("heroBannerLink", e.target.value)}
              className="rw-form-input"
            />
          </Field>
        </div>
      </Section>

      <Section title="Rights & Ownership">
        <Field label="Do you own or control distribution rights to this project?" required>
          <RadioGroup
            name="ownsDistributionRights"
            value={form.ownsDistributionRights}
            onChange={(value) => update("ownsDistributionRights", value)}
            options={[
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
            ]}
          />
        </Field>

        <Field label="Has this project been released elsewhere?" required>
          <RadioGroup
            name="releasedElsewhere"
            value={form.releasedElsewhere}
            onChange={(value) => update("releasedElsewhere", value)}
            options={[
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
            ]}
          />
        </Field>

        {form.releasedElsewhere === "yes" && (
          <Field label="If yes, where?" required>
            <input
              type="text"
              value={form.releasedElsewhereWhere}
              onChange={(e) => update("releasedElsewhereWhere", e.target.value)}
              className="rw-form-input"
              required
            />
          </Field>
        )}
      </Section>

      <Section title="Additional Notes">
        <Field label="Anything else we should know?">
          <textarea
            value={form.additionalNotes}
            onChange={(e) => update("additionalNotes", e.target.value)}
            className="rw-form-textarea"
            rows={4}
          />
        </Field>
      </Section>

      {error && (
        <p className="rounded-lg border border-obsidian-red/35 bg-obsidian-red/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-300">
        <input
          type="checkbox"
          checked={form.rightsConfirmed === "yes"}
          onChange={(e) => update("rightsConfirmed", e.target.checked ? "yes" : "")}
          className="mt-0.5 h-4 w-4 shrink-0 accent-obsidian-red"
          required
        />
        <span>
          I own or control the rights necessary to submit this project to ReelWalia.
          <span className="text-obsidian-red"> *</span>
        </span>
      </label>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
        <p className="text-sm leading-relaxed text-zinc-400">
          ReelWalia is a curated platform. Submitting your project does not
          guarantee publication. Every submission is reviewed manually by our
          team.
        </p>
        <button
          type="submit"
          disabled={pending || form.rightsConfirmed !== "yes"}
          className="rw-btn-primary mt-5 min-h-12 w-full sm:w-auto"
        >
          {pending ? (
            <span className="inline-flex items-center gap-2">
              <LoadingSpinner className="h-5 w-5" label="Submitting" />
              Submitting…
            </span>
          ) : (
            "Submit Project"
          )}
        </button>
      </div>
    </form>
  );
}
