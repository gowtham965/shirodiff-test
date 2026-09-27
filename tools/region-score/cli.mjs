#!/usr/bin/env node
// Usage: node cli.mjs before.png after.png [--out dir]

import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import { compare } from "./src/compare.mjs";
import { annotate, crop, markdown, toPngBuffer } from "./src/report.mjs";

const args = process.argv.slice(2);
const outIndex = args.indexOf("--out");
const outDir = outIndex >= 0 ? args[outIndex + 1] : "region-score-out";
const [beforePath, afterPath] = args.filter((_, i) => i !== outIndex && i !== outIndex + 1);

if (!beforePath || !afterPath) {
  console.error("Usage: node cli.mjs before.png after.png [--out dir]");
  process.exit(1);
}

const before = PNG.sync.read(fs.readFileSync(beforePath));
const after = PNG.sync.read(fs.readFileSync(afterPath));
const result = compare(before, after);

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "result.json"), JSON.stringify(result, null, 2) + "\n");
fs.writeFileSync(path.join(outDir, "annotated.png"), toPngBuffer(annotate(after, result)));
for (const r of result.regions) {
  fs.writeFileSync(path.join(outDir, `region-${r.id}-before.png`), toPngBuffer(crop(before, result, r)));
  fs.writeFileSync(path.join(outDir, `region-${r.id}-after.png`), toPngBuffer(crop(after, result, r)));
}
fs.writeFileSync(path.join(outDir, "report.md"), markdown(result));

const pct = (v) => `${(v * 100).toFixed(2)}%`;
console.log(`Whole-page composite: ${pct(result.page.composite)}`);
console.log(`Region verdict: ${result.verdict.level} (worst region ${result.verdict.worstRegion ?? "-"})`);
for (const r of result.regions) {
  const colours = r.beforeColour ? ` ${r.beforeColour} -> ${r.afterColour}` : "";
  console.log(
    `  #${r.id} at ${r.x},${r.y} ${r.width}x${r.height}  severity ${r.severity.toFixed(2)} (${r.level})  ${r.kind}${colours}`,
  );
}
console.log(`Report written to ${path.join(outDir, "report.md")}`);
