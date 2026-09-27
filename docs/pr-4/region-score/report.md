## Region report

**Whole-page composite (how ShiroDiff scores today): 93.63%** → needs a look (below 95%)
<sub>Pixel change 6.81% · SSIM 93.42% · Pixel sim 93.84%</sub>

**Region scoring: 🔴 Needs review** · worst is region 1 (severity 0.99)

![changed regions](annotated.png)

| # | Region (x, y, w×h) | Changed pixels | Colour shift (ΔE) | Severity | Likely |
|---|---|---|---|---|---|
| 1 | 232, 1242, 976×148 | 99.00% of region | 91.5 | 🔴 0.99 | colour change (#ffffff → #18181b) |

| # | Before | After |
|---|---|---|
| 1 | ![before](region-1-before.png) | ![after](region-1-after.png) |

<sub>Severity = √(share of the region that changed) × (colour shift ÷ 50, capped at 1). ≥ 0.30 needs review · ≥ 0.10 minor.</sub>
