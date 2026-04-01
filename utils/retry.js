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
 *   Any error thrown by onRetry is silently swallowed so it cannot mask the original failure.
 * @returns {Promise<any>} Resolves with fn()'s return value on the first success
 * @throws  {Error}        If fn is not a function, or if any config option is invalid
 * @throws  {Error}        The last error thrown by fn() if all attempts are exhausted
 */
async function withRetry(
  fn,
  { attempts = 3, delayMs = 2000, backoffFactor = 2, onRetry } = {},
) {
  if (typeof fn !== "function") {
    throw new Error(
      `withRetry expects a function as its first argument, got ${typeof fn}`,
    );
  }

  if (!Number.isInteger(attempts) || attempts < 1) {
    throw new Error(
      `Invalid retry configuration: attempts must be an integer >= 1, got ${attempts}`,
    );
  }

  if (!Number.isFinite(delayMs) || delayMs < 0) {
    throw new Error(
      `Invalid retry configuration: delayMs must be a finite number >= 0, got ${delayMs}`,
    );
  }

  if (!Number.isFinite(backoffFactor) || backoffFactor < 1) {
    throw new Error(
      `Invalid retry configuration: backoffFactor must be a finite number >= 1, got ${backoffFactor}`,
    );
  }

  let lastError;
  let wait = delayMs;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (attempt < attempts) {
        if (onRetry) {
          try {
            onRetry(attempt, attempts, err, wait);
          } catch (_) {
            // onRetry errors must not mask the original failure
          }
        }
        await new Promise((resolve) => setTimeout(resolve, wait));
        wait = Math.round(wait * backoffFactor);
      }
    }
  }

  throw lastError;
}

module.exports = { withRetry };
