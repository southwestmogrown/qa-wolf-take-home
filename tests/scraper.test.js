/**
 * tests/scraper.test.js
 * Contract tests for page extraction assumptions in scraper.js.
 * Run with: node --test tests/scraper.test.js
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { extractArticlesFromPage } = require("../scraper");

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
