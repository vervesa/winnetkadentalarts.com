// Build: copy ./public to ./dist and minify HTML, CSS and JS on the way.
// Wrangler runs this before every `wrangler deploy` / `wrangler dev` (see "build" in wrangler.jsonc),
// so git keeps the readable source and only the minified copy is ever served.
import { cp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { minify as minifyHtml } from "html-minifier-terser";
import { transform } from "esbuild";

const SRC = "public";
const OUT = "dist";

const HTML_OPTIONS = {
  collapseWhitespace: true,
  conservativeCollapse: false,
  removeComments: true,
  minifyCSS: true, // style="" attributes and <style> blocks
  minifyJS: true, // inline <script> blocks
  processScripts: ["application/ld+json"],
  useShortDoctype: true,
  removeAttributeQuotes: false, // keep quotes: safest for attribute values with spaces/URLs
  keepClosingSlash: false,
  decodeEntities: false,
};

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else yield p;
  }
}

await rm(OUT, { recursive: true, force: true });
await cp(SRC, OUT, { recursive: true });

const totals = { html: [0, 0], css: [0, 0], js: [0, 0] };
for await (const file of walk(OUT)) {
  const ext = path.extname(file).toLowerCase();
  if (![".html", ".css", ".js"].includes(ext)) continue;
  const source = await readFile(file, "utf8");
  let output;
  if (ext === ".html") {
    output = await minifyHtml(source, HTML_OPTIONS);
  } else {
    const result = await transform(source, {
      loader: ext === ".css" ? "css" : "js",
      minify: true,
      target: ext === ".js" ? "es2017" : undefined,
      legalComments: "none",
    });
    output = result.code;
  }
  await writeFile(file, output);
  const key = ext.slice(1);
  totals[key][0] += Buffer.byteLength(source);
  totals[key][1] += Buffer.byteLength(output);
}

const kb = (n) => (n / 1024).toFixed(1) + " KB";
for (const [k, [before, after]] of Object.entries(totals)) {
  console.log(`${k.padEnd(4)} ${kb(before)} -> ${kb(after)}`);
}
console.log(`built ${OUT}/ from ${SRC}/`);
