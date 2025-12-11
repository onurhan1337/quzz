import { existsSync, readFileSync, statSync, realpathSync } from "fs";
import { resolve, join, extname } from "path";
import { pathToFileURL } from "url";
import type { QuzzConfig } from "./types";

const CONFIG_FILES = ["quzz.config.ts", "quzz.config.js"] as const;
type ConfigFileExtension = ".ts" | ".js";

const CONFIG_LOADERS = {
  ".ts": loadTranspiledTsConfig,
  ".js": loadEsmJsConfig,
} satisfies Record<
  ConfigFileExtension,
  (filePath: string, mtimeMs?: number) => Promise<QuzzConfig | null>
>;

const configCache = new Map<string, { mtimeMs: number; config: QuzzConfig }>();

const resolveConfigExtension = (
  filePath: string
): ConfigFileExtension | null => {
  const extension = extname(filePath) as ConfigFileExtension;
  return extension in CONFIG_LOADERS ? extension : null;
};

const getMtimeMs = (filePath: string): number | null => {
  try {
    return statSync(filePath).mtimeMs;
  } catch {
    return null;
  }
};

async function loadConfigByPath(filePath: string): Promise<QuzzConfig | null> {
  const extension = resolveConfigExtension(filePath);
  if (!extension) {
    console.warn(
      `[quzz] Unsupported config extension. Use ${CONFIG_FILES.join(" or ")}`
    );
    return null;
  }

  const mtimeMs = getMtimeMs(filePath);
  const cached = mtimeMs !== null ? configCache.get(filePath) : null;

  if (cached && cached.mtimeMs === mtimeMs) {
    return cached.config;
  }

  const config = await CONFIG_LOADERS[extension](
    filePath,
    mtimeMs ?? undefined
  );

  if (config && mtimeMs !== null) {
    configCache.set(filePath, { mtimeMs, config });
  }

  return config;
}

export function loadConfigFromFile(): QuzzConfig | null {
  console.warn(
    "[quzz] loadConfigFromFile is deprecated. Use loadConfigFromFileAsync()."
  );
  return null;
}

export async function loadConfigFromFileAsync(): Promise<QuzzConfig | null> {
  if (typeof process === "undefined") {
    return null;
  }

  const projectRoot = getProjectRoot();
  const configFile = findConfigFile(projectRoot);
  return configFile ? loadConfigByPath(configFile) : null;
}

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
  let startDir: string;
  try {
    startDir = realpathSync(process.cwd());
  } catch {
    console.warn(
      "[quzz] Warning: realpathSync failed, falling back to process.cwd()."
    );
    return process.cwd();
  }
  let currentDir = startDir;
  const root = resolve("/");

  // Look for package.json up the directory tree
  while (true) {
    const packageJsonPath = join(currentDir, "package.json");
    if (existsSync(packageJsonPath)) {
      return currentDir;
    }
    if (currentDir === root) {
      break;
    }
    currentDir = resolve(currentDir, "..");
  }

  // Fallback to starting cwd if no package.json found
  return startDir;
}

async function loadTranspiledTsConfig(
  filePath: string,
  mtimeMs?: number
): Promise<QuzzConfig | null> {
  let transform: typeof import("esbuild").transform;
  try {
    ({ transform } = await import("esbuild"));
  } catch {
    console.warn(
      "[quzz] esbuild is required to load quzz.config.ts. Install esbuild."
    );
    return null;
  }

  try {
    const source = readFileSync(filePath, "utf8");
    const { code } = await transform(source, {
      loader: "ts",
      format: "esm",
      target: "es2020",
      sourcefile: filePath,
      sourcemap: "inline",
    });

    const dataUrl = `data:text/javascript;base64,${Buffer.from(code).toString(
      "base64"
    )}`;
    const bust = mtimeMs ? `#t=${mtimeMs}` : "";
    const imported = await import(`${dataUrl}${bust}`);
    const config = imported.default ?? imported.config ?? imported;

    if (!config || typeof config !== "object") {
      console.warn(
        `[quzz] Config file found at ${filePath} but no valid config exported`
      );
      return null;
    }

    return config as QuzzConfig;
  } catch (error) {
    console.warn(
      `[quzz] Failed to load config from ${filePath}: ${(error as Error).message}`
    );
    return null;
  }
}

async function loadEsmJsConfig(
  filePath: string,
  mtimeMs?: number
): Promise<QuzzConfig | null> {
  try {
    const fileUrl = pathToFileURL(filePath);
    const bust = mtimeMs ? `?t=${mtimeMs}` : "";
    const imported = await import(`${fileUrl.href}${bust}`);
    const config = imported.default ?? imported.config ?? imported;

    if (!config || typeof config !== "object") {
      console.warn(
        `[quzz] Config file found at ${filePath} but no valid config exported`
      );
      return null;
    }

    return config as QuzzConfig;
  } catch (error) {
    console.warn(
      `[quzz] Failed to load config from ${filePath}: ${(error as Error).message}`
    );
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

  const projectRoot = getProjectRoot();
  return findConfigFile(projectRoot) !== null;
}

/**
 * Get config file path if exists
 */
export function getConfigFilePath(): string | null {
  if (typeof process === "undefined") {
    return null;
  }

  const projectRoot = getProjectRoot();
  return findConfigFile(projectRoot);
}
