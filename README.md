# QA Wolf Take-Home - HN Sort Order Validation

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

Walks HN's `/newest` pages (30 items per page), grabs the first 100 articles, and checks that each item is the same age or older than the one above it.

On **pass**, you get a short summary.

On **fail**, each violation includes:

- The positions of the two out-of-order articles
- Both article titles
- Both parsed timestamps in human-readable UTC

The scrape step retries transient failures with exponential backoff.

---

## Architecture

Each module has one job. `index.js` just wires them together.

```
index.js       Entry point — scrape → validate → report
config.js      All constants (URL, selectors, timeouts, article count)
scraper.js     Browser lifecycle, pagination, DOM extraction
validator.js   Pure sort-order logic, returns structured result
reporter.js    All console output, ANSI-formatted pass/fail summary
utils/
  time.js      Timestamp parsing and formatting
  retry.js     Generic async retry with exponential backoff
```

`validator.js` stays pure (no browser or I/O), so unit tests are easy. `reporter.js` owns output formatting, so changing output (for example JSON in CI) does not ripple into core logic.

---

## Timestamp Source

HN shows relative labels in the UI ("3 minutes ago", "2 hours ago"). Those are not reliable for strict ordering because many articles can share the same label.

Instead, this implementation reads the **`title` attribute** on each `.age` anchor element:

```html
<span class="age" title="2024-01-15T14:23:07 1705328587">
  <a href="item?id=...">3 minutes ago</a>
</span>
```

HN stores the absolute ISO 8601 timestamp in that attribute. Parsing it gives precise ordering and handles ties correctly (same-second items are not marked as violations).

---

## Equal Timestamps

Two articles with the same second-level timestamp are valid. The validator treats `a.timestampMs === b.timestampMs` as pass.

---

## Configuration

All tunable values live in `config.js`.

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

- Timestamp parsing/formatting edge cases (including impossible dates and invalid input)
- Retry behavior (backoff, callback isolation, type guards)
- Sort-order validator behavior and violation reporting
- Scraper DOM extraction checks (selector count mismatches, offset indexing)
- Scraper pagination behavior (multi-page collection, empty-page guard, missing More link)

---

## What I'd Add With More Time

- **JSON output mode** - `--json` for CI consumption
- **Failure artifacts** - screenshot/HTML capture when selectors drift
- **Headful mode flag** - `--headed` for local debugging
- **CLI overrides** - `--count`, `--timeout`, `--retries`
