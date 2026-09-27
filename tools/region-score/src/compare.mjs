// Region-level scoring for a before/after screenshot pair.
//
// ShiroDiff's composite averages two whole-page scores, so a small but
// important change (a button changing colour) gets diluted by the unchanged
// rest of the page. This scores each changed region on its own and lets the
// worst region decide the verdict.

import pixelmatch from "pixelmatch";

const DEFAULTS = {
  threshold: 0.1, // pixelmatch default, same as ShiroDiff
  mergeRadius: 10, // changed pixels closer than ~2x this merge into one region
  minPixels: 50, // regions with fewer changed pixels are treated as noise
  deltaECap: 50, // colour shift (CIE76 ΔE) at which a change counts as "fully" different
};

const LEVELS = [
  { min: 0.3, level: "needs review" },
  { min: 0.1, level: "minor" },
  { min: -Infinity, level: "no meaningful change" },
];

export function compare(before, after, options = {}) {
  const opts = { ...DEFAULTS, ...options };
  const width = Math.max(before.width, after.width);
  const height = Math.max(before.height, after.height);
  const a = padToSize(before, width, height);
  const b = padToSize(after, width, height);

  const { mask, count } = changedMask(a, b, width, height, opts.threshold);
  const regions = findRegions(mask, width, height, opts).map((box, i) => ({
    id: i + 1,
    ...box,
    ...scoreRegion(a, b, mask, width, box, opts),
  }));

  const worst = regions.reduce((w, r) => (!w || r.severity > w.severity ? r : w), null);
  return {
    width,
    height,
    page: pageScores(a, b, width, height, count),
    regions,
    verdict: {
      level: worst ? worst.level : levelFor(0),
      worstRegion: worst ? worst.id : null,
      severity: worst ? worst.severity : 0,
    },
  };
}

export function padToSize(img, width, height) {
  if (img.width === width && img.height === height) return img;
  const data = new Uint8Array(width * height * 4).fill(255);
  for (let y = 0; y < img.height; y++) {
    const row = img.data.subarray(y * img.width * 4, (y + 1) * img.width * 4);
    data.set(row, y * width * 4);
  }
  return { width, height, data };
}

function changedMask(a, b, width, height, threshold) {
  const out = new Uint8Array(width * height * 4);
  const count = pixelmatch(a.data, b.data, out, width, height, {
    threshold,
    diffMask: true, // only changed pixels are drawn; anti-aliasing is skipped
    diffColor: [255, 0, 0],
  });
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i++) mask[i] = out[i * 4 + 3] > 0 ? 1 : 0;
  return { mask, count };
}

// Box-dilate the mask so nearby changed pixels (letters of one word, a
// border and its fill) join up, then flood-fill to find each region. The
// region's box is the tight bounds of the real changed pixels inside it.
function findRegions(mask, width, height, { mergeRadius, minPixels }) {
  const grown = dilate(mask, width, height, mergeRadius);
  const seen = new Uint8Array(mask.length);
  const stack = new Int32Array(mask.length);
  const regions = [];

  for (let start = 0; start < grown.length; start++) {
    if (!grown[start] || seen[start]) continue;
    let top = 0;
    stack[top++] = start;
    seen[start] = 1;
    let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1, changed = 0;

    while (top > 0) {
      const i = stack[--top];
      const x = i % width;
      const y = (i - x) / width;
      if (mask[i]) {
        changed++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
      const neighbours = [
        x > 0 ? i - 1 : -1,
        x < width - 1 ? i + 1 : -1,
        y > 0 ? i - width : -1,
        y < height - 1 ? i + width : -1,
      ];
      for (const j of neighbours) {
        if (j >= 0 && grown[j] && !seen[j]) {
          seen[j] = 1;
          stack[top++] = j;
        }
      }
    }

    if (changed >= minPixels) {
      regions.push({ x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 });
    }
  }

  return regions.sort((r1, r2) => r1.y - r2.y || r1.x - r2.x);
}

function dilate(mask, width, height, r) {
  const horizontal = new Uint8Array(mask.length);
  for (let y = 0; y < height; y++) slidingMax(mask, horizontal, y * width, 1, width, r);
  const out = new Uint8Array(mask.length);
  for (let x = 0; x < width; x++) slidingMax(horizontal, out, x, width, height, r);
  return out;
}

// out[k] = 1 if any src within r steps of k (along one row or column) is set.
function slidingMax(src, out, offset, stride, length, r) {
  let count = 0;
  for (let k = 0; k < Math.min(r, length); k++) count += src[offset + k * stride];
  for (let k = 0; k < length; k++) {
    if (k + r < length) count += src[offset + (k + r) * stride];
    if (k - r - 1 >= 0) count -= src[offset + (k - r - 1) * stride];
    out[offset + k * stride] = count > 0 ? 1 : 0;
  }
}

function scoreRegion(a, b, mask, width, box, { deltaECap }) {
  let changed = 0, deltaESum = 0;
  const sumA = [0, 0, 0], sumB = [0, 0, 0];

  for (let y = box.y; y < box.y + box.height; y++) {
    for (let x = box.x; x < box.x + box.width; x++) {
      const i = y * width + x;
      if (!mask[i]) continue;
      const p = i * 4;
      changed++;
      deltaESum += deltaE(a.data, b.data, p);
      for (let c = 0; c < 3; c++) {
        sumA[c] += a.data[p + c];
        sumB[c] += b.data[p + c];
      }
    }
  }

  const area = box.width * box.height;
  const coverage = changed / area;
  const meanDeltaE = deltaESum / changed;
  // How much of the region changed, times how strongly its colours changed.
  const severity = Math.sqrt(coverage) * Math.min(meanDeltaE / deltaECap, 1);
  // A mostly-solid block of changed pixels is a fill/colour change; sparse
  // changes (letters, edges) are text or layout changes.
  const kind = coverage >= 0.5 ? "colour change" : "text or layout change";

  return {
    changedPixels: changed,
    coverage: round(coverage),
    meanDeltaE: round(meanDeltaE, 1),
    severity: round(severity),
    level: levelFor(severity),
    kind,
    ...(kind === "colour change" && {
      beforeColour: hex(sumA.map((s) => s / changed)),
      afterColour: hex(sumB.map((s) => s / changed)),
    }),
  };
}

// Whole-page scores the way ShiroDiff reports them, for side-by-side comparison.
// Pixel sim and the pixelmatch count match ShiroDiff exactly; its SSIM code
// isn't public, and greyscale 11x11-block SSIM lands within ~0.05% of it.
function pageScores(a, b, width, height, changedCount) {
  const n = width * height;
  let diff = 0;
  for (let p = 0; p < n * 4; p += 4) {
    diff +=
      (Math.abs(a.data[p] - b.data[p]) +
        Math.abs(a.data[p + 1] - b.data[p + 1]) +
        Math.abs(a.data[p + 2] - b.data[p + 2])) / 765;
  }
  const pixelSim = 1 - diff / n;
  const ssim = blockSSIM(grey(a, n), grey(b, n), width, height, 11);
  return {
    pixelChange: round(changedCount / n, 4),
    pixelSim: round(pixelSim, 4),
    ssim: round(ssim, 4),
    composite: round((ssim + pixelSim) / 2, 4),
  };
}

function grey(img, n) {
  const g = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const p = i * 4;
    g[i] = 0.299 * img.data[p] + 0.587 * img.data[p + 1] + 0.114 * img.data[p + 2];
  }
  return g;
}

function blockSSIM(x, y, width, height, size) {
  const C1 = (0.01 * 255) ** 2, C2 = (0.03 * 255) ** 2;
  const n = size * size;
  let total = 0, blocks = 0;
  for (let by = 0; by + size <= height; by += size) {
    for (let bx = 0; bx + size <= width; bx += size) {
      let mx = 0, my = 0;
      for (let v = 0; v < size; v++) {
        for (let u = 0; u < size; u++) {
          const k = (by + v) * width + bx + u;
          mx += x[k];
          my += y[k];
        }
      }
      mx /= n;
      my /= n;
      let vx = 0, vy = 0, cov = 0;
      for (let v = 0; v < size; v++) {
        for (let u = 0; u < size; u++) {
          const k = (by + v) * width + bx + u;
          const dx = x[k] - mx, dy = y[k] - my;
          vx += dx * dx;
          vy += dy * dy;
          cov += dx * dy;
        }
      }
      vx /= n - 1;
      vy /= n - 1;
      cov /= n - 1;
      total += ((2 * mx * my + C1) * (2 * cov + C2)) / ((mx * mx + my * my + C1) * (vx + vy + C2));
      blocks++;
    }
  }
  return total / blocks;
}

// CIE76 colour difference: ~2 is barely visible, 50+ is a completely different colour.
function deltaE(da, db, p) {
  const [l1, a1, b1] = lab(da[p], da[p + 1], da[p + 2]);
  const [l2, a2, b2] = lab(db[p], db[p + 1], db[p + 2]);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

function lab(r, g, b) {
  const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const R = lin(r), G = lin(g), B = lin(b);
  const X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047;
  const Y = 0.2126 * R + 0.7152 * G + 0.0722 * B;
  const Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(X), fy = f(Y), fz = f(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function levelFor(severity) {
  return LEVELS.find((l) => severity >= l.min).level;
}

function hex(rgb) {
  return "#" + rgb.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("");
}

function round(v, digits = 2) {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}
