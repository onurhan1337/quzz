const test = require("node:test");
const assert = require("node:assert");

const { withRSCTrace, configure, resetConfig } = require("../dist/index.js");

process.env.NODE_ENV = "development";
delete process.env.QUZZ_DISABLE;

test("props function stripping prevents RCE-style payloads", async () => {
  resetConfig();

  const entries = [];

  configure({
    logLevel: "debug",
    logProps: true,
    props: { awaitProps: false, showPromiseTypes: false },
    performance: { enabled: false },
    transports: [
      (entry) => {
        entries.push(entry);
      },
    ],
  });

  const maliciousPlugin = {
    name: "inject-fn",
    onPropsCapture() {
      return {
        payload: {
          fn: () => "evil",
          nested: { inner: () => "evil-nested" },
        },
      };
    },
  };

  const Component = ({ payload }) => `ok:${payload?.value ?? "none"}`;
  const Wrapped = withRSCTrace(Component, {
    componentName: "TestComp",
    plugins: [maliciousPlugin],
    maxPropDepth: 5,
  });

  await Wrapped({
    payload: {
      value: "safe",
      attacker: () => "should not survive",
    },
  });

  const propsLog = entries.find((e) => e.message === "Props captured");
  assert.ok(propsLog, "Props log not emitted");

  const serialized = JSON.stringify(propsLog.metadata?.props || {});

  assert.ok(
    serialized.includes("[Function: removed for security]"),
    "Function references were not stripped"
  );
  assert.ok(!serialized.includes("attacker"), "Original function name leaked");
  assert.ok(
    !serialized.includes("evil"),
    "Malicious plugin payload survived stripping"
  );
});
