/**
 * tests/retry.test.js
 * Unit tests for the withRetry utility.
 * Uses fake timers to keep tests fast — no real waiting.
 * Run with: node --test tests/retry.test.js
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { withRetry } = require("../utils/retry");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a fn that fails `failCount` times then resolves with `value`. */
function failThenSucceed(failCount, value = "ok") {
  let calls = 0;
  return async () => {
    calls++;
    if (calls <= failCount) throw new Error(`Simulated failure #${calls}`);
    return value;
  };
}

/** Returns a fn that always rejects with `message`. */
function alwaysFail(message = "always fails") {
  return async () => {
    throw new Error(message);
  };
}

// ---------------------------------------------------------------------------
// Success paths
// ---------------------------------------------------------------------------

test("resolves immediately when fn succeeds on the first attempt", async () => {
  const fn = async () => "result";
  const value = await withRetry(fn, { attempts: 3, delayMs: 0 });
  assert.equal(value, "result");
});

test("resolves with the correct return value after a retry", async () => {
  const fn = failThenSucceed(1, "success");
  const value = await withRetry(fn, { attempts: 3, delayMs: 0 });
  assert.equal(value, "success");
});

test("succeeds on the last allowed attempt", async () => {
  const fn = failThenSucceed(2, "final attempt");
  const value = await withRetry(fn, { attempts: 3, delayMs: 0 });
  assert.equal(value, "final attempt");
});

// ---------------------------------------------------------------------------
// Failure paths
// ---------------------------------------------------------------------------

test("throws the last error when all attempts are exhausted", async () => {
  await assert.rejects(
    () => withRetry(alwaysFail("boom"), { attempts: 3, delayMs: 0 }),
    /boom/,
  );
});

test("throws after exactly `attempts` calls — no extra calls", async () => {
  let callCount = 0;
  const fn = async () => {
    callCount++;
    throw new Error("fail");
  };
  await assert.rejects(() => withRetry(fn, { attempts: 4, delayMs: 0 }));
  assert.equal(callCount, 4);
});

test("does not swallow the error type or message", async () => {
  const fn = async () => {
    throw new TypeError("type problem");
  };
  const err = await withRetry(fn, { attempts: 2, delayMs: 0 }).catch((e) => e);
  assert.ok(err instanceof TypeError);
  assert.match(err.message, /type problem/);
});

// ---------------------------------------------------------------------------
// onRetry callback
// ---------------------------------------------------------------------------

test("calls onRetry for each failed attempt except the last", async () => {
  const calls = [];
  const onRetry = (attempt, total, err, waitMs) =>
    calls.push({ attempt, total, waitMs });

  await assert.rejects(() =>
    withRetry(alwaysFail(), {
      attempts: 3,
      delayMs: 0,
      backoffFactor: 2,
      onRetry,
    }),
  );

  // 3 attempts → 2 retries → onRetry called twice
  assert.equal(calls.length, 2);
  assert.equal(calls[0].attempt, 1);
  assert.equal(calls[1].attempt, 2);
  assert.equal(calls[0].total, 3);
});

test("does not call onRetry when fn succeeds on the first attempt", async () => {
  let retryCalled = false;
  const onRetry = () => {
    retryCalled = true;
  };
  await withRetry(async () => "ok", { attempts: 3, delayMs: 0, onRetry });
  assert.equal(retryCalled, false);
});

test("does not call onRetry on the final failing attempt (nothing to retry)", async () => {
  const retryCounts = [];
  const onRetry = (attempt) => retryCounts.push(attempt);
  await assert.rejects(() =>
    withRetry(alwaysFail(), { attempts: 1, delayMs: 0, onRetry }),
  );
  assert.equal(retryCounts.length, 0);
});

// ---------------------------------------------------------------------------
// Backoff calculation
// ---------------------------------------------------------------------------

test("passes exponentially increasing wait times to onRetry", async () => {
  const waits = [];
  const onRetry = (_, __, ___, waitMs) => waits.push(waitMs);
  await assert.rejects(() =>
    withRetry(alwaysFail(), {
      attempts: 4,
      delayMs: 100,
      backoffFactor: 2,
      onRetry,
    }),
  );
  // Expected: 100, 200, 400  (3 retries for 4 attempts)
  assert.equal(waits.length, 3);
  assert.equal(waits[0], 100);
  assert.equal(waits[1], 200);
  assert.equal(waits[2], 400);
});

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

test("works with no options object — uses built-in defaults", async () => {
  // Just confirm it doesn't throw when called with defaults and fn succeeds
  const value = await withRetry(async () => 42);
  assert.equal(value, 42);
});

test("throws a descriptive error when attempts is less than 1", async () => {
  await assert.rejects(
    () => withRetry(async () => "ok", { attempts: 0 }),
    /attempts must be an integer >= 1/,
  );
});

test("original error is preserved even when onRetry throws", async () => {
  const onRetry = () => { throw new Error("callback error"); };
  const err = await withRetry(alwaysFail("original failure"), {
    attempts: 2,
    delayMs: 0,
    onRetry,
  }).catch((e) => e);
  assert.match(err.message, /original failure/);
});

test("throws a descriptive error when fn is not a function", async () => {
  await assert.rejects(
    () => withRetry("not a function", { attempts: 1 }),
    /expects a function/,
  );
});

test("throws a descriptive error when backoffFactor is less than 1", async () => {
  await assert.rejects(
    () => withRetry(async () => "ok", { backoffFactor: 0.5 }),
    /backoffFactor must be a finite number >= 1/,
  );
});
