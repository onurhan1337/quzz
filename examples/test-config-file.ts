/**
 * Test quzz.config.js/mjs file loading
 *
 * This demonstrates the new config file approach similar to next.config.mjs
 */

import {
  hasConfigFile,
  getConfigFilePath,
  getConfig,
  configure,
} from "../src/index";

console.log("🧪 Testing quzz.config.js/mjs File Loading\n");

console.log("=" .repeat(80));
console.log("Config File Detection");
console.log("=" .repeat(80));

// Check if config file exists
const configFileExists = hasConfigFile();
console.log(`Config file exists: ${configFileExists}`);

if (configFileExists) {
  const configPath = getConfigFilePath();
  console.log(`Config file path: ${configPath}`);
} else {
  console.log(
    "No config file found. Expected one of: quzz.config.mjs, quzz.config.js, quzz.config.cjs"
  );
}

console.log();

console.log("=" .repeat(80));
console.log("Configuration Priority Order");
console.log("=" .repeat(80));
console.log("1. defaults (lowest priority)");
console.log("2. quzz.config.mjs / quzz.config.js / quzz.config.cjs");
console.log("3. environment variables (QUZZ_*)");
console.log("4. programmatic configure() (highest priority)");
console.log();

console.log("=" .repeat(80));
console.log("Current Configuration");
console.log("=" .repeat(80));

const currentConfig = getConfig();
console.log("Config loaded:");
console.log(JSON.stringify(currentConfig, null, 2));
console.log();

console.log("=" .repeat(80));
console.log("Example: Overriding with configure()");
console.log("=" .repeat(80));

configure({
  logLevel: "debug",
  outputFormat: "json",
});

const overriddenConfig = getConfig();
console.log("After configure() override:");
console.log(`  logLevel: ${overriddenConfig.logLevel}`);
console.log(`  outputFormat: ${overriddenConfig.outputFormat}`);
console.log();

console.log("=" .repeat(80));
console.log("Usage Examples");
console.log("=" .repeat(80));
console.log();

console.log("1. Create quzz.config.js (CommonJS):");
console.log("   ```javascript");
console.log("   // quzz.config.js");
console.log("   module.exports = {");
console.log("     logLevel: 'info',");
console.log("     outputFormat: 'compact',");
console.log("     performance: {");
console.log("       enabled: true,");
console.log("       trackMemory: true,");
console.log("     },");
console.log("   };");
console.log("   ```");
console.log();

console.log("2. Create quzz.config.mjs (ESM - preferred):");
console.log("   ```javascript");
console.log("   // quzz.config.mjs");
console.log("   export default {");
console.log("     logLevel: 'info',");
console.log("     outputFormat: 'compact',");
console.log("     performance: {");
console.log("       enabled: true,");
console.log("       trackMemory: true,");
console.log("     },");
console.log("   };");
console.log("   ```");
console.log();

console.log("3. No code changes needed!");
console.log("   - Config is automatically loaded when quzz initializes");
console.log("   - No need to call configure() in your app");
console.log("   - Just drop the config file in your project root");
console.log();

console.log("=" .repeat(80));
console.log("Benefits");
console.log("=" .repeat(80));
console.log("✅ Follows Next.js convention (next.config.mjs)");
console.log("✅ Type-safe with JSDoc comments");
console.log("✅ Automatic loading on initialization");
console.log("✅ Can still use configure() for overrides");
console.log("✅ Supports both ESM (.mjs) and CommonJS (.js)");
console.log("✅ Environment variables still work");
console.log("✅ No code changes in components needed");
console.log();

console.log("🎉 Config file loading test complete!");
