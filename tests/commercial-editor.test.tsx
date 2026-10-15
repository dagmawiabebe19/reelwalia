import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CommercialEditor } from "@/components/admin/commercials/CommercialEditor";
import type { Commercial } from "@/lib/commercials/constants";

const noop = () => {};

describe("CommercialEditor dropzones", () => {
  it("native file inputs are visually hidden inside labelled dropzones", () => {
    const html = renderToStaticMarkup(
      <CommercialEditor commercial={null} nextSortOrder={10} onSaved={noop} onCancel={noop} />
    );
    const fileInputs = html.match(/<input[^>]*type="file"[^>]*>/g) ?? [];
    expect(fileInputs).toHaveLength(2);
    for (const input of fileInputs) expect(input).toContain('class="sr-only"');
    expect(html.match(/commercial-dropzone/g)).toHaveLength(2);
    expect(html).toContain('accept="video/mp4,video/quicktime,video/webm');
    expect(html).toContain('accept="image/jpeg,image/png,image/webp');
    expect(html).toContain("Save advertisement");
    expect(html).toContain("New advertisement");
  });

  it("editing shows the current file names", () => {
    const commercial: Commercial = {
      id: "11111111-2222-4333-8444-555555555555",
      title: "Cold Brew",
      client_name: null,
      description: null,
      video_url: "https://x.supabase.co/storage/v1/object/public/commercials/videos/bcefghjk.mp4",
      thumbnail_url: "https://x.supabase.co/storage/v1/object/public/commercials/thumbs/bcefghjk.jpg",
      aspect_ratio: "9:16",
      duration_seconds: 30,
      category: "Product",
      is_featured: false,
      is_published: true,
      sort_order: 0,
      created_at: "2026-10-01T00:00:00Z",
    };
    const html = renderToStaticMarkup(
      <CommercialEditor commercial={commercial} nextSortOrder={10} onSaved={noop} onCancel={noop} />
    );
    expect(html).toContain("bcefghjk.mp4");
    expect(html).toContain("bcefghjk.jpg");
    expect(html).toContain("Save changes");
  });
});
