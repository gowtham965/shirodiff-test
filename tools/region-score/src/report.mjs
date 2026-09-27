// Renders a compare() result as images plus a markdown report shaped like a PR comment.

import { PNG } from "pngjs";
import { padToSize } from "./compare.mjs";

const LEVEL_COLOURS = {
  "needs review": [220, 38, 38],
  minor: [245, 158, 11],
  "no meaningful change": [120, 120, 120],
};
const LEVEL_ICONS = { "needs review": "🔴", minor: "🟠", "no meaningful change": "✅" };

// 3x5 bitmap digits for numbering regions on the annotated image.
const DIGITS = [
  "111101101101111", "010110010010111", "111001111100111", "111001111001111", "101101111001001",
  "111100111001111", "111100111101111", "111001001001001", "111101111101111", "111101111001111",
];

export function annotate(after, result) {
  const img = clone(padToSize(after, result.width, result.height));
  for (const r of result.regions) {
    const colour = LEVEL_COLOURS[r.level];
    const pad = 6;
    strokeRect(img, r.x - pad, r.y - pad, r.width + pad * 2, r.height + pad * 2, 3, colour);
    drawBadge(img, r.x - pad, r.y - pad - 30, String(r.id), colour);
  }
  return img;
}

export function crop(img, full, r, pad = 12) {
  const src = padToSize(img, full.width, full.height);
  const x0 = Math.max(0, r.x - pad), y0 = Math.max(0, r.y - pad);
  const x1 = Math.min(full.width, r.x + r.width + pad), y1 = Math.min(full.height, r.y + r.height + pad);
  const out = { width: x1 - x0, height: y1 - y0, data: new Uint8Array((x1 - x0) * (y1 - y0) * 4) };
  for (let y = y0; y < y1; y++) {
    out.data.set(src.data.subarray((y * full.width + x0) * 4, (y * full.width + x1) * 4), (y - y0) * out.width * 4);
  }
  return out;
}

export function toPngBuffer(img) {
  const png = new PNG({ width: img.width, height: img.height });
  png.data = Buffer.from(img.data);
  return PNG.sync.write(png);
}

export function markdown(result) {
  const { page, regions, verdict } = result;
  const pct = (v) => `${(v * 100).toFixed(2)}%`;
  const wholePageSays = page.composite >= 0.95 ? "looks safe (above the 95% line)" : "needs a look (below 95%)";
  const lines = [
    "## Region report",
    "",
    `**Whole-page composite (how ShiroDiff scores today): ${pct(page.composite)}** → ${wholePageSays}`,
    `<sub>Pixel change ${pct(page.pixelChange)} · SSIM ${pct(page.ssim)} · Pixel sim ${pct(page.pixelSim)}</sub>`,
    "",
    `**Region scoring: ${LEVEL_ICONS[verdict.level]} ${capitalise(verdict.level)}**` +
      (verdict.worstRegion ? ` · worst is region ${verdict.worstRegion} (severity ${verdict.severity.toFixed(2)})` : ""),
    "",
  ];

  if (regions.length === 0) {
    lines.push("No changed regions found.");
    return lines.join("\n") + "\n";
  }

  lines.push(
    "![changed regions](annotated.png)",
    "",
    "| # | Region (x, y, w×h) | Changed pixels | Colour shift (ΔE) | Severity | Likely |",
    "|---|---|---|---|---|---|",
    ...regions.map((r) =>
      `| ${r.id} | ${r.x}, ${r.y}, ${r.width}×${r.height} | ${pct(r.coverage)} of region | ${r.meanDeltaE} | ` +
        `${LEVEL_ICONS[r.level]} ${r.severity.toFixed(2)} | ${r.kind}` +
        (r.beforeColour ? ` (${r.beforeColour} → ${r.afterColour})` : "") + " |",
    ),
    "",
    "| # | Before | After |",
    "|---|---|---|",
    ...regions.map((r) => `| ${r.id} | ![before](region-${r.id}-before.png) | ![after](region-${r.id}-after.png) |`),
    "",
    "<sub>Severity = √(share of the region that changed) × (colour shift ÷ 50, capped at 1). " +
      "≥ 0.30 needs review · ≥ 0.10 minor.</sub>",
  );
  return lines.join("\n") + "\n";
}

function clone(img) {
  return { width: img.width, height: img.height, data: new Uint8Array(img.data) };
}

function setPixel(img, x, y, [r, g, b]) {
  if (x < 0 || y < 0 || x >= img.width || y >= img.height) return;
  const i = (y * img.width + x) * 4;
  img.data[i] = r;
  img.data[i + 1] = g;
  img.data[i + 2] = b;
  img.data[i + 3] = 255;
}

function fillRect(img, x, y, w, h, colour) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) setPixel(img, xx, yy, colour);
}

function strokeRect(img, x, y, w, h, t, colour) {
  fillRect(img, x, y, w, t, colour);
  fillRect(img, x, y + h - t, w, t, colour);
  fillRect(img, x, y, t, h, colour);
  fillRect(img, x + w - t, y, t, h, colour);
}

function drawBadge(img, x, y, label, colour) {
  const scale = 4, gap = 4, pad = 5;
  const w = label.length * (3 * scale + gap) - gap + pad * 2;
  const h = 5 * scale + pad * 2;
  const top = Math.max(0, y);
  fillRect(img, x, top, w, h, colour);
  [...label].forEach((ch, n) => {
    const bits = DIGITS[Number(ch)];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 3; col++) {
        if (bits[row * 3 + col] === "1") {
          fillRect(img, x + pad + n * (3 * scale + gap) + col * scale, top + pad + row * scale, scale, scale, [255, 255, 255]);
        }
      }
    }
  });
}

function capitalise(s) {
  return s[0].toUpperCase() + s.slice(1);
}
