/**
 * tests/scraper.test.js
 * Contract tests for page extraction assumptions in scraper.js.
 * Run with: node --test tests/scraper.test.js
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { extractArticlesFromPage, collectArticles } = require("../scraper");

function mockPage(extractionResult) {
  return {
    evaluate: async () => extractionResult,
  };
}

test("throws when timestamp and title selector counts diverge", async () => {
  const page = mockPage({
    ageCount: 2,
    titleCount: 1,
    rawArticles: [
      { rawTimestamp: "2024-01-15T14:23:07", title: "Title A" },
      { rawTimestamp: "2024-01-15T14:22:07", title: "" },
    ],
  });

  await assert.rejects(
    () => extractArticlesFromPage(page, 0),
    /Selector mismatch/,
  );
});

test("maps extracted rows to indexed, parsed articles", async () => {
  const page = mockPage({
    ageCount: 2,
    titleCount: 2,
    rawArticles: [
      { rawTimestamp: "2024-01-15T14:23:07", title: "Title A" },
      { rawTimestamp: "2024-01-15T14:22:07", title: "Title B" },
    ],
  });

  const articles = await extractArticlesFromPage(page, 10);

  assert.equal(articles.length, 2);
  assert.equal(articles[0].index, 11);
  assert.equal(articles[1].index, 12);
  assert.equal(articles[0].title, "Title A");
  assert.equal(typeof articles[0].timestampMs, "number");
  assert.ok(articles[0].timestampMs > articles[1].timestampMs);
});

// ---------------------------------------------------------------------------
// Helpers for collectArticles
// ---------------------------------------------------------------------------

/**
 * Builds a mock page for collectArticles tests.
 * pages: array of extraction results (one per page)
 * The "More" link is present for all pages except the last.
 */
function buildMockPage(pages) {
  let pageIndex = 0;
  return {
    waitForSelector: async () => {},
    waitForLoadState: async () => {},
    evaluate: async () => {
      const result = pages[pageIndex];
      return result;
    },
    locator: () => ({
      count: async () => (pageIndex < pages.length - 1 ? 1 : 0),
      click: async () => { pageIndex++; },
    }),
  };
}

function makePageData(articles) {
  return {
    ageCount: articles.length,
    titleCount: articles.length,
    rawArticles: articles,
  };
}

// ---------------------------------------------------------------------------
// collectArticles tests
// ---------------------------------------------------------------------------

test("collects exactly targetCount articles from a single page", async () => {
  const rawArticles = Array.from({ length: 30 }, (_, i) => ({
    rawTimestamp: `2024-01-15T${String(14 - i % 14).padStart(2, "0")}:00:00`,
    title: `Article ${i + 1}`,
  }));

  const page = buildMockPage([makePageData(rawArticles)]);
  const articles = await collectArticles(page, 5);

  assert.equal(articles.length, 5);
  assert.equal(articles[0].index, 1);
  assert.equal(articles[4].index, 5);
});

test("collects articles across two pages when target spans pages", async () => {
  const makeArticles = (count, startTs) =>
    Array.from({ length: count }, (_, i) => ({
      rawTimestamp: `2024-01-15T${String(23 - (i % 24)).padStart(2, "0")}:00:00`,
      title: `Article ${startTs + i}`,
    }));

  const page1Data = makePageData(makeArticles(30, 0));
  const page2Data = makePageData(makeArticles(30, 30));

  const page = buildMockPage([page1Data, page2Data]);
  const articles = await collectArticles(page, 35);

  assert.equal(articles.length, 35);
  assert.equal(articles[0].index, 1);
  assert.equal(articles[34].index, 35);
});

test("throws when a page returns zero articles (empty page guard)", async () => {
  const page = buildMockPage([makePageData([])]);
  await assert.rejects(
    () => collectArticles(page, 5),
    /No articles found on page/,
  );
});

test("throws when More link is missing before reaching target count", async () => {
  const rawArticles = Array.from({ length: 5 }, (_, i) => ({
    rawTimestamp: `2024-01-15T${String(14 - i).padStart(2, "0")}:00:00`,
    title: `Article ${i + 1}`,
  }));

  // Only 5 articles available, no More link, but we need 10
  const page = buildMockPage([makePageData(rawArticles)]);
  await assert.rejects(
    () => collectArticles(page, 10),
    /Pagination failed/,
  );
});

test("stops exactly at targetCount and does not over-collect", async () => {
  const rawArticles = Array.from({ length: 30 }, (_, i) => ({
    rawTimestamp: `2024-01-15T${String(23 - i % 23).padStart(2, "0")}:00:00`,
    title: `Article ${i + 1}`,
  }));

  const page = buildMockPage([makePageData(rawArticles)]);
  const articles = await collectArticles(page, 30);

  assert.equal(articles.length, 30);
});
