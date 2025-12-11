const test = require("node:test");
const assert = require("node:assert");
const moduleApi = require("module");

const { configure, resetConfig, withRSCTrace } = require("../dist/index.js");

test("maps error stack when mapStackTraces is enabled and source map exists", async () => {
  resetConfig({ applyEnv: false });

  const entries = [];
  const originalFindSourceMap = moduleApi.findSourceMap;
  let findCalls = 0;

  moduleApi.findSourceMap = () => {
    findCalls += 1;
    return {
      findEntry() {
        return {
          originalSource: "src/original.ts",
          originalLine: 7,
          originalColumn: 11,
          name: undefined,
          generatedLine: 10,
          generatedColumn: 5,
        };
      },
    };
  };

  try {
    configure({
      logLevel: "error",
      mapStackTraces: true,
      transports: [
        (entry) => {
          entries.push(entry);
        },
      ],
    });

    const Component = () => {
      const err = new Error("boom");
      err.stack = "Error: boom\n    at test (/app/file.js:10:5)";
      throw err;
    };

    const Wrapped = withRSCTrace(Component, { componentName: "StackComp" });

    await assert.rejects(() => Wrapped({}), /boom/);
  } finally {
    moduleApi.findSourceMap = originalFindSourceMap;
    resetConfig({ applyEnv: false });
  }

  const errorEntry = entries.find((e) => e.level === "error") ?? entries[0];

  assert.ok(findCalls > 0, "findSourceMap should be called");
  assert.ok(
    errorEntry?.error?.stack?.includes("src/original.ts:7:11"),
    `mapped stack should contain source map entry, got: ${errorEntry?.error?.stack}`
  );
});

test("keeps original stack when mapStackTraces is disabled", async () => {
  resetConfig({ applyEnv: false });

  const entries = [];

  configure({
    logLevel: "error",
    mapStackTraces: false,
    transports: [
      (entry) => {
        entries.push(entry);
      },
    ],
  });

  const Component = () => {
    const err = new Error("boom");
    err.stack = "Error: boom\n    at disabled (/app/file.js:10:5)";
    throw err;
  };

  const Wrapped = withRSCTrace(Component, { componentName: "StackCompOff" });
  await assert.rejects(() => Wrapped({}), /boom/);
  resetConfig({ applyEnv: false });

  const stack = entries[0]?.error?.stack ?? "";
  assert.ok(stack.includes("/app/file.js:10:5"), "raw stack should remain");
});

test("gracefully falls back when no source map is found", async () => {
  resetConfig({ applyEnv: false });

  const entries = [];
  const originalFindSourceMap = moduleApi.findSourceMap;
  let findCalls = 0;

  moduleApi.findSourceMap = () => {
    findCalls += 1;
    return null;
  };

  try {
    configure({
      logLevel: "error",
      mapStackTraces: true,
      transports: [
        (entry) => {
          entries.push(entry);
        },
      ],
    });

    const Component = () => {
      const err = new Error("boom");
      err.stack = "Error: boom\n    at fallback (/app/no-map-file.js:20:9)";
      throw err;
    };

    const Wrapped = withRSCTrace(Component, {
      componentName: "StackCompNoMap",
    });
    await assert.rejects(() => Wrapped({}), /boom/);
  } finally {
    moduleApi.findSourceMap = originalFindSourceMap;
    resetConfig({ applyEnv: false });
  }

  const stack = entries[0]?.error?.stack ?? "";
  assert.ok(
    findCalls > 0,
    "findSourceMap should be invoked when mapStackTraces is enabled"
  );
  assert.ok(
    stack.includes("/app/no-map-file.js:20:9"),
    "fallback should preserve original stack"
  );
});

test("only maps first MAX_STACK_LINES and keeps the tail intact", async () => {
  resetConfig({ applyEnv: false });

  const entries = [];
  const originalFindSourceMap = moduleApi.findSourceMap;

  moduleApi.findSourceMap = () => ({
    findEntry(line, column) {
      return {
        originalSource: "src/original.ts",
        originalLine: line,
        originalColumn: column ?? 1,
      };
    },
  });

  try {
    configure({
      logLevel: "error",
      mapStackTraces: true,
      transports: [
        (entry) => {
          entries.push(entry);
        },
      ],
    });

    const lines = ["Error: boom"];
    for (let i = 1; i <= 85; i++) {
      lines.push(`    at fn (/app/file.js:${i}:1)`);
    }
    const stackText = lines.join("\n");

    const Component = () => {
      const err = new Error("boom");
      err.stack = stackText;
      throw err;
    };

    const Wrapped = withRSCTrace(Component, {
      componentName: "StackCompLong",
    });
    await assert.rejects(() => Wrapped({}), /boom/);
  } finally {
    moduleApi.findSourceMap = originalFindSourceMap;
    resetConfig({ applyEnv: false });
  }

  const mapped = entries[0]?.error?.stack ?? "";
  // First mapped line should be transformed
  assert.ok(
    mapped.includes("src/original.ts"),
    `head of stack should be mapped, got: ${mapped.slice(0, 120)}`
  );
  assert.ok(
    mapped.includes("/app/file.js:85:1"),
    "tail beyond mapping limit should remain unmapped"
  );
});
