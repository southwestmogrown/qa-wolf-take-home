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

  // Articles per HN page (this is a HN constant, not ours — but naming it
  // makes pagination logic readable and resilient to future changes)
  ARTICLES_PER_PAGE: 30,

  // Playwright navigation timeout in milliseconds
  NAVIGATION_TIMEOUT_MS: 15000,

  // How long to wait for the article list to appear after navigation
  SELECTOR_TIMEOUT_MS: 10000,

  // CSS selector for the timestamp anchor — the `title` attribute on the parent
  // `span.age` element contains the absolute ISO 8601 timestamp we parse for ordering
  AGE_SELECTOR: "span.age a",

  // CSS selector for article title links — used in failure output so we can
  // report which articles are out of order by name, not just index
  TITLE_SELECTOR: "span.titleline > a",

  // CSS selector for the "More" pagination link at the bottom of each page
  MORE_LINK_SELECTOR: "a.morelink",
};

module.exports = CONFIG;
