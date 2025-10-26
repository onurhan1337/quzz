import { pathToFileURL } from "url";
import { existsSync } from "fs";
import { resolve, join } from "path";
import type { QuzzConfig } from "./types";

/**
 * Supported config file names in priority order
 */
const CONFIG_FILES = [
  "quzz.config.mjs", // ESM (preferred)
  "quzz.config.js", // CommonJS (fallback)
  "quzz.config.cjs", // CommonJS explicit
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

/**
 * Load ESM config file (.mjs)
 */
async function loadEsmConfig(filepath: string): Promise<QuzzConfig | null> {
  try {
    // Convert to file URL for dynamic import
    const fileUrl = pathToFileURL(filepath).href;
    const module = await import(fileUrl);

    // Support both default export and named export
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

/**
 * Load quzz configuration from file synchronously
 * Only supports .js and .cjs files for synchronous loading
 * For .mjs files, use loadConfigFromFileAsync()
 */
export function loadConfigFromFile(): QuzzConfig | null {
  // Skip in browser environment
  if (typeof process === "undefined" || typeof require === "undefined") {
    return null;
  }

  try {
    const projectRoot = getProjectRoot();
    const configFile = findConfigFile(projectRoot);

    if (!configFile) {
      return null;
    }

    // Only load .js and .cjs synchronously
    // .mjs requires async import
    if (configFile.endsWith(".mjs")) {
      console.warn(
        `[quzz] Found ${configFile} but .mjs requires async loading. ` +
          `Use .js or .cjs for synchronous config loading, or the config will be loaded asynchronously.`
      );
      // Schedule async load in background
      loadEsmConfig(configFile).then((config) => {
        if (config) {
          console.log(`[quzz] Async config loaded from: ${configFile}`);
        }
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

/**
 * Load quzz configuration from file asynchronously
 * Supports all file types: .mjs, .js, .cjs
 */
export async function loadConfigFromFileAsync(): Promise<QuzzConfig | null> {
  // Skip in browser environment
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

    // Load based on file extension
    if (configFile.endsWith(".mjs")) {
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
