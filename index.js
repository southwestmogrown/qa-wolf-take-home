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
const {
  reportScrapeStart,
  reportScrapeComplete,
  reportValidationResult,
  reportFatalError,
} = require("./reporter");

async function main() {
  reportScrapeStart(CONFIG.HN_NEWEST_URL, CONFIG.ARTICLE_COUNT);

  const articles = await scrapeArticles();
  reportScrapeComplete(articles.length);

  const result = validateSortOrder(articles);
  reportValidationResult(result);
}

main().catch((error) => {
  reportFatalError(error);
});
