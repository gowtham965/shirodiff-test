import { test } from "node:test";
import assert from "node:assert/strict";
import { compare } from "../src/compare.mjs";

const W = 1440;
const H = 900;

function blankPage(width = W, height = H) {
  return { width, height, data: new Uint8Array(width * height * 4).fill(255) };
}

function fillRect(img, x, y, w, h, [r, g, b]) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      const i = (yy * img.width + xx) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  }
}

const BLUE = [21, 93, 252];
const GREEN = [0, 166, 62];

test("identical screenshots have no regions and pass", () => {
  const a = blankPage();
  fillRect(a, 652, 280, 136, 48, BLUE);
  const b = blankPage();
  fillRect(b, 652, 280, 136, 48, BLUE);

  const result = compare(a, b);

  assert.equal(result.regions.length, 0);
  assert.equal(result.verdict.level, "no meaningful change");
  assert.equal(result.page.pixelChange, 0);
});

test("a small button colour change passes the whole-page composite but is flagged by region scoring", () => {
  const a = blankPage();
  fillRect(a, 652, 280, 136, 48, BLUE);
  const b = blankPage();
  fillRect(b, 652, 280, 136, 48, GREEN);

  const result = compare(a, b);

  // The whole-page score calls this safe (above the 95% line)...
  assert.ok(result.page.composite > 0.95, `composite was ${result.page.composite}`);
  // ...but the one changed region is clearly a real change.
  assert.equal(result.regions.length, 1);
  const [region] = result.regions;
  assert.deepEqual(
    { x: region.x, y: region.y, width: region.width, height: region.height },
    { x: 652, y: 280, width: 136, height: 48 },
  );
  assert.equal(region.kind, "colour change");
  assert.equal(region.beforeColour, "#155dfc");
  assert.equal(region.afterColour, "#00a63e");
  assert.equal(result.verdict.level, "needs review");
  assert.equal(result.verdict.worstRegion, 1);
});

test("separate changes far apart become separate regions, sorted top to bottom", () => {
  const a = blankPage();
  const b = blankPage();
  fillRect(b, 900, 600, 40, 40, [0, 0, 0]);
  fillRect(b, 100, 100, 40, 40, [0, 0, 0]);

  const result = compare(a, b);

  assert.equal(result.regions.length, 2);
  assert.equal(result.regions[0].y, 100);
  assert.equal(result.regions[1].y, 600);
});

test("tiny specks of noise are ignored", () => {
  const a = blankPage();
  const b = blankPage();
  fillRect(b, 500, 500, 3, 3, [0, 0, 0]);

  const result = compare(a, b);

  assert.equal(result.regions.length, 0);
  assert.equal(result.verdict.level, "no meaningful change");
});

test("screenshots of different heights are compared by padding the shorter one", () => {
  const a = blankPage(W, 900);
  const b = blankPage(W, 1000);
  fillRect(b, 100, 950, 40, 40, [0, 0, 0]);

  const result = compare(a, b);

  assert.equal(result.height, 1000);
  assert.equal(result.regions.length, 1);
  assert.equal(result.regions[0].y, 950);
});
