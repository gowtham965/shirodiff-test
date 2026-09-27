# region-score

A prototype that scores **each changed region** of a before/after screenshot pair, instead of averaging over the whole page.

ShiroDiff's composite is the average of two whole-page scores (SSIM and pixel similarity), so a small but important change, like a button changing colour, gets diluted by the rest of the page. Here the worst region decides the verdict.

```bash
npm install
npm test
node cli.mjs before.png after.png --out out/
```

## How it works
1. **Find changed pixels** with pixelmatch (default threshold 0.1, anti-aliasing ignored), the same as ShiroDiff.
2. **Group them into regions.** Changed pixels within about 20px of each other join up (a box dilation), then a flood fill finds each group, and each group gets a tight bounding box. Groups with fewer than 50 changed pixels are dropped as noise.
3. **Score each region:**
   - *Coverage:* the share of the region's pixels that changed.
   - *Colour shift:* the average CIE76 ΔE between before and after over the changed pixels, measured in Lab colour space, so a colour swap counts even when brightness barely changes.
   - *Severity* = √coverage × min(ΔE ÷ 50, 1). ≥ 0.30 needs review, ≥ 0.10 minor.
   - *Likely kind:* mostly solid changes (coverage ≥ 50%) are colour changes and get before/after colours. Sparse ones are text or layout changes.
4. **Verdict** = the worst region.

It also reports ShiroDiff's whole-page scores for comparison. Pixel change and pixel sim match ShiroDiff exactly. Its SSIM code isn't public; greyscale 11×11-block SSIM gets within about 0.05% of it.

## Limits
- A moved element still shows up as a change. It just scores lower, because only its edges differ. Recognising "this moved 16px" needs element positions from the page structure, which is the next step.
- The thresholds are hand-picked from one real PR and some synthetic tests, not tuned on a dataset.
