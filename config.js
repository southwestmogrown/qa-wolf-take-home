/**
 * config.js
 * Central configuration for the HN sort validation suite.
 * Adjust these values without touching test logic.
 */

const CONFIG = {
  // Target URL — /newest lists submissions in reverse chronological order
  HN_NEWEST_URL: "https://news.ycombinator.com/newest",

  // Number of articles to validate. HN paginates at 30 per page,
  // so 100 articles requires navigating across 4 pages.
  ARTICLE_COUNT: 100,

  // Playwright navigation timeout in milliseconds
  NAVIGATION_TIMEOUT_MS: 30000,

  // How long to wait for the article list to appear after navigation
  SELECTOR_TIMEOUT_MS: 15000,

  // User agent string passed to the browser context.
  // Without this, Playwright's default headless UA is often detected and blocked.
  // This mimics a current Chrome release on Windows.
  USER_AGENT:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",

  // CSS selector for the timestamp anchor — the `title` attribute on the parent
  // `span.age` element contains the absolute ISO 8601 timestamp we parse for ordering
  AGE_SELECTOR: "span.age a",

  // CSS selector for article title links — used in failure output so we can
  // report which articles are out of order by name, not just index
  TITLE_SELECTOR: "span.titleline > a",

  // CSS selector for the "More" pagination link at the bottom of each page
  MORE_LINK_SELECTOR: "a.morelink",

  // Retry configuration for the scrape operation.
  // On a network failure the full scrape is retried up to RETRY_ATTEMPTS times
  // with exponential backoff: delay doubles after each failed attempt.
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 2000, // wait before first retry
  RETRY_BACKOFF_FACTOR: 2, // multiplier applied to delay on each subsequent retry
};

module.exports = CONFIG;
