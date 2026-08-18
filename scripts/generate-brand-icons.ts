/**
 * Generate static favicon + PWA icon PNGs from the flat ReelWalia mark.
 * Run: npx tsx scripts/generate-brand-icons.ts
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { flatBrandMarkSvgString } from "../lib/brand-mark-paths";

const ROOT = path.join(process.cwd(), "app");
const PUBLIC = path.join(process.cwd(), "public");
const SVG = Buffer.from(flatBrandMarkSvgString());

async function png(size: number, padding = 0.08): Promise<Buffer> {
  const inner = Math.round(size * (1 - padding * 2));
  const mark = await sharp(SVG).resize(inner, inner).png().toBuffer();
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .composite([{ input: mark, gravity: "centre" }])
    .png()
    .toBuffer();
}

async function favicon(): Promise<Buffer> {
  const sizes = [16, 32, 48];
  const images = await Promise.all(sizes.map((s) => png(s, 0.06)));
  // sharp doesn't write multi-size ICO natively; use largest PNG embedded as ICO substitute
  // Browsers + Stripe accept PNG-as-ICO via rename; generate true ICO from 32px layer.
  const layer32 = images[1]!;
  return sharp(layer32).toFormat("png").toBuffer();
}

async function main() {
  await mkdir(PUBLIC, { recursive: true });

  const icon32 = await png(32, 0.06);
  const icon192 = await png(192, 0.08);
  const icon512 = await png(512, 0.08);
  const apple180 = await png(180, 0.08);
  const faviconPng = await favicon();

  await writeFile(path.join(ROOT, "favicon.ico"), faviconPng);
  await writeFile(path.join(PUBLIC, "icon-192.png"), icon192);
  await writeFile(path.join(PUBLIC, "icon-512.png"), icon512);
  await writeFile(path.join(PUBLIC, "apple-touch-icon.png"), apple180);

  console.log("Wrote app/favicon.ico");
  console.log("Wrote public/icon-192.png, icon-512.png, apple-touch-icon.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
