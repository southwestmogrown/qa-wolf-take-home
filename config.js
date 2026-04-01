/**
 * config.js
 * Shared constants for scraping and validation.
 */

const CONFIG = {
  // /newest should be reverse chronological
  HN_NEWEST_URL: "https://news.ycombinator.com/newest",

  // HN shows 30 per page, so 100 spans 4 pages
  ARTICLE_COUNT: 100,

  // Playwright navigation timeout in milliseconds
  NAVIGATION_TIMEOUT_MS: 30000,

  // How long to wait for the article list to appear after navigation
  SELECTOR_TIMEOUT_MS: 15000,

  // Avoid Playwright's default headless UA to reduce bot blocks
  USER_AGENT:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",

  // Timestamp anchor; parent span.age has the absolute timestamp in title
  AGE_SELECTOR: "span.age a",

  // Article headline links (used in violation output)
  TITLE_SELECTOR: "span.titleline > a",

  // CSS selector for the "More" pagination link at the bottom of each page
  MORE_LINK_SELECTOR: "a.morelink",

  // Retry config for transient scrape failures
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 2000, // wait before first retry
  RETRY_BACKOFF_FACTOR: 2, // multiplier applied to delay on each subsequent retry
};

module.exports = CONFIG;
