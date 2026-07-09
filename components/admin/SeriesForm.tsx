"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveSeries, type SeriesFormData } from "@/app/admin/actions";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { PosterUpload } from "@/components/admin/PosterUpload";
import { DEFAULT_FREE_EPISODE_COUNT } from "@/lib/access";
import { DEFAULT_SERIES_ORIENTATION } from "@/lib/series-orientation";
import { slugify } from "@/lib/slug";
import { SERIES_GENRES, type Series, type SeriesOrientation } from "@/lib/types/database";

interface SeriesFormProps {
  initial?: Partial<Series> & { id?: string };
}

export function SeriesForm({ initial }: SeriesFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugManual, setSlugManual] = useState(!!initial?.slug);
  const [synopsis, setSynopsis] = useState(initial?.description ?? "");
  const [genre, setGenre] = useState<(typeof SERIES_GENRES)[number]>(
    (initial?.genre?.[0] as (typeof SERIES_GENRES)[number]) ?? "Drama"
  );
  const [totalEpisodes, setTotalEpisodes] = useState(initial?.total_episodes ?? 10);
  const [freeEpisodeCount, setFreeEpisodeCount] = useState(
    initial?.free_episode_count ?? DEFAULT_FREE_EPISODE_COUNT
  );
  const [posterUrl, setPosterUrl] = useState(initial?.poster_url ?? "");
  const [heroBannerUrl, setHeroBannerUrl] = useState(initial?.banner_url ?? "");
  const [isFeatured, setIsFeatured] = useState(initial?.is_featured ?? false);
  const [isPublished, setIsPublished] = useState(initial?.status === "published");
  const [orientation, setOrientation] = useState<SeriesOrientation>(
    initial?.orientation ?? DEFAULT_SERIES_ORIENTATION
  );

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slugManual) setSlug(slugify(value));
  };

  const submit = () => {
    setError(null);
    const data: SeriesFormData = {
      id: initial?.id,
      title,
      slug,
      synopsis,
      genre,
      total_episodes: totalEpisodes,
      free_episode_count: freeEpisodeCount,
      poster_url: posterUrl,
      hero_banner_url: heroBannerUrl,
      is_featured: isFeatured,
      is_published: isPublished,
      orientation,
    };

    startTransition(async () => {
      try {
        await saveSeries(data);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <AdminPageHeader
        title={initial?.id ? "Edit Series" : "Add Series"}
        backHref="/admin/series"
        backLabel="Back to catalog"
      />

      <div className="rw-form-section space-y-4">
        <label className="block space-y-1.5">
          <span className="rw-form-label">Title</span>
          <input
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="rw-form-input"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="rw-form-label">Slug</span>
          <input
            value={slug}
            onChange={(e) => {
              setSlugManual(true);
              setSlug(e.target.value);
            }}
            className="rw-form-input font-mono text-sm"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="rw-form-label">Synopsis</span>
          <textarea
            value={synopsis}
            onChange={(e) => setSynopsis(e.target.value)}
            rows={4}
            className="rw-form-textarea"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="rw-form-label">Genre</span>
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value as (typeof SERIES_GENRES)[number])}
            className="rw-form-select"
          >
            {SERIES_GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="rw-form-section">
        <h2 className="rw-form-section-title">Orientation</h2>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-zinc-300">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="orientation"
              value="vertical"
              checked={orientation === "vertical"}
              onChange={() => setOrientation("vertical")}
              className="accent-obsidian-red"
            />
            Vertical (9:16)
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="orientation"
              value="landscape"
              checked={orientation === "landscape"}
              onChange={() => setOrientation("landscape")}
              className="accent-obsidian-red"
            />
            Landscape (16:9)
          </label>
        </div>
      </div>

      <div className="rw-form-section">
        <h2 className="rw-form-section-title">Episodes & Access</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="rw-form-label">Total episodes</span>
            <input
              type="number"
              min={1}
              value={totalEpisodes}
              onChange={(e) => setTotalEpisodes(Number(e.target.value))}
              className="rw-form-input"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="rw-form-label">Free episode count</span>
            <input
              type="number"
              min={0}
              value={freeEpisodeCount}
              onChange={(e) => setFreeEpisodeCount(Number(e.target.value))}
              className="rw-form-input"
            />
          </label>
        </div>
      </div>

      <div className="rw-form-section">
        <h2 className="rw-form-section-title">Artwork</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <PosterUpload label="Poster" value={posterUrl} onChange={setPosterUrl} />
          <PosterUpload
            label="Hero banner"
            value={heroBannerUrl}
            onChange={setHeroBannerUrl}
          />
        </div>
      </div>

      <div className="rw-form-section">
        <h2 className="rw-form-section-title">Visibility</h2>
        <div className="mt-4 flex flex-wrap gap-6 text-sm text-zinc-300">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="h-4 w-4 accent-obsidian-red"
            />
            Featured
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="h-4 w-4 accent-obsidian-red"
            />
            Published
          </label>
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="button"
        disabled={pending || !title.trim()}
        onClick={submit}
        className="rw-btn-primary min-h-11 px-6"
      >
        {pending ? "Saving…" : "Save Series"}
      </button>
    </div>
  );
}
