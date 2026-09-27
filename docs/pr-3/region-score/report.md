## Region report

**Whole-page composite (how ShiroDiff scores today): 96.82%** → looks safe (above the 95% line)
<sub>Pixel change 0.86% · SSIM 94.08% · Pixel sim 99.55%</sub>

**Region scoring: 🔴 Needs review** · worst is region 2 (severity 0.53)

![changed regions](annotated.png)

| # | Region (x, y, w×h) | Changed pixels | Colour shift (ΔE) | Severity | Likely |
|---|---|---|---|---|---|
| 1 | 232, 408, 976×244 | 3.00% of region | 34.5 | 🟠 0.13 | text or layout change |
| 2 | 592, 440, 123×13 | 28.00% of region | 84.8 | 🔴 0.53 | text or layout change |
| 3 | 926, 441, 234×47 | 8.00% of region | 68.2 | 🟠 0.28 | text or layout change |
| 4 | 259, 574, 123×13 | 28.00% of region | 84.8 | 🔴 0.53 | text or layout change |
| 5 | 259, 608, 343×14 | 16.00% of region | 53.4 | 🔴 0.40 | text or layout change |
| 6 | 232, 676, 976×110 | 3.00% of region | 26.8 | ✅ 0.09 | text or layout change |
| 7 | 259, 709, 234×47 | 8.00% of region | 68.2 | 🟠 0.28 | text or layout change |

| # | Before | After |
|---|---|---|
| 1 | ![before](region-1-before.png) | ![after](region-1-after.png) |
| 2 | ![before](region-2-before.png) | ![after](region-2-after.png) |
| 3 | ![before](region-3-before.png) | ![after](region-3-after.png) |
| 4 | ![before](region-4-before.png) | ![after](region-4-after.png) |
| 5 | ![before](region-5-before.png) | ![after](region-5-after.png) |
| 6 | ![before](region-6-before.png) | ![after](region-6-after.png) |
| 7 | ![before](region-7-before.png) | ![after](region-7-after.png) |

<sub>Severity = √(share of the region that changed) × (colour shift ÷ 50, capped at 1). ≥ 0.30 needs review · ≥ 0.10 minor.</sub>
