# QA Wolf Take-Home — HN Sort Order Validation

Validates that the first 100 articles on [Hacker News /newest](https://news.ycombinator.com/newest) are sorted from newest to oldest.

---

## Getting Started

**Prerequisites:** Node.js 18+

```bash
npm install
npx playwright install chromium
node index.js
```

---

## What It Does

Navigates HN's `/newest` feed across multiple pages (30 articles per page), collects the first 100 articles, and asserts that each article's timestamp is equal to or older than the one before it.

On **pass**, a summary confirms the article count and sort result.

On **fail**, each violation is reported with:
- The positions of the two out-of-order articles
- Both article titles
- Both parsed timestamps in human-readable UTC

---

## Architecture

Each module has one responsibility. `index.js` wires them together and contains no logic of its own.

```
index.js       Entry point — scrape → validate → report
config.js      All constants (URL, selectors, timeouts, article count)
scraper.js     Browser lifecycle, pagination, DOM extraction
validator.js   Pure sort-order logic, returns structured result
reporter.js    All console output, ANSI-formatted pass/fail summary
utils/
  time.js      Timestamp parsing and formatting
```

**Why this structure?** `validator.js` is pure — no browser, no I/O — which makes it trivially testable in isolation. `reporter.js` owning all output means the format can change (e.g. JSON for CI) without touching business logic.

---

## Key Design Decision: Timestamp Source

HN displays relative timestamps ("3 minutes ago", "2 hours ago") in the UI. Parsing these strings is ambiguous — multiple articles can share the same relative label, making precise sort comparison unreliable.

Instead, this implementation reads the **`title` attribute** on each `.age` anchor element:

```html
<span class="age">
  <a href="item?id=..." title="2024-01-15T14:23:07">3 minutes ago</a>
</span>
```

HN stores the absolute ISO 8601 timestamp here. Parsing this gives millisecond-precision comparison, which correctly handles ties (same-second articles are not flagged as violations) and avoids any ambiguity in relative string parsing.

---

## Equal Timestamps

Two articles published within the same second are valid — HN can post multiple items simultaneously. The validator treats `a.timestampMs === b.timestampMs` as passing, not a violation.

---

## Configuration

All tunable values live in `config.js`. No magic numbers in logic files.

| Constant | Default | Purpose |
|---|---|---|
| `ARTICLE_COUNT` | `100` | Number of articles to validate |
| `NAVIGATION_TIMEOUT_MS` | `15000` | Max wait for page navigation |
| `SELECTOR_TIMEOUT_MS` | `10000` | Max wait for DOM elements |
| `HN_NEWEST_URL` | `https://news.ycombinator.com/newest` | Target feed |

---

## What I'd Add With More Time

- **Unit test suite** (Jest or Node's built-in test runner) — the pure modules (`validator.js`, `utils/time.js`) are already structured for easy testing
- **JSON output mode** — a `--json` flag for CI pipeline consumption
- **Retry logic** — exponential backoff on navigation failures for flaky network conditions (very relevant to QA Wolf's zero-flake guarantee)
- **Headful mode flag** — `--headed` for debugging, headless for CI
- **Multiple feed comparison** — extend to validate `/newest` vs `/front` ordering differences
