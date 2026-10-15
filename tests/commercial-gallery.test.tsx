import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CommercialGallery, commercialCategories } from "@/components/commercials/CommercialGallery";
import { commercialObjectName, commercialObjectPath } from "@/lib/commercials/upload";
import type { Commercial } from "@/lib/commercials/constants";

const base: Commercial = {
  id: "c1",
  title: "Cold Brew Drop",
  client_name: null,
  description: null,
  video_url: "https://example.supabase.co/storage/v1/object/public/commercials/videos/xyz.mp4",
  thumbnail_url: "https://example.supabase.co/storage/v1/object/public/commercials/thumbs/xyz.jpg",
  aspect_ratio: "9:16",
  duration_seconds: 32,
  category: "Product",
  is_featured: false,
  is_published: true,
  sort_order: 0,
  created_at: "2026-10-01T00:00:00Z",
};

describe("CommercialGallery", () => {
  it("zero commercials: tasteful empty state, no grid", () => {
    const html = renderToStaticMarkup(<CommercialGallery commercials={[]} />);
    expect(html).toContain("New work dropping soon");
    expect(html).not.toContain("commercial-card");
  });

  it("renders cards with client fallback, aspect ratio, and no eager video", () => {
    const html = renderToStaticMarkup(
      <CommercialGallery
        commercials={[
          base,
          { ...base, id: "c2", title: "Launch Night", client_name: "Addis Events", aspect_ratio: "16:9", category: "Event" },
        ]}
      />
    );
    expect(html).toContain("ReelWalia Original");
    expect(html).toContain("Addis Events");
    expect(html).toContain("aspect-ratio:9 / 16");
    expect(html).toContain("aspect-ratio:16 / 9");
    expect(html).not.toContain("<video");
    expect(html).toContain(">Product<");
    expect(html).toContain(">Event<");
    expect(html).not.toMatch(/class="[^"]*\b(ad|ads)-/);
  });

  it("categories: All plus each distinct category once", () => {
    expect(
      commercialCategories([base, { ...base, id: "x" }, { ...base, id: "y", category: "App" }, { ...base, id: "z", category: null }])
    ).toEqual(["All", "Product", "App"]);
  });
});

describe("storage object names", () => {
  it("never contain 'ad'", () => {
    for (let i = 0; i < 2000; i++) expect(commercialObjectName()).not.toMatch(/ad/i);
    expect(commercialObjectPath("video", "video/mp4")).toMatch(/^videos\/[^/]+\.mp4$/);
    expect(commercialObjectPath("thumb", "image/webp")).toMatch(/^thumbs\/[^/]+\.webp$/);
    expect(() => commercialObjectPath("video", "image/gif")).toThrow();
  });
});
