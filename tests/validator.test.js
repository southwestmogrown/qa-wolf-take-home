/**
 * tests/validator.test.js
 * Unit tests for the pure sort-order validation logic.
 * Run with: node --test tests/validator.test.js
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { validateSortOrder } = require("../validator");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds a minimal Article object for test use.
 * @param {number} index - 1-based position
 * @param {number} timestampMs - Unix ms (higher = newer)
 * @param {string} [title]
 */
function article(index, timestampMs, title = `Article ${index}`) {
  return { index, timestampMs, title, rawTimestamp: new Date(timestampMs).toISOString().replace(/\.\d{3}Z$/, "") };
}

// Fixed reference timestamps (ms) — just integers, no real dates needed
const T1 = 1_700_000_000_000; // newest
const T2 = T1 - 60_000;      // 1 min older
const T3 = T2 - 60_000;      // 2 min older
const T4 = T3 - 60_000;      // 3 min older

// ---------------------------------------------------------------------------
// Happy-path tests
// ---------------------------------------------------------------------------

test("passes when all articles are sorted newest to oldest", () => {
  const articles = [
    article(1, T1),
    article(2, T2),
    article(3, T3),
    article(4, T4),
  ];
  const result = validateSortOrder(articles);
  assert.equal(result.passed, true);
  assert.equal(result.checked, 4);
  assert.deepEqual(result.violations, []);
});

test("passes with a single article", () => {
  const result = validateSortOrder([article(1, T1)]);
  assert.equal(result.passed, true);
  assert.equal(result.checked, 1);
  assert.deepEqual(result.violations, []);
});

test("passes when two adjacent articles have equal timestamps (same-second publish)", () => {
  const articles = [
    article(1, T1),
    article(2, T1), // same timestamp — valid per spec
    article(3, T2),
  ];
  const result = validateSortOrder(articles);
  assert.equal(result.passed, true);
  assert.deepEqual(result.violations, []);
});

test("passes when all articles share the same timestamp", () => {
  const articles = [article(1, T1), article(2, T1), article(3, T1)];
  const result = validateSortOrder(articles);
  assert.equal(result.passed, true);
});

// ---------------------------------------------------------------------------
// Violation detection tests
// ---------------------------------------------------------------------------

test("fails and reports one violation when two articles are out of order", () => {
  const articles = [
    article(1, T2), // older first — wrong
    article(2, T1), // newer second — wrong
  ];
  const result = validateSortOrder(articles);
  assert.equal(result.passed, false);
  assert.equal(result.violations.length, 1);

  const v = result.violations[0];
  assert.equal(v.index, 2);
  assert.equal(v.earlier.index, 1);
  assert.equal(v.later.index, 2);
});

test("reports all violations in a single pass — does not fail fast", () => {
  // Every consecutive pair is reversed → 3 violations
  const articles = [
    article(1, T4),
    article(2, T3),
    article(3, T2),
    article(4, T1),
  ];
  const result = validateSortOrder(articles);
  assert.equal(result.passed, false);
  assert.equal(result.violations.length, 3);
});

test("reports only the out-of-order pairs when violations are non-consecutive", () => {
  const articles = [
    article(1, T1), // ok
    article(2, T2), // ok
    article(3, T1), // violation: T1 > T2 (newer than prev)
    article(4, T4), // ok (T4 < T1)
  ];
  const result = validateSortOrder(articles);
  assert.equal(result.passed, false);
  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].index, 3);
});

test("violation message identifies the article titles and timestamps", () => {
  const articles = [
    article(1, T2, "Older Article"),
    article(2, T1, "Newer Article"),
  ];
  const result = validateSortOrder(articles);
  const msg = result.violations[0].message;
  assert.match(msg, /Newer Article/);
  assert.match(msg, /Older Article/);
});

// ---------------------------------------------------------------------------
// Edge cases / guard clauses
// ---------------------------------------------------------------------------

test("throws when called with an empty array", () => {
  assert.throws(
    () => validateSortOrder([]),
    /non-empty array/
  );
});

test("throws when called with a non-array value", () => {
  assert.throws(() => validateSortOrder(null));
  assert.throws(() => validateSortOrder("articles"));
  assert.throws(() => validateSortOrder(42));
});

test("checked count matches the number of articles passed in", () => {
  const articles = Array.from({ length: 10 }, (_, i) =>
    article(i + 1, T1 - i * 1000)
  );
  const result = validateSortOrder(articles);
  assert.equal(result.checked, 10);
});

test("throws when an article has NaN timestampMs", () => {
  const articles = [
    article(1, T1),
    { index: 2, title: "Bad", rawTimestamp: "2024-01-01T00:00:00", timestampMs: NaN },
  ];
  assert.throws(() => validateSortOrder(articles), /Invalid timestampMs/);
});

test("throws when an article has undefined timestampMs", () => {
  const articles = [
    article(1, T1),
    { index: 2, title: "Bad", rawTimestamp: "2024-01-01T00:00:00", timestampMs: undefined },
  ];
  assert.throws(() => validateSortOrder(articles), /Invalid timestampMs/);
});

test("detects a violation at the very first pair", () => {
  const articles = [article(1, T2), article(2, T1), article(3, T3)];
  const result = validateSortOrder(articles);
  assert.equal(result.passed, false);
  assert.equal(result.violations[0].index, 2);
});

test("detects a violation at the last pair in a large list", () => {
  const articles = Array.from({ length: 100 }, (_, i) =>
    article(i + 1, T1 - i * 1000)
  );
  // Swap last two to create a violation at position 100
  articles[99] = article(100, T1);
  const result = validateSortOrder(articles);
  assert.equal(result.passed, false);
  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].index, 100);
});
