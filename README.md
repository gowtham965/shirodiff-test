# ShiroDiff: what I tested, and how I'd help scale it

Hi Tarunya,

I'm Gowtham, an engineer moving into AI engineering. Before our call I installed ShiroDiff on this repo, ran it on five test PRs, and built a small prototype for the gaps I found.

**Short version:** ShiroDiff needs no config, and PR #1's full report arrived 40 seconds after I opened the PR. In my tests, the composite score rated two clearly visible changes above its 95% "usually safe" line, and a new section added at the bottom of a page scored 100%. My prototype flags all three.

---

## 1. What I tested

| PR | What changed | Should be | ShiroDiff composite | Region scoring (prototype) |
|---|---|---|---|---|
| [#1](https://github.com/gowtham965/shirodiff-test/pull/1) | Button blue → green, headline reworded, card spacing | Needs review | 🔴 Changed, but **97.38%** → above the 95% "usually safe" line ❌ | 🔴 Needs review ✅ |
| [#2](https://github.com/gowtham965/shirodiff-test/pull/2) | Card borders one shade darker | Minor or none | ✅ No visual changes, 99.91% ✅ | ✅ No meaningful change ✅ |
| [#3](https://github.com/gowtham965/shirodiff-test/pull/3) | Cards stack in one column (broken layout) | Needs review | 🔴 Changed, but **96.93%** → above the 95% "usually safe" line ❌ | 🔴 Needs review ✅ |
| [#4](https://github.com/gowtham965/shirodiff-test/pull/4) | New "Pricing" section added at y ≈ 1,242px (page grows to 1,454px) | Needs review | ✅ **No visual changes, 100%** ❌ | 🔴 Needs review ✅ |
| [#5](https://github.com/gowtham965/shirodiff-test/pull/5) | Control: same as #4, plus a subtitle change above the fold | Needs review, both changes | 🔴 Changed, but only the subtitle is diffed ❌ | 🔴 Needs review, both found ✅ |

**What works well:** no config file needed, the page to check was detected automatically, an "⏳ Analyzing…" comment appeared 4 seconds after I opened PR #1 and was replaced by the full report 36 seconds later, and the report is posted in the PR where every reviewer sees it.

---

## 2. What I found

1. **The composite underrates small but important changes.** It averages two whole-page scores, so a 136×48 button or a broken grid is diluted by white space (PR #3 changed only 0.86% of pixels).
2. **The new section at the bottom was never compared.** ShiroDiff takes full-page screenshots: in PR #5 the "after" image is 1440×1454 and includes the new section. But the "before" image is 1440×900, and the diff is 1440×900 ("Diffed at 1440×900"), so the new section, which starts at y ≈ 1,242px, is outside the diff. In PR #4, where that section was the only change, the result was "No visual changes" with every score at 100%.
3. **Moved looks the same as changed.** In PR #1 the cards only shifted, but the diff marks their text and borders in red, and the old and new headline text overlap.
4. **Trust.** It needs write access to the repo (for the `visualbot-assets` branch), and its README says it runs `npm install` and `npm run dev` on the PR's code.
5. **Small polish:** the comment is still signed "VisualBot".

---

## 3. Prototype: score each changed region

[`tools/region-score`](tools/region-score) takes a before and after screenshot, such as ShiroDiff's, and finds changed pixels with pixelmatch, the library ShiroDiff's README names. It groups changed pixels into regions, scores each one on how much of it changed and how strongly its colour shifted (CIE Lab colour difference), and lets the worst region decide.

![regions found in PR #1](docs/pr-1/region-score/annotated.png)

It pads the shorter screenshot to the taller one's height instead of cropping, so it flags the new section in PR #4 and PR #5 (severity 0.99). On PR #1 it flags the button (severity 0.96, `#155dfc` → `#00a63e`) and the headline (0.52), and scores the moved cards between 0.06 and 0.23 (minor or lower). **Its limit:** on PR #3 the verdict is right, but it lists seven scattered text regions instead of saying "the cards now stack". Step 2 below is aimed at this.

<sub>Full outputs: [PR #1](docs/pr-1/region-score/report.md) · [PR #2](docs/pr-2/region-score/report.md) · [PR #3](docs/pr-3/region-score/report.md) · [PR #4](docs/pr-4/region-score/report.md) · [PR #5](docs/pr-5/region-score/report.md). ShiroDiff doesn't store screenshots when it finds no change, so for PR #2 and PR #4 I took my own with Playwright at the same 1440px width (full-page for #4). On PR #2 the composite matches ShiroDiff's 99.91% exactly. PR #5 uses ShiroDiff's own screenshots.</sub>

---

## 4. How I'd help build and scale it

1. **Better signal (prototype done):** tune region scoring on a larger set of real PRs, then weight important areas (buttons, headlines, above the fold) more heavily.
2. **Say what changed, not just where:** use Playwright to record each element's position, size, text and styles in both versions, then report "button: blue → green" or "cards moved 16px", and tell a moved element apart from a changed one.
3. **AI summaries, measured properly:** send a vision model the region crops *plus* the measured facts, so it describes real changes instead of guessing. Return fixed-format JSON. Build a test set of PRs with known answers first, and measure how many real changes it catches and how many it makes up. If the AI call fails, still post the normal report.
4. **More repos:** detect Vite, Remix and monorepos (apps in `frontend/` or `apps/web`), and add an optional `.shirodiff.yml` for pages, env vars and logins.
5. **Reliable, cheaper runs:** builds on a durable job queue, throwaway containers with time and CPU limits, GitHub pass/fail checks, cached dependencies, and screenshotting Vercel/Netlify preview links instead of building.
6. **Trust and growth:** read-only access to repo contents by storing screenshots on your side, a short security page, and a "Powered by ShiroDiff" link in every comment.

**First steps:** file the issues above, test ShiroDiff on non-Next.js repos, then build 2 and 3 together, sharing the results with you before anything bigger.

---

## How I made this

I used AI for this work: [Claude Code](https://claude.com/claude-code), an AI coding assistant. It helped me set up the test repo and PRs, reverse-engineer how ShiroDiff calculates its scores, write the prototype and its tests, and draft this README. I decided what to test, installed ShiroDiff, directed each step and reviewed the results. Every ShiroDiff report and score here comes from actual runs.

---

Thanks for reading. I'd love to help build this.

**Gowtham Gowda** · [github.com/gowtham965](https://github.com/gowtham965)
