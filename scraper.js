/**
 * scraper.js
 * Responsible for all browser interaction: launching Playwright, navigating
 * HN's paginated /newest feed, and extracting structured article data.
 *
 * This module owns the browser lifecycle. It opens, uses, and closes the
 * browser — callers receive clean data, not Playwright handles.
 *
 * Exports:
 *   scrapeArticles()         - Full end-to-end scrape (browser + pagination)
 *   collectArticles()        - Pagination logic only; accepts a mock page for unit tests
 *   extractArticlesFromPage() - Single-page DOM extraction; accepts a mock page for unit tests
 */

const { chromium } = require("playwright");
const CONFIG = require("./config");
const { parseHNTimestamp } = require("./utils/time");

/**
 * @typedef {Object} Article
 * @property {number}  index       - 1-based position as it appeared on HN
 * @property {string}  title       - Article headline text
 * @property {string}  rawTimestamp - Raw ISO string from the `title` attribute
 * @property {number}  timestampMs  - Parsed Unix ms for sort comparison
 */

/**
 * Extracts article data from the current page state.
 * Called once per page during pagination — returns only the articles
 * visible on that page, not the full accumulated list.
 *
 * We evaluate inside the page context so Playwright doesn't have to make
 * a separate CDP call per element, which keeps scraping fast and reduces
 * the chance of stale element handles across paginations.
 *
 * @param {import('playwright').Page} page
 * @param {number} offset - How many articles have been collected so far,
 *                          used to assign globally correct 1-based indexes
 * @returns {Promise<Article[]>}
 * @throws {Error} If the number of age elements and title elements on the page differs
 * @throws {Error} If any article's title text is empty
 */
async function extractArticlesFromPage(page, offset) {
  const extraction = await page.evaluate(
    ({ ageSelector, titleSelector }) => {
      const ageElements = Array.from(document.querySelectorAll(ageSelector));
      const titleElements = Array.from(
        document.querySelectorAll(titleSelector),
      );

      return {
        ageCount: ageElements.length,
        titleCount: titleElements.length,
        rawArticles: ageElements.map((ageEl, i) => ({
          // The `title` attribute is on the parent span.age element
          // Format is: "ISO_TIMESTAMP UNIX_SECONDS" - we extract just the ISO part
          rawTimestamp: (ageEl.parentElement.getAttribute("title") || "").split(
            " ",
          )[0],
          title: titleElements[i] ? titleElements[i].innerText.trim() : "",
        })),
      };
    },
    {
      ageSelector: CONFIG.AGE_SELECTOR,
      titleSelector: CONFIG.TITLE_SELECTOR,
    },
  );

  if (extraction.ageCount !== extraction.titleCount) {
    throw new Error(
      `Selector mismatch: found ${extraction.ageCount} timestamps but ${extraction.titleCount} titles on the page. ` +
        `Selectors may be outdated.`,
    );
  }

  // Parse timestamps in Node context (cleaner error handling than inside evaluate)
  return extraction.rawArticles.map((raw, i) => {
    if (!raw.title) {
      throw new Error(
        `Missing article title at page offset ${offset + i + 1}.`,
      );
    }

    const timestampMs = parseHNTimestamp(raw.rawTimestamp);
    return {
      index: offset + i + 1,
      title: raw.title,
      rawTimestamp: raw.rawTimestamp,
      timestampMs,
    };
  });
}

/**
 * Paginates through HN's /newest feed and collects exactly `targetCount`
 * articles. Separated from browser setup so it can be unit-tested with a
 * mock page object.
 *
 * @param {import('playwright').Page} page - An already-navigated Playwright page
 * @param {number} targetCount - How many articles to collect
 * @returns {Promise<Article[]>} Exactly targetCount articles in page order
 * @throws {Error} If a page yields zero articles (bot-detection soft-block or selector drift)
 * @throws {Error} If the "More" pagination link is absent before targetCount is reached
 */
async function collectArticles(page, targetCount) {
  const articles = [];

  while (articles.length < targetCount) {
    await page.waitForSelector(CONFIG.AGE_SELECTOR);

    const pageArticles = await extractArticlesFromPage(page, articles.length);

    // Guard against empty pages — indicates bot-detection soft-block or selector drift
    if (pageArticles.length === 0) {
      throw new Error(
        `No articles found on page after collecting ${articles.length}. ` +
          `Possible bot detection or selector drift.`,
      );
    }

    const needed = targetCount - articles.length;

    // Slice to exactly what we need — the last page may have more than required
    articles.push(...pageArticles.slice(0, needed));

    if (articles.length >= targetCount) break;

    // Navigate to the next page. If "More" is missing before we hit our
    // target count, HN has fewer articles available than expected.
    const moreLink = page.locator(CONFIG.MORE_LINK_SELECTOR);
    const moreLinkCount = await moreLink.count();

    if (moreLinkCount === 0) {
      throw new Error(
        `Pagination failed: reached end of HN /newest after ${articles.length} articles ` +
          `but needed ${targetCount}. HN may have fewer articles available.`,
      );
    }

    // Click then wait — avoids the race condition in the deprecated
    // Promise.all([waitForNavigation(), click()]) pattern where the navigation
    // event could fire before the listener was fully attached.
    await moreLink.click();
    await page.waitForLoadState("domcontentloaded");
  }

  return articles;
}

/**
 * Launches a Playwright browser, navigates HN's /newest feed, and collects
 * exactly CONFIG.ARTICLE_COUNT articles by paginating as needed.
 *
 * Uses headless Chromium. Browser is always closed in a finally block so
 * the process doesn't hang if an error occurs mid-scrape.
 *
 * @returns {Promise<Article[]>} Exactly ARTICLE_COUNT articles in page order
 */
async function scrapeArticles() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ userAgent: CONFIG.USER_AGENT });
  const page = await context.newPage();

  page.setDefaultTimeout(CONFIG.SELECTOR_TIMEOUT_MS);
  page.setDefaultNavigationTimeout(CONFIG.NAVIGATION_TIMEOUT_MS);

  try {
    await page.goto(CONFIG.HN_NEWEST_URL, { waitUntil: "domcontentloaded" });
    return await collectArticles(page, CONFIG.ARTICLE_COUNT);
  } finally {
    // Always close the browser — even if scraping throws — so the process exits cleanly
    await browser.close();
  }
}

module.exports = { scrapeArticles, extractArticlesFromPage, collectArticles };
