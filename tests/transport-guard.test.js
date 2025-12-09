const test = require("node:test");
const assert = require("node:assert");

const { configure, resetConfig, withRSCTrace } = require("../dist/index.js");

test("transport timeout prevents log pipeline from hanging", async () => {
  resetConfig({ applyEnv: false });

  const slowTransport = () => new Promise(() => {});

  configure({
    logLevel: "error",
    transportTimeoutMs: 50,
    transportMaxPending: 1,
    transports: [slowTransport],
  });

  const Component = () => {
    throw new Error("boom");
  };

  const Wrapped = withRSCTrace(Component, { componentName: "TimeoutComp" });

  const start = Date.now();
  await assert.rejects(() => Wrapped({}), /boom/);
  const elapsed = Date.now() - start;

  resetConfig({ applyEnv: false });

  assert.ok(elapsed < 500, `expected timeout under 500ms, got ${elapsed}`);
});

test("drops logs when pending transport limit is exceeded", async () => {
  resetConfig({ applyEnv: false });

  let dropWarns = 0;
  const originalWarn = console.warn;
  console.warn = (msg, ...rest) => {
    if (typeof msg === "string" && msg.includes("transport queue is full")) {
      dropWarns += 1;
    }
    return originalWarn.call(console, msg, ...rest);
  };

  const slowTransport = () =>
    new Promise((resolve) => {
      setTimeout(resolve, 200);
    });

  configure({
    logLevel: "error",
    transportTimeoutMs: 500,
    transportMaxPending: 1,
    transports: [slowTransport],
  });

  const Component = () => {
    throw new Error("boom");
  };

  const Wrapped = withRSCTrace(Component, { componentName: "DropComp" });

  await Promise.allSettled([
    assert.rejects(() => Wrapped({}), /boom/),
    assert.rejects(() => Wrapped({}), /boom/),
  ]);

  await new Promise((resolve) => setTimeout(resolve, 50));

  resetConfig({ applyEnv: false });
  console.warn = originalWarn;

  assert.ok(dropWarns >= 1, "expected at least one drop warning");
});
