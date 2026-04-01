/**
 * tests/time.test.js
 * Unit tests for timestamp parsing and formatting utilities.
 * Run with: node --test tests/time.test.js
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { parseHNTimestamp, formatTimestamp } = require("../utils/time");

// ---------------------------------------------------------------------------
// parseHNTimestamp — valid inputs
// ---------------------------------------------------------------------------

test("parses a valid ISO 8601 string without trailing Z", () => {
  const ms = parseHNTimestamp("2024-01-15T14:23:07");
  assert.equal(typeof ms, "number");
  assert.ok(!isNaN(ms));
  // Verify it round-trips correctly as UTC
  assert.equal(new Date(ms).toISOString(), "2024-01-15T14:23:07.000Z");
});

test("parses a valid ISO 8601 string that already has a trailing Z", () => {
  const ms = parseHNTimestamp("2024-01-15T14:23:07Z");
  assert.equal(new Date(ms).toISOString(), "2024-01-15T14:23:07.000Z");
});

test("produces the same result with or without the Z suffix", () => {
  const withoutZ = parseHNTimestamp("2024-06-01T00:00:00");
  const withZ = parseHNTimestamp("2024-06-01T00:00:00Z");
  assert.equal(withoutZ, withZ);
});

test("interprets timestamps as UTC, not local time", () => {
  // 2024-01-01T00:00:00 UTC should be exactly epoch + known offset
  const ms = parseHNTimestamp("2024-01-01T00:00:00");
  assert.equal(new Date(ms).getUTCFullYear(), 2024);
  assert.equal(new Date(ms).getUTCMonth(), 0); // January
  assert.equal(new Date(ms).getUTCDate(), 1);
  assert.equal(new Date(ms).getUTCHours(), 0);
});

test("strips leading and trailing whitespace before parsing", () => {
  const ms = parseHNTimestamp("  2024-03-10T08:00:00  ");
  assert.ok(!isNaN(ms));
  assert.equal(new Date(ms).toISOString(), "2024-03-10T08:00:00.000Z");
});

test("returns a number (not NaN, not null)", () => {
  const ms = parseHNTimestamp("2025-12-31T23:59:59");
  assert.equal(typeof ms, "number");
  assert.ok(Number.isFinite(ms));
});

test("newer timestamps produce larger ms values than older ones", () => {
  const older = parseHNTimestamp("2024-01-01T00:00:00");
  const newer = parseHNTimestamp("2024-01-01T00:01:00");
  assert.ok(newer > older);
});

// ---------------------------------------------------------------------------
// parseHNTimestamp — invalid inputs
// ---------------------------------------------------------------------------

test("throws when given an empty string", () => {
  assert.throws(() => parseHNTimestamp(""), /Invalid timestamp attribute/);
});

test("throws when given null", () => {
  assert.throws(() => parseHNTimestamp(null), /Invalid timestamp attribute/);
});

test("throws when given undefined", () => {
  assert.throws(
    () => parseHNTimestamp(undefined),
    /Invalid timestamp attribute/,
  );
});

test("throws when given a non-string number", () => {
  assert.throws(
    () => parseHNTimestamp(1234567890),
    /Invalid timestamp attribute/,
  );
});

test("throws with a descriptive message when the string is not parseable", () => {
  assert.throws(
    () => parseHNTimestamp("not-a-date"),
    /Failed to parse timestamp/,
  );
});

test("throws when given a date-only string (no time component)", () => {
  assert.throws(() => parseHNTimestamp("2024-01-15"), /Expected format/);
});

// ---------------------------------------------------------------------------
// formatTimestamp
// ---------------------------------------------------------------------------

test("returns a non-empty string", () => {
  const result = formatTimestamp(0);
  assert.equal(typeof result, "string");
  assert.ok(result.length > 0);
});

test("formats the Unix epoch correctly as UTC", () => {
  const result = formatTimestamp(0);
  // toUTCString format varies slightly by engine but always contains "1970"
  assert.match(result, /1970/);
  assert.match(result, /GMT/);
});

test("round-trips a known timestamp through parse then format", () => {
  const iso = "2024-06-15T12:00:00";
  const ms = parseHNTimestamp(iso);
  const formatted = formatTimestamp(ms);
  // The formatted string should still represent the same point in time
  assert.equal(new Date(formatted).toISOString(), "2024-06-15T12:00:00.000Z");
});
