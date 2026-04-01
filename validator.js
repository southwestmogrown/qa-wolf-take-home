/**
 * validator.js
 * Pure validation logic — no browser, no I/O, no side effects.
 * Takes an array of articles and returns a structured result describing
 * whether they are sorted correctly, and exactly where any violations occur.
 *
 * Keeping this module pure makes it trivially unit-testable in isolation.
 */

/**
 * @typedef {Object} SortViolation
 * @property {number} index         - 1-based position of the *later* article in the violation pair
 * @property {Object} earlier       - The article that appeared first on the page
 * @property {Object} later         - The article that appeared second but has a newer timestamp
 * @property {string} message       - Human-readable description of the violation
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean}          passed     - True if all articles are correctly sorted
 * @property {number}           checked    - Total number of articles evaluated
 * @property {SortViolation[]}  violations - All detected sort order violations (empty if passed)
 */

/**
 * Validates that an array of HN articles is sorted from newest to oldest
 * (i.e., descending by timestampMs).
 *
 * Equal timestamps are treated as valid — HN can publish multiple articles
 * within the same second, and that is not a sort violation.
 *
 * All violations are collected before returning, rather than failing fast,
 * so that a single run gives a complete picture of the page's sort state.
 *
 * @param {import('./scraper').Article[]} articles
 * @returns {ValidationResult}
 */

function validateSortOrder(articles) {
  if (!Array.isArray(articles) || articles.length === 0) {
    throw new Error("validateSortOrder requires a non-empty array of articles.");
  }

  const violations = [];

  for (let i = 1; i < articles.length; i++) {
    const prev = articles[i - 1];
    const curr = articles[i];

    // A violation occurs when a later article is *newer* than the one before it.
    // Newer = higher timestampMs value.
    if (curr.timestampMs > prev.timestampMs) {
      violations.push({
        index: curr.index,
        earlier: prev,
        later: curr,
        message:
          `Article #${curr.index} ("${curr.title}") has a newer timestamp than ` +
          `Article #${prev.index} ("${prev.title}"). ` +
          `Expected ${prev.rawTimestamp} >= ${curr.rawTimestamp}.`,
      });
    }
  }

  return {
    passed: violations.length === 0,
    checked: articles.length,
    violations,
  };
}

module.exports = { validateSortOrder };
