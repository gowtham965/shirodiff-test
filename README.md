# ShiroDiff: what I tested, and how I'd help scale it

Hi Tarunya,

I'm Gowtham, an engineer moving into AI engineering. Before our call I installed ShiroDiff on this repo, ran it on three test PRs, and built a small prototype for the main gap I found.

**Short version:** ShiroDiff gets the hard part right: setup takes 30 seconds and a PR gets a report in about 40 seconds. What limits it now is the signal: the composite score rated two real regressions as "usually safe". My prototype scores each changed region separately and gets all three test PRs right.

---

## 1. What I tested

| PR | What changed | Should be | ShiroDiff composite | Region scoring (prototype) |
|---|---|---|---|---|
| [#1](https://github.com/gowtham965/shirodiff-test/pull/1) | Button blue → green, headline reworded, card spacing | Needs review | 🔴 Changed, but **97.38%** → above the 95% "usually safe" line ❌ | 🔴 Needs review ✅ |
| [#2](https://github.com/gowtham965/shirodiff-test/pull/2) | Card borders one shade darker | Minor or none | ✅ No visual changes, 99.91% ✅ | ✅ No meaningful change ✅ |
| [#3](https://github.com/gowtham965/shirodiff-test/pull/3) | Cards stack in one column (broken layout) | Needs review | 🔴 Changed, but **96.93%** → above the 95% "usually safe" line ❌ | 🔴 Needs review ✅ |

**What works well:** zero-config setup, pages detected automatically, the slow work runs in the background (an "⏳ Analyzing…" comment after 4 seconds, full results about 36 seconds later), and every reviewer sees the report in the PR.

---

## 2. What I found

1. **The composite underrates small but important changes.** It averages two whole-page scores, so a 136×48 button or a broken grid is diluted by white space (PR #3 changed only 0.86% of pixels). SSIM also seems to work in greyscale, so a blue → green swap at similar brightness barely registers.
2. **Moved looks the same as changed.** In PR #1 the cards only shifted, but the diff paints them fully red, and the old and new headline text overlap.
3. **Trust.** It needs write access (for the `visualbot-assets` branch) and runs `npm install` on unknown code. Both will slow down adoption by companies.
4. **Small polish:** the comment is still signed "VisualBot", and screenshots are 1440×900 while the README says full-page.

---

## 3. Prototype: score each changed region

[`tools/region-score`](tools/region-score) runs on ShiroDiff's own screenshots and uses the same libraries (pixelmatch + pngjs). It groups changed pixels into regions, scores each one on how much of it changed and how strongly its colour shifted (measured the way people see colour), and lets the worst region decide. It takes about 0.3 seconds per page.

![regions found in PR #1](docs/pr-1/region-score/annotated.png)

On PR #1 it finds the button (severity 0.96, `#155dfc` → `#00a63e`) and the headline (0.52), and rates the moved cards as minor. **Its limit:** on PR #3 the verdict is right, but it lists scattered text regions instead of saying "the cards now stack". That needs element positions from the page (step 2 below).

<sub>Full outputs: [PR #1](docs/pr-1/region-score/report.md) · [PR #2](docs/pr-2/region-score/report.md) · [PR #3](docs/pr-3/region-score/report.md). ShiroDiff doesn't store screenshots when nothing changed, so for PR #2 I took my own with Playwright at 1440×900. The composite on them matches ShiroDiff's 99.91% exactly.</sub>

---

## 4. How I'd help build and scale it

1. **Better signal (prototype done):** tune region scoring on a larger set of real PRs, then weight important areas (buttons, headlines, above the fold) more heavily.
2. **Say what changed, not just where:** use Playwright to record each element's position, size, text and styles in both versions, then report "button: blue → green" or "cards moved 16px", and tell a moved element apart from a changed one. *About a weekend.*
3. **AI summaries, measured properly:** send a vision model the region crops *plus* the measured facts, so it describes real changes instead of guessing. Return fixed-format JSON. Build a test set of PRs with known answers first, and measure how many real changes it catches and how many it makes up. If the AI call fails, still post the normal report. Rough cost: under 4¢ per PR, depending on the model. *About a week.*
4. **More repos:** detect Vite, Remix and monorepos (apps in `frontend/` or `apps/web`), and add an optional `.shirodiff.yml` for pages, env vars and logins, since most real apps won't start without them.
5. **Reliable, cheaper runs:** a durable job queue (if it isn't one already), throwaway containers with time and CPU limits, GitHub pass/fail checks, cached dependencies, and screenshotting Vercel/Netlify preview links instead of building.
6. **Trust and growth:** read-only access by storing screenshots on your side, a short security page, and a "Powered by ShiroDiff" link in every comment.

**First steps:** file the issues above, test ShiroDiff on non-Next.js repos, then build 2 and 3 together, sharing the results with you before anything bigger.

---

## How I made this

I used AI for this work: [Claude Code](https://claude.com/claude-code), an AI coding assistant. It helped me set up the test repo and PRs, reverse-engineer how ShiroDiff calculates its scores, write the prototype and its tests, and draft this README. I decided what to test, installed ShiroDiff, directed each step and reviewed the results. Every ShiroDiff report and score here comes from actual runs; the AI summary cost is an estimate.

---

Thanks for reading. I'd love to help build this.

**Gowtham Gowda** · [github.com/gowtham965](https://github.com/gowtham965)
