const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const os = require("os");

const DIST_ENTRY = path.resolve(__dirname, "../dist/index.js");

const clearModuleCache = () => {
  for (const key of Object.keys(require.cache)) {
    if (key.startsWith(path.resolve(__dirname, "../dist"))) {
      delete require.cache[key];
    }
  }
};

const waitTick = () => new Promise((r) => setImmediate(r));

const withTempProject = async (files, run) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "quzz-config-"));
  const prevCwd = process.cwd();
  try {
    for (const [name, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(dir, name), content);
    }
    process.chdir(dir);
    clearModuleCache();
    await run(dir);
  } finally {
    process.chdir(prevCwd);
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore cleanup errors */
    }
  }
};

test("loads quzz.config.ts asynchronously and merges into config", async () => {
  await withTempProject(
    {
      "quzz.config.ts": `export default {
        logLevel: "debug",
        enableHyperlinks: false,
        performance: { enabled: true, warnThreshold: 250 },
      };`,
    },
    async () => {
      const { loadConfigFromFileAsync, getConfig, configure } = require(
        DIST_ENTRY
      );

      const fileCfg = await loadConfigFromFileAsync();
      await waitTick();
      configure(fileCfg || {});

      const config = getConfig();
      assert.equal(config.logLevel, "debug");
      assert.equal(config.enableHyperlinks, false);
      assert.equal(config.performance?.enabled, true);
      assert.equal(config.performance?.warnThreshold, 250);
    }
  );
});

test("loads quzz.config.js as ESM when package.json sets type module", async () => {
  await withTempProject(
    {
      "package.json": `{"type":"module"}`,
      "quzz.config.js": `export default {
        logLevel: "info",
        enableHyperlinks: true,
        performance: { enabled: true, warnThreshold: 123 },
      };`,
    },
    async () => {
      const { loadConfigFromFileAsync, getConfig, configure } = require(
        DIST_ENTRY
      );

      const fileCfg = await loadConfigFromFileAsync();
      await waitTick();
      configure(fileCfg || {});

      const config = getConfig();
      assert.equal(config.logLevel, "info");
      assert.equal(config.enableHyperlinks, true);
      assert.equal(config.performance?.warnThreshold, 123);
    }
  );
});

test("applies presets and defaults when config file is absent", async () => {
  await withTempProject({}, async () => {
    const {
      resetConfig,
      getConfig,
      configurePreset,
      configure,
      loadConfigFromFileAsync,
    } = require(DIST_ENTRY);

    resetConfig();
    await loadConfigFromFileAsync(); // no config file
    await waitTick();

    // defaults applied
    const cfg1 = getConfig();
    assert.equal(cfg1.logLevel, "error");
    assert.equal(cfg1.outputFormat, "pretty");
    assert.equal(cfg1.performance?.enabled, false);
    assert.equal(cfg1.props?.awaitProps, false);

    // apply preset
    configurePreset("perf");
    const cfg2 = getConfig();
    assert.equal(cfg2.logLevel, "info");
    assert.equal(cfg2.outputFormat, "compact");
    assert.equal(cfg2.performance?.enabled, true);
    assert.equal(cfg2.performance?.warnThreshold, 600);
    assert.equal(cfg2.performance?.trackMemory, true);

    // override programmatically
    configure({
      logLevel: "debug",
      performance: { trackMemory: true, enabled: true, warnThreshold: 321 },
      props: { awaitProps: true },
    });
    const cfg3 = getConfig();
    assert.equal(cfg3.logLevel, "debug");
    assert.equal(cfg3.performance?.warnThreshold, 321);
    assert.equal(cfg3.performance?.trackMemory, true);
    assert.equal(cfg3.props?.awaitProps, true);
  });
});

test("merges file config with env and programmatic overrides", async () => {
  await withTempProject(
    {
      "quzz.config.ts": `export default {
        logLevel: "info",
        outputFormat: "json",
        performance: { enabled: true, trackMemory: false, warnThreshold: 700 },
        props: { awaitProps: false },
      };`,
    },
    async () => {
      process.env.QUZZ_OUTPUT_FORMAT = "compact";
      process.env.QUZZ_FORCE_ENABLE = "false";

      const { getConfig, configure, loadConfigFromFileAsync } = require(
        DIST_ENTRY
      );

      const fileCfg = await loadConfigFromFileAsync();
      await waitTick();

      // simulate merge: file then env override
      configure({
        ...fileCfg,
        outputFormat: process.env.QUZZ_OUTPUT_FORMAT,
      });

      let cfg = getConfig();
      assert.equal(cfg.outputFormat, "compact");
      assert.equal(cfg.logLevel, "info");
      assert.equal(cfg.performance?.enabled, true);
      assert.equal(cfg.performance?.trackMemory, false);

      // programmatic override wins
      configure({
        outputFormat: "pretty",
        performance: { trackMemory: true, warnThreshold: 111 },
      });
      cfg = getConfig();
      assert.equal(cfg.outputFormat, "pretty");
      assert.equal(cfg.performance?.trackMemory, true);
      assert.equal(cfg.performance?.warnThreshold, 111);

      delete process.env.QUZZ_OUTPUT_FORMAT;
      delete process.env.QUZZ_FORCE_ENABLE;
    }
  );
});

test("handles invalid config export gracefully (non-object)", async () => {
  await withTempProject(
    {
      "quzz.config.ts": `export default "not-an-object";`,
    },
    async () => {
      const { resetConfig, getConfig, loadConfigFromFileAsync } = require(
        DIST_ENTRY
      );

      resetConfig();
      await loadConfigFromFileAsync();
      await waitTick();

      // Should fall back to defaults (no crash, no merge)
      const cfg = getConfig();
      assert.equal(cfg.logLevel, "error");
      assert.equal(cfg.outputFormat, "pretty");
    }
  );
});

test("respects production defaults and force enable overrides", async () => {
  await withTempProject(
    {
      "quzz.config.ts": `export default { enabled: true, forceEnable: false };`,
    },
    async () => {
      const prevNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
      process.env.QUZZ_ENABLED = ""; // not set truthy
      delete process.env.QUZZ_FORCE_ENABLE;

      const { getConfig, loadConfigFromFileAsync, configure } = require(
        DIST_ENTRY
      );

      const fileCfg = await loadConfigFromFileAsync();
      await waitTick();

      configure({ ...fileCfg });

      let cfg = getConfig();
      assert.equal(cfg.forceEnable, false);
      assert.equal(cfg.enabled ?? false, true);

      process.env.QUZZ_FORCE_ENABLE = "true";
      configure({ ...fileCfg, forceEnable: true, enabled: true });
      cfg = getConfig();
      assert.equal(cfg.forceEnable, true);
      assert.equal(cfg.enabled, true);

      process.env.NODE_ENV = prevNodeEnv;
      delete process.env.QUZZ_ENABLED;
      delete process.env.QUZZ_FORCE_ENABLE;
    }
  );
});

test("component wraps pick up config from file (withRSCTrace)", async () => {
  await withTempProject(
    {
      "quzz.config.ts": `export default {
        logLevel: "debug",
        enabled: true,
        forceEnable: true,
        performance: { enabled: true, warnThreshold: 50 },
        props: { awaitProps: false },
        logProps: true,
      };`,
    },
    async () => {
      const {
        loadConfigFromFileAsync,
        withRSCTrace,
        getConfig,
        configure,
      } = require(DIST_ENTRY);

      const fileCfg = await loadConfigFromFileAsync();
      await waitTick();
      configure({ ...fileCfg, enabled: true, forceEnable: true });

      const Component = ({ value }) => `ok:${value}`;
      const Wrapped = withRSCTrace(Component, { componentName: "CfgComp" });
      await Wrapped({ value: "x" });

      const cfg = getConfig();
      assert.equal(cfg.logLevel, "debug");
      assert.equal(cfg.performance?.enabled, true);
      assert.equal(cfg.performance?.warnThreshold, 50);
    }
  );
});
