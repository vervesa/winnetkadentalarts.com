// Responsive image pipeline: originals in public/assets/img/src/ → the sizes and formats each
// slot needs in public/assets/img/, plus the <picture> markup to paste into the page.
//
//   node tools/images.mjs            # every entry in tools/images.json
//   node tools/images.mjs hero       # one entry
//
// tools/images.json lists each slot: the original file, the output name, the widths to make
// (displayed width × device pixel ratio, so a 500px slot gets 1000px for 2× screens), the
// "sizes" attribute the page uses, and an optional crop (aspect ratio + focus) so every width is
// the same framing the slot shows. Output: <name>-<width>.avif, .webp and .jpg; the largest
// JPEG is also written as <name>.jpg for the plain <img src> fallback and og:image.
//
// Originals are never served: public/assets/img/src/ is excluded from the build.
//
// Served images are cached for a year as immutable (public/_headers), so a slot whose picture
// CHANGES (a retouched original, a different photo, a new crop) must get new file names or
// browsers and the edge keep showing the old one. Set "version": 2 (3, …) on the entry: the files
// become <name>-v2-<width>.*, and the printed markup changes with them — paste it into the page
// and delete the old files.

import { mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC_DIR = path.join(ROOT, "public/assets/img/src");
const OUT_DIR = path.join(ROOT, "public/assets/img");
const QUALITY = { avif: 60, webp: 80, jpg: 82 };

const manifest = JSON.parse(await readFile(path.join(ROOT, "tools/images.json"), "utf8"));
const only = process.argv.slice(2);
const entries = Object.entries(manifest).filter(([name]) => !only.length || only.includes(name));
if (!entries.length) throw new Error(`no entries match ${only.join(", ")}`);

await mkdir(OUT_DIR, { recursive: true });

for (const [slot, spec] of entries) {
  const name = spec.version ? `${slot}-v${spec.version}` : slot; // output file stem
  const srcPath = path.join(SRC_DIR, spec.src);
  await stat(srcPath); // throws a clear ENOENT if the original is missing
  await mkdir(path.dirname(path.join(OUT_DIR, name)), { recursive: true }); // e.g. services/
  const base = sharp(srcPath).rotate(); // apply EXIF orientation once
  const meta = await base.metadata();
  const [rw, rh] = (spec.ratio || "").split(":").map(Number);

  // Crop once to the slot's ratio (about the focus point), then resize to each width.
  let cropped = base;
  let cw = meta.width, ch = meta.height;
  if (rw && rh) {
    const target = rw / rh;
    if (cw / ch > target) cw = Math.round(ch * target);
    else ch = Math.round(cw / target);
    const [fx, fy] = spec.focus || [0.5, 0.5];
    const left = Math.round((meta.width - cw) * fx);
    const top = Math.round((meta.height - ch) * fy);
    cropped = base.extract({ left, top, width: cw, height: ch });
  }

  const widths = spec.widths.filter((w) => w <= cw);
  if (widths.length < spec.widths.length) {
    console.warn(`  ${name}: original is ${cw}px wide after cropping; skipping ${spec.widths.filter((w) => w > cw).join(", ")}`);
  }
  const written = [];
  for (const w of widths) {
    const resized = cropped.clone().resize({ width: w, withoutEnlargement: true });
    await resized.clone().avif({ quality: QUALITY.avif }).toFile(path.join(OUT_DIR, `${name}-${w}.avif`));
    await resized.clone().webp({ quality: QUALITY.webp }).toFile(path.join(OUT_DIR, `${name}-${w}.webp`));
    const jpg = await resized.clone().jpeg({ quality: QUALITY.jpg, mozjpeg: true }).toFile(path.join(OUT_DIR, `${name}-${w}.jpg`));
    written.push({ w, jpgBytes: jpg.size });
  }
  const largest = widths[widths.length - 1];
  const fallback = await cropped.clone().resize({ width: largest, withoutEnlargement: true }).jpeg({ quality: QUALITY.jpg, mozjpeg: true }).toFile(path.join(OUT_DIR, `${name}.jpg`));
  const fallbackH = Math.round((largest * ch) / cw);

  const srcset = (ext) => widths.map((w) => `/assets/img/${name}-${w}.${ext} ${w}w`).join(", ");
  console.log(`\n${slot}${spec.version ? ` (v${spec.version})` : ""}: ${meta.width}×${meta.height} → ${widths.join("/")}px (${spec.ratio || "original ratio"}), fallback ${largest}×${fallbackH} ${(fallback.size / 1024).toFixed(0)} KB`);
  console.log(
    `<picture>` +
      `<source type="image/avif" srcset="${srcset("avif")}" sizes="${spec.sizes}">` +
      `<source type="image/webp" srcset="${srcset("webp")}" sizes="${spec.sizes}">` +
      `<img src="/assets/img/${name}.jpg" srcset="${srcset("jpg")}" sizes="${spec.sizes}" alt="${spec.alt || ""}" width="${largest}" height="${fallbackH}"${spec.eager ? ' fetchpriority="high"' : ' loading="lazy"'}>` +
      `</picture>`
  );
}
