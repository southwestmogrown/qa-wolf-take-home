/**
 * index.js
 * Entry point. Wires scraper → validator → reporter.
 * This file contains no logic of its own — each concern lives in its module.
 *
 * Run with: node index.js
 */

const CONFIG = require("./config");
const { scrapeArticles } = require("./scraper");
const { validateSortOrder } = require("./validator");
const { withRetry } = require("./utils/retry");
const {
  reportScrapeStart,
  reportScrapeComplete,
  reportRetryAttempt,
  reportValidationResult,
  reportFatalError,
} = require("./reporter");

async function main() {
  reportScrapeStart(CONFIG.HN_NEWEST_URL, CONFIG.ARTICLE_COUNT);

  const articles = await withRetry(scrapeArticles, {
    attempts: CONFIG.RETRY_ATTEMPTS,
    delayMs: CONFIG.RETRY_DELAY_MS,
    backoffFactor: CONFIG.RETRY_BACKOFF_FACTOR,
    onRetry: reportRetryAttempt,
  });
  reportScrapeComplete(articles.length);

  const result = validateSortOrder(articles);
  reportValidationResult(result);
}

main().catch((error) => {
  reportFatalError(error);
});
