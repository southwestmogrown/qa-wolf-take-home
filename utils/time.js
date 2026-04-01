/**
 * utils/time.js
 * Utilities for parsing and comparing HN article timestamps.
 *
 * HN's `.age` anchor elements carry an absolute ISO 8601 timestamp in their
 * `title` attribute (e.g. "2024-01-15T14:23:07"). This is far more reliable
 * than parsing relative display text like "3 minutes ago", which is lossy and
 * ambiguous when multiple articles share the same relative label.
 */

/**
 * Parses the ISO 8601 timestamp from an HN age element's `title` attribute
 * into a Unix epoch millisecond value for numeric comparison.
 *
 * @param {string} titleAttr - Raw value of the `title` attribute, e.g. "2024-01-15T14:23:07"
 * @returns {number} Unix timestamp in milliseconds
 * @throws {Error} If the attribute is missing or unparseable
 */
function parseHNTimestamp(titleAttr) {
  if (!titleAttr || typeof titleAttr !== "string") {
    throw new Error(
      `Invalid timestamp attribute: expected a non-empty string, got ${JSON.stringify(titleAttr)}`,
    );
  }

  const trimmed = titleAttr.trim();

  // HN emits second-precision datetimes. Enforce this contract so malformed
  // scraper input fails loudly instead of being coerced into a different shape.
  const hnFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z?$/;
  if (!hnFormat.test(trimmed)) {
    throw new Error(
      `Failed to parse timestamp from title attribute: "${titleAttr}". ` +
        `Expected format "YYYY-MM-DDTHH:mm:ss" (optionally ending with "Z").`,
    );
  }

  // HN stores timestamps without a timezone suffix. We treat them as UTC,
  // which matches HN's server behavior. Appending 'Z' ensures Date.parse
  // interprets them as UTC rather than local time, which would produce
  // inconsistent results depending on the machine running the test.
  const normalized = trimmed.endsWith("Z") ? trimmed : `${trimmed}Z`;

  const ms = Date.parse(normalized);

  if (isNaN(ms)) {
    throw new Error(
      `Failed to parse timestamp from title attribute: "${titleAttr}". ` +
        `Expected ISO 8601 format (e.g. "2024-01-15T14:23:07").`,
    );
  }

  return ms;
}

/**
 * Formats a Unix millisecond timestamp as a human-readable UTC string.
 * Used in failure reports to make out-of-order articles easy to read.
 *
 * @param {number} ms - Unix timestamp in milliseconds
 * @returns {string} Human-readable UTC date string
 */
function formatTimestamp(ms) {
  return new Date(ms).toUTCString();
}

module.exports = { parseHNTimestamp, formatTimestamp };
