import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CommercialGallery, commercialCategories } from "@/components/commercials/CommercialGallery";
import {
  commercialObjectName,
  commercialObjectPath,
  isCommercialObjectPath,
  resolveUploadType,
} from "@/lib/commercials/object-path";
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

describe("storage object paths and types", () => {
  it("never contain 'ad' and round-trip through the path guard", () => {
    for (let i = 0; i < 2000; i++) {
      expect(commercialObjectName()).not.toMatch(/ad/i);
      const p = commercialObjectPath(i % 2 ? "video" : "thumbnail", i % 2 ? "mp4" : "webp");
      expect(p).not.toMatch(/ad/i);
      expect(isCommercialObjectPath(p)).toBe(true);
    }
    expect(commercialObjectPath("video", "mov")).toMatch(/^videos\/[^/]+\.mov$/);
    expect(commercialObjectPath("thumbnail", "jpeg")).toMatch(/^thumbs\/[^/]+\.jpg$/);
    expect(isCommercialObjectPath("../secrets.txt")).toBe(false);
    expect(isCommercialObjectPath("videos/ads_banner.mp4")).toBe(false);
  });

  it("accepts only mp4/mov/webm videos and jpg/png/webp thumbnails", () => {
    expect(resolveUploadType("video", "spot.mp4", "video/mp4")).toEqual({ contentType: "video/mp4", ext: "mp4" });
    expect(resolveUploadType("video", "spot.MOV", "")).toEqual({ contentType: "video/quicktime", ext: "mov" });
    expect(resolveUploadType("video", "spot.webm", "video/webm")?.contentType).toBe("video/webm");
    expect(resolveUploadType("video", "spot.avi", "video/x-msvideo")).toBeNull();
    expect(resolveUploadType("video", "spot.gif", "")).toBeNull();
    expect(resolveUploadType("video", "poster.png", "image/png")).toBeNull();
    expect(resolveUploadType("thumbnail", "t.jpeg", "image/jpeg")).toEqual({ contentType: "image/jpeg", ext: "jpeg" });
    expect(resolveUploadType("thumbnail", "t.webp", "")?.contentType).toBe("image/webp");
    expect(resolveUploadType("thumbnail", "t.gif", "image/gif")).toBeNull();
    expect(resolveUploadType("thumbnail", "t.mp4", "video/mp4")).toBeNull();
  });
});
