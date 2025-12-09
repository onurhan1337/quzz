import * as ModuleApi from "module";

type MapStackOptions = {
  mapStackTraces?: boolean;
};

type SourceMapEntry = {
  originalSource?: string | null;
  originalLine?: number | null;
  originalColumn?: number | null;
};

type SourceMapLike = {
  findEntry(line: number, column?: number): SourceMapEntry | null | undefined;
};

// at myFunction (src/app.js:42:10)
//             └──────┬──────────┘
//                    └─ catches this part
const PAREN_STACK_REGEX = /\(([^)]+):(\d+):(\d+)\)/;

// "at ServerComponent (app/page.tsx:42:15)"
//                    └─────┬──────┬──┬─┘
//                    file  └──────┬──┬─┘
//                         line    └──┬─┘
//                           column  └─┘
const FLAT_STACK_REGEX = /at (.+):(\d+):(\d+)/;

const FILE_CACHE_LIMIT = 64;
const MAX_STACK_LINES = 80;

const sourceMapCache = new Map<string, SourceMapLike | null>();

function getCachedSourceMap(filePath: string): SourceMapLike | null {
  if (sourceMapCache.has(filePath)) {
    return sourceMapCache.get(filePath) ?? null;
  }

  const map = safeFindSourceMap(filePath);

  if (sourceMapCache.size >= FILE_CACHE_LIMIT) {
    const firstKey = sourceMapCache.keys().next().value;
    if (firstKey) {
      sourceMapCache.delete(firstKey);
    }
  }

  sourceMapCache.set(filePath, map);
  return map;
}

function safeFindSourceMap(filePath: string): SourceMapLike | null {
  const findSourceMapFn = (
    ModuleApi as typeof ModuleApi & {
      findSourceMap?: (path: string) => unknown;
    }
  ).findSourceMap;

  if (typeof findSourceMapFn !== "function") {
    return null;
  }

  const map = findSourceMapFn(filePath) as unknown;
  if (map && typeof (map as { findEntry?: unknown }).findEntry === "function") {
    return map as SourceMapLike;
  }
  return null;
}

function mapLine(line: string): string {
  const parenMatch = PAREN_STACK_REGEX.exec(line);
  const flatMatch = parenMatch ? null : FLAT_STACK_REGEX.exec(line);
  const match = parenMatch ?? flatMatch;

  if (!match) {
    return line;
  }

  const [full, filePath, lineNumber, columnNumber] = match;
  const sourceMap = getCachedSourceMap(filePath);

  if (!sourceMap) {
    return line;
  }

  try {
    const entry = sourceMap.findEntry(Number(lineNumber), Number(columnNumber));

    if (
      !entry ||
      entry.originalSource == null ||
      entry.originalLine == null ||
      entry.originalColumn == null
    ) {
      return line;
    }

    const mappedTarget = `${entry.originalSource}:${entry.originalLine}:${entry.originalColumn}`;
    if (parenMatch) {
      return line.replace(full, `(${mappedTarget})`);
    }
    return line.replace(full, mappedTarget);
  } catch {
    return line;
  }
}

export function mapStackTrace(
  stack: string | undefined,
  options?: MapStackOptions
): string | undefined {
  if (!stack || !options?.mapStackTraces) {
    return stack;
  }

  if (!stack.includes(":")) {
    return stack;
  }

  if (!stack.includes("(") && !stack.includes(" at ")) {
    return stack;
  }

  // Map only the first MAX_STACK_LINES to bound mapping cost; append the rest untouched.
  const lines = stack.split("\n");
  const head = lines.slice(0, MAX_STACK_LINES);
  const tail = lines.slice(MAX_STACK_LINES);
  const mappedHead = head.map(mapLine);

  if (tail.length === 0) {
    return mappedHead.join("\n");
  }

  return mappedHead.concat(tail).join("\n");
}

export type { MapStackOptions };
