# ShiroDiff: what I tested, and how I'd help scale it

Hi Tarunya,

I'm Gowtham, an engineer moving into AI engineering. Before our call I installed ShiroDiff on this repo and ran it on a real pull request. This README covers what I saw, what I'd improve, and how I could help build and scale it.

**Short version:** ShiroDiff gets the hard part right: setup takes 30 seconds and a PR gets a report within a minute. What limits it now is the quality of the signal (the score passed a PR that changed the main button's colour) and trust (it runs unknown code and needs write access). Below is a step-by-step plan for both, and how I'd help build it.

---

## 1. What I tested

This repo is a small Next.js landing page. I installed ShiroDiff on this repo only and opened [PR #1](https://github.com/gowtham965/shirodiff-test/pull/1) with three deliberate changes:

| Change | Before | After |
|---|---|---|
| Headline text | "Ask the Python docs anything" | "Ask the Python docs, get cited answers" |
| Main button colour | Blue | Green |
| Space between the feature cards | `gap-6` (24px) | `gap-10` (40px) |

### What ShiroDiff reported

| | |
|---|---|
| Time from opening the PR to the full report | **About 40 seconds** (a "⏳ Analyzing…" placeholder appeared after 4 seconds) |
| Pages checked | 1 (`/`, detected automatically) |
| Pixel change | **1.54%** (20,008 of 1,296,000 pixels) |
| SSIM | **96.04%** |
| Composite score | **97.38%** |
| Result | 🔴 Changed |

| Before | After | Diff (changed pixels in red) |
|---|---|---|
| ![before](docs/pr-1/before.png) | ![after](docs/pr-1/after.png) | ![diff](docs/pr-1/diff.png) |

It caught all three changes. This is one PR on one page, so treat these as first impressions, not a benchmark.

---

## 2. What I noticed

1. **The score would have let this PR through.** Your README calls a composite above 95% "usually safe", and this PR scored 97.38% even though the main call-to-action button changed colour completely. Changes that matter most often cover few pixels, so any score based on "how much of the page changed" will underrate them.
2. **A moved element looks the same as a changed one.** The cards shifted 16px sideways, and the diff paints both cards red as if their content had changed. The old and new headline text also overlap in red, which is hard to read. A reviewer has to open the before and after images and compare them by eye, which is the work the tool is meant to save.
3. **It needs write access to the repo.** Screenshots go to a `visualbot-assets` branch in my repo. Many companies won't give a new tool write access, even though read access would be enough if screenshots were stored elsewhere.
4. **It builds and runs unknown code.** `npm install` can run any script in a repo's `package.json`. At scale, every run needs to be isolated from the others and from your servers.
5. **Small polish:** the PR comment is still signed "VisualBot", and the footer mentions scores "ported from GodComet's visual auditor".

What already works well: setup takes 30 seconds with no config, it finds the pages to check automatically, it already does the slow work in the background (the "⏳ Analyzing…" comment appeared after 4 seconds and was replaced with the results about 36 seconds later), the results come back fast, and the report arrives as a PR comment so every reviewer sees it.

---

## 3. How ShiroDiff works today

```
PR opened or updated
  → GitHub webhook
  → build the base branch and the PR branch (npm install, npm run dev)
  → Playwright screenshot of each page at 1440×900
  → pixelmatch + SSIM → diff image + scores
  → PR comment with before / after / diff
```

---

## 4. How I'd help scale and build it

These are ordered by what breaks first as more teams install it. Each step is a piece of work I could take on.

### Step 1: A safe, reliable runner
- **Make sure the background work runs on a durable queue.** ShiroDiff already answers GitHub fast and builds in the background. What I can't see from outside is *how*. If builds run as tasks inside the web server, a burst of PRs lands on one machine, and a restart mid-build leaves PRs stuck on "Analyzing…" forever. A durable job queue with separate workers keeps jobs through restarts, retries failures, and lets you add workers as traffic grows. If this is already in place, this step is done.
- Handle stuck jobs: if a build hangs or a worker dies, time it out and update the PR comment with a clear error instead of leaving "Analyzing…" up.
- Run each build in a **fresh container that is deleted afterwards**, with CPU, memory and time limits, and with the network switched off once dependencies are installed.
- Report a **GitHub check** (pending, pass or fail) alongside the comment, so teams can require it before merging.
- Record, for every run, how long it took, whether it succeeded, and why it failed. This data should drive the rest of the roadmap.

### Step 2: Cheaper and faster runs
- **Screenshot preview deploys when they exist.** Many Next.js teams already get a Vercel or Netlify preview link per PR. ShiroDiff could listen for GitHub's deployment events and screenshot that link, skipping the build entirely. That's much cheaper, and it works with any framework.
- **Cache dependencies** based on the lockfile, so `npm install` doesn't run from scratch every time.
- **Reuse screenshots of the base branch.** `main` rarely changes between PRs, so save its screenshots per commit and share them across PRs.

### Step 3: Work on real-world repos
- Detect the framework, the package manager and the app's folder automatically: Vite, Remix, Nuxt and monorepos where the app lives in `apps/web` or `frontend/`.
- Add an optional `.shirodiff.yml` for pages to check, screen sizes, environment variables and test logins. **Most real apps won't start without env vars or a database,** so this is likely the biggest cause of failed runs.

### Step 4: A better signal: compare elements, not only pixels
This addresses points 1 and 2 above.
- **Use the page structure.** Playwright can read each element's position, size, text and styles. Comparing before and after element by element shows exactly what happened: "moved 16px right", "colour changed", "text changed". It also shows when a card only moved and its contents didn't change.
- **Group changed pixels into regions** and score each region by importance. A button, a headline or anything above the fold counts for more than a footer, so a small but important change can't hide behind a high overall score.
- Reduce false alarms: turn off animations, wait for fonts and network requests to finish, hide areas that always change (dates, ads, avatars), and let teams set their own thresholds.

### Step 5: AI change summaries, measured properly
This is on your roadmap, and it's where my background fits best.
- Give a vision model the before and after crops of each changed region, plus the element-level changes from step 4, so it describes real changes instead of guessing. For example: *"Get started button: blue → green. Headline reworded. Feature cards 16px further apart."*
- **Build an evaluation set** from real PRs with human-written descriptions of what changed. Measure how many real changes the summary mentions and how many it makes up, so every prompt or model change is judged on data. An AI summary is only useful if reviewers trust it.
- Rate each change by how serious it is (layout break, style change, text change), so teams can auto-approve PRs that only have small changes.

### Step 6: Trust and growth
- **Ask for read-only access** by storing screenshots in ShiroDiff's own storage instead of the user's repo.
- Publish a short security page covering isolation, what is stored and for how long, and consider open-sourcing the runner. Companies will need this before installing it on private code.
- **Every PR comment is advertising.** Add a "Powered by ShiroDiff" link and list the app on GitHub Marketplace.
- Keep public repos free, and charge for private repos, teams, extra pages and screen sizes, and AI summaries.

---

## 5. What I'd do first

A two-week prototype for steps 4 and 5, since that's where ShiroDiff can pull furthest ahead of pixel-only tools:
1. Collect 20–30 real PRs with visual changes and write down what actually changed in each one.
2. Add an element-level comparison next to the current pixel diff.
3. Generate AI summaries from both, and measure how many real changes they catch and how many they make up.
4. Share the results and the example PR comments with you before building anything bigger.

---

Thanks for reading. I'd love to help build this.

**Gowtham Gowda** · [github.com/gowtham965](https://github.com/gowtham965)

---

<sub>About this repo: a small Next.js page used only to test ShiroDiff. Run it with `npm install && npm run dev`.</sub>
