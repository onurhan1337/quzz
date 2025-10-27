import { pathToFileURL } from "url";
import { existsSync } from "fs";
import { resolve, join } from "path";
import type { QuzzConfig } from "./types";

const CONFIG_FILES = [
  "quzz.config.ts",
  "quzz.config.mts",
  "quzz.config.cts",
  "quzz.config.mjs",
  "quzz.config.js",
  "quzz.config.cjs",
] as const;

/**
 * Find quzz config file in project root
 */
function findConfigFile(baseDir: string): string | null {
  for (const filename of CONFIG_FILES) {
    const filepath = join(baseDir, filename);
    if (existsSync(filepath)) {
      return filepath;
    }
  }
  return null;
}

/**
 * Get project root directory
 * Looks for package.json starting from cwd
 */
function getProjectRoot(): string {
  let currentDir = process.cwd();
  const root = resolve("/");

  // Look for package.json up the directory tree
  while (currentDir !== root) {
    const packageJsonPath = join(currentDir, "package.json");
    if (existsSync(packageJsonPath)) {
      return currentDir;
    }
    currentDir = resolve(currentDir, "..");
  }

  // Fallback to cwd if no package.json found
  return process.cwd();
}

async function loadEsmConfig(filepath: string): Promise<QuzzConfig | null> {
  try {
    const cacheBuster = `?t=${Date.now()}`;
    const fileUrl = pathToFileURL(filepath).href + cacheBuster;
    const module = await import(fileUrl);

    const config = module.default || module.config;

    if (!config) {
      console.warn(
        `[quzz] Config file found at ${filepath} but no default export or config export found`
      );
      return null;
    }

    return config as QuzzConfig;
  } catch (error) {
    console.error(`[quzz] Failed to load config file: ${filepath}`, error);
    return null;
  }
}

/**
 * Load CommonJS config file (.js, .cjs)
 */
function loadCjsConfig(filepath: string): QuzzConfig | null {
  try {
    // Clear require cache to allow hot reloading
    delete require.cache[require.resolve(filepath)];

    const module = require(filepath);

    // Support both module.exports and exports.default
    const config = module.default || module.config || module;

    if (!config || typeof config !== "object") {
      console.warn(
        `[quzz] Config file found at ${filepath} but no valid config exported`
      );
      return null;
    }

    return config as QuzzConfig;
  } catch (error) {
    console.error(`[quzz] Failed to load config file: ${filepath}`, error);
    return null;
  }
}

export function loadConfigFromFile(): QuzzConfig | null {
  if (typeof process === "undefined" || typeof require === "undefined") {
    return null;
  }

  try {
    const projectRoot = getProjectRoot();
    const configFile = findConfigFile(projectRoot);

    if (!configFile) {
      return null;
    }

    const ext = configFile.slice(configFile.lastIndexOf("."));

    if (ext === ".mjs" || ext === ".mts" || ext === ".ts" || ext === ".cts") {
      console.warn(
        `[quzz] Found ${configFile} but ESM/TypeScript files require async loading.\n` +
          `Recommendation: Use quzz.config.js or quzz.config.cjs with CommonJS syntax for immediate loading,\n` +
          `or accept the async behavior. The config will be loaded asynchronously in the background.`
      );

      loadEsmConfig(configFile).catch((err) => {
        console.error(`[quzz] Failed to load config asynchronously:`, err);
      });

      return null;
    }

    console.log(`[quzz] Loading config from: ${configFile}`);
    return loadCjsConfig(configFile);
  } catch (error) {
    console.error("[quzz] Error loading config file:", error);
    return null;
  }
}

export async function loadConfigFromFileAsync(): Promise<QuzzConfig | null> {
  if (typeof process === "undefined") {
    return null;
  }

  try {
    const projectRoot = getProjectRoot();
    const configFile = findConfigFile(projectRoot);

    if (!configFile) {
      return null;
    }

    console.log(`[quzz] Loading config from: ${configFile}`);

    const ext = configFile.slice(configFile.lastIndexOf("."));

    if (ext === ".mjs" || ext === ".mts" || ext === ".ts" || ext === ".cts") {
      return await loadEsmConfig(configFile);
    } else {
      return loadCjsConfig(configFile);
    }
  } catch (error) {
    console.error("[quzz] Error loading config file:", error);
    return null;
  }
}

/**
 * Check if config file exists
 */
export function hasConfigFile(): boolean {
  if (typeof process === "undefined") {
    return false;
  }

  try {
    const projectRoot = getProjectRoot();
    return findConfigFile(projectRoot) !== null;
  } catch {
    return false;
  }
}

/**
 * Get config file path if exists
 */
export function getConfigFilePath(): string | null {
  if (typeof process === "undefined") {
    return null;
  }

  try {
    const projectRoot = getProjectRoot();
    return findConfigFile(projectRoot);
  } catch {
    return null;
  }
}
