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

The scraper also includes retry with exponential backoff for transient failures.

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
<span class="age" title="2024-01-15T14:23:07 1705328587">
  <a href="item?id=...">3 minutes ago</a>
</span>
```

HN stores the absolute ISO 8601 timestamp here. Parsing this gives millisecond-precision comparison, which correctly handles ties (same-second articles are not flagged as violations) and avoids any ambiguity in relative string parsing.

---

## Equal Timestamps

Two articles published within the same second are valid — HN can post multiple items simultaneously. The validator treats `a.timestampMs === b.timestampMs` as passing, not a violation.

---

## Configuration

All tunable values live in `config.js`. No magic numbers in logic files.

| Constant                | Default                               | Purpose                        |
| ----------------------- | ------------------------------------- | ------------------------------ |
| `ARTICLE_COUNT`         | `100`                                 | Number of articles to validate |
| `NAVIGATION_TIMEOUT_MS` | `30000`                               | Max wait for page navigation   |
| `SELECTOR_TIMEOUT_MS`   | `15000`                               | Max wait for DOM elements      |
| `HN_NEWEST_URL`         | `https://news.ycombinator.com/newest` | Target feed                    |
| `RETRY_ATTEMPTS`        | `3`                                   | Total scrape attempts          |
| `RETRY_DELAY_MS`        | `2000`                                | Initial retry delay            |
| `RETRY_BACKOFF_FACTOR`  | `2`                                   | Exponential retry multiplier   |

---

## Test Coverage

```bash
npm test
```

Current suite includes:

- Timestamp parsing/formatting edge cases
- Retry behavior and failure semantics
- Sort-order validator correctness and violation reporting
- Scraper extraction contract checks (selector count mismatches)

---

## What I'd Add With More Time

- **JSON output mode** — a `--json` flag for CI pipeline consumption
- **Screenshot/HTML artifact capture on failure** — speed up triage when selectors drift
- **Headful mode flag** — `--headed` for debugging, headless for CI
- **CLI flags for article count and timeouts** — e.g., `--count`, `--timeout`, `--retries`
