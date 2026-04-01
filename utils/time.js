/**
 * utils/time.js
 * Parse and format HN article timestamps.
 */

/**
 * Parses the ISO 8601 timestamp from an HN age element's `title` attribute
 * into a Unix epoch millisecond value for numeric comparison.
 *
 * @param {string} titleAttr - Raw value of the `title` attribute, e.g. "2024-01-15T14:23:07"
 * @returns {number} Unix timestamp in milliseconds
 * @throws {Error} If the attribute is missing, not a string, or not in the expected format
 * @throws {Error} If the date values are out of range (e.g. month 13, Feb 30, hour 25)
 */
function parseHNTimestamp(titleAttr) {
  if (!titleAttr || typeof titleAttr !== "string") {
    throw new Error(
      `Invalid timestamp attribute: expected a non-empty string, got ${JSON.stringify(titleAttr)}`,
    );
  }

  const trimmed = titleAttr.trim();

  // Enforce the exact timestamp shape we expect from HN.
  const hnFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z?$/;
  if (!hnFormat.test(trimmed)) {
    throw new Error(
      `Failed to parse timestamp from title attribute: "${titleAttr}". ` +
        `Expected format "YYYY-MM-DDTHH:mm:ss" (optionally ending with "Z").`,
    );
  }

  // HN timestamps are UTC; append Z when missing so parse is machine-independent.
  const normalized = trimmed.endsWith("Z") ? trimmed : `${trimmed}Z`;

  const ms = Date.parse(normalized);

  // Catch rollover dates like 2024-02-30 -> Mar 1.
  const [datePart, timePart] = normalized.replace("Z", "").split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second] = timePart.split(":").map(Number);

  if (isNaN(ms)) {
    throw new Error(
      `Failed to parse timestamp from title attribute: "${titleAttr}". ` +
        `The date values are out of range (e.g. month 13, Feb 30).`,
    );
  }

  const parsed = new Date(ms);
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day ||
    parsed.getUTCHours() !== hour ||
    parsed.getUTCMinutes() !== minute ||
    parsed.getUTCSeconds() !== second
  ) {
    throw new Error(
      `Failed to parse timestamp from title attribute: "${titleAttr}". ` +
        `The date values are out of range (e.g. month 13, Feb 30).`,
    );
  }

  return ms;
}

/**
 * Formats a Unix millisecond timestamp as a human-readable UTC string.
 *
 * @param {number} ms - Unix timestamp in milliseconds
 * @returns {string} Human-readable UTC date string
 * @throws {Error} If ms is not a finite number (NaN, Infinity, etc.)
 */
function formatTimestamp(ms) {
  if (!Number.isFinite(ms)) {
    throw new Error(
      `formatTimestamp requires a finite number, got ${JSON.stringify(ms)}`,
    );
  }
  return new Date(ms).toUTCString();
}

module.exports = { parseHNTimestamp, formatTimestamp };
