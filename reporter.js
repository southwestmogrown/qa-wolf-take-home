/**
 * reporter.js
 * All console output lives here. The rest of the codebase stays silent —
 * scraper, validator, and utils are pure logic with no logging of their own.
 *
 * This separation means output format can be changed (e.g. JSON, CI-friendly)
 * without touching any business logic.
 */

const { formatTimestamp } = require("./utils/time");

// ANSI color codes for terminal output
const COLORS = {
  reset:  "\x1b[0m",
  bold:   "\x1b[1m",
  green:  "\x1b[32m",
  red:    "\x1b[31m",
  yellow: "\x1b[33m",
  cyan:   "\x1b[36m",
  dim:    "\x1b[2m",
};

const c = (color, text) => `${COLORS[color]}${text}${COLORS.reset}`;

/**
 * Prints a section divider for visual separation in terminal output.
 */
function divider() {
  console.log(c("dim", "─".repeat(60)));
}

/**
 * Reports the start of a scrape run.
 * @param {string} url
 * @param {number} articleCount
 */
function reportScrapeStart(url, articleCount) {
  divider();
  console.log(c("bold", `\n  QA Wolf — HN Sort Order Validation\n`));
  console.log(`  ${c("cyan", "Target:")}  ${url}`);
  console.log(`  ${c("cyan", "Checking:")} First ${articleCount} articles on /newest\n`);
  divider();
}

/**
 * Reports that scraping completed successfully.
 * @param {number} count - Number of articles collected
 */
function reportScrapeComplete(count) {
  console.log(`\n  ${c("green", "✔")} Scraped ${count} articles\n`);
}

/**
 * Reports the final validation result.
 * On failure, prints each violation with article titles and parsed timestamps
 * so the exact out-of-order pair is immediately identifiable.
 *
 * @param {import('./validator').ValidationResult} result
 */
function reportValidationResult(result) {
  divider();

  if (result.passed) {
    console.log(
      `\n  ${c("green", "✔ PASSED")}  —  All ${result.checked} articles are sorted newest to oldest.\n`
    );
    divider();
    process.exitCode = 0;
    return;
  }

  console.log(
    `\n  ${c("red", "✘ FAILED")}  —  ${result.violations.length} sort violation(s) found` +
    ` in ${result.checked} articles.\n`
  );

  result.violations.forEach((v, i) => {
    console.log(c("yellow", `  Violation ${i + 1}:`));
    console.log(`    ${c("dim", "Position:")}  #${v.earlier.index} → #${v.later.index}`);
    console.log(`    ${c("dim", "Expected newer first:")}`);
    console.log(`      #${v.earlier.index}  ${v.earlier.title}`);
    console.log(`              ${c("dim", formatTimestamp(v.earlier.timestampMs))}`);
    console.log(`    ${c("dim", "Found newer second:")}`);
    console.log(`      #${v.later.index}  ${v.later.title}`);
    console.log(`              ${c("dim", formatTimestamp(v.later.timestampMs))}\n`);
  });

  divider();
  process.exitCode = 1;
}

/**
 * Reports that a scrape attempt failed and a retry is about to begin.
 * @param {number} attempt       - The attempt number that just failed (1-based)
 * @param {number} totalAttempts - Total number of attempts allowed
 * @param {Error}  error         - The error that caused the failure
 * @param {number} waitMs        - How long we'll wait before retrying
 */
function reportRetryAttempt(attempt, totalAttempts, error, waitMs) {
  console.log(
    `\n  ${c("yellow", `↻ Attempt ${attempt}/${totalAttempts} failed`)}  —  ${c("dim", error.message)}`
  );
  console.log(`  ${c("dim", `Retrying in ${waitMs / 1000}s…`)}\n`);
}

/**
 * Reports a fatal error that prevented the test from completing.
 * @param {Error} error
 */
function reportFatalError(error) {
  divider();
  console.error(`\n  ${c("red", "✘ ERROR")}  —  Test could not complete.\n`);
  console.error(`  ${c("dim", error.message)}\n`);
  divider();
  process.exitCode = 1;
}

module.exports = {
  reportScrapeStart,
  reportScrapeComplete,
  reportRetryAttempt,
  reportValidationResult,
  reportFatalError,
};
