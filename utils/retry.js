/**
 * utils/retry.js
 * Generic async retry with exponential backoff.
 *
 * Keeping this separate from scraper.js means the retry policy can change
 * (or be tested) without touching browser logic, and it can be reused for
 * any future async operation that needs resilience.
 */

/**
 * Calls fn() up to `attempts` times. If fn() rejects, waits `delayMs`
 * milliseconds before the next try, doubling the delay each time
 * (exponential backoff). If every attempt fails, the last error is re-thrown.
 *
 * @param {() => Promise<any>} fn           - The async operation to retry
 * @param {object}             options
 * @param {number}             options.attempts       - Total number of tries (including the first)
 * @param {number}             options.delayMs        - Delay before the first retry (ms)
 * @param {number}             options.backoffFactor  - Multiplier applied to delay after each failure
 * @param {(attempt: number, totalAttempts: number, error: Error, waitMs: number) => void} [options.onRetry]
 *   Optional callback invoked before each retry — used by the reporter to log progress.
 * @returns {Promise<any>} Resolves with fn()'s return value on the first success
 * @throws  {Error}        The last error thrown by fn() if all attempts are exhausted
 */
async function withRetry(fn, { attempts = 3, delayMs = 2000, backoffFactor = 2, onRetry } = {}) {
  let lastError;
  let wait = delayMs;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (attempt < attempts) {
        if (onRetry) onRetry(attempt, attempts, err, wait);
        await new Promise((resolve) => setTimeout(resolve, wait));
        wait = Math.round(wait * backoffFactor);
      }
    }
  }

  throw lastError;
}

module.exports = { withRetry };
