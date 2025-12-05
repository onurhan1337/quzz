import type { LogEntry, OutputFormat } from "./types";

/**
 * ANSI color codes for terminal output
 */
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

/**
 * Check if terminal supports hyperlinks (OSC 8)
 * Most modern terminals support this: iTerm2, VS Code, GNOME Terminal, etc.
 */
function supportsHyperlinks(): boolean {
  // Check if explicitly disabled via env var
  if (process.env.QUZZ_DISABLE_HYPERLINKS === "true") {
    return false;
  }

  // Check environment variables that indicate hyperlink support
  const term = process.env.TERM || "";
  const termProgram = process.env.TERM_PROGRAM || "";

  // Known supporting terminals
  const supportedTerms = ["iTerm.app", "vscode", "Hyper"];
  if (supportedTerms.includes(termProgram)) {
    return true;
  }

  // Check for xterm-256color and similar
  if (term.includes("xterm") || term.includes("screen")) {
    return true;
  }

  // Default to true for unknown terminals (graceful degradation)
  return true;
}

/**
 * Create a terminal hyperlink using OSC 8 escape sequence
 * Falls back to plain text if hyperlinks are not supported
 */
function createHyperlink(text: string, url: string, enabled = true): string {
  if (!enabled || !supportsHyperlinks()) {
    return text;
  }

  // OSC 8 ; params ; URI ST text OSC 8 ;; ST
  const OSC = "\x1b]";
  const ST = "\x1b\\";
  return `${OSC}8;;${url}${ST}${text}${OSC}8;;${ST}`;
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toISOString().replace("T", " ").replace("Z", "");
}

/**
 * Get color for log level
 */
function getLevelColor(level: string): string {
  switch (level) {
    case "error":
      return colors.red;
    case "warn":
      return colors.yellow;
    case "info":
      return colors.cyan;
    case "debug":
      return colors.blue;
    case "trace":
      return colors.magenta;
    default:
      return colors.reset;
  }
}

/**
 * Get emoji for log level
 */
function getLevelEmoji(level: string): string {
  switch (level) {
    case "error":
      return "❌";
    case "warn":
      return "⚠️ ";
    case "info":
      return "ℹ️ ";
    case "debug":
      return "🔍";
    case "trace":
      return "🔬";
    default:
      return "  ";
  }
}

/**
 * Pretty format with colors and emojis
 */
export function prettyFormatter(entry: LogEntry): string {
  const levelColor = getLevelColor(entry.level);
  const emoji = getLevelEmoji(entry.level);
  const time = formatTimestamp(entry.timestamp);

  let output = `${colors.dim}${time}${colors.reset} ${emoji} ${levelColor}${entry.level.toUpperCase()}${colors.reset} `;
  output += `${colors.bright}${entry.componentName}${colors.reset} `;

  if (entry.tags && entry.tags.length > 0) {
    output += `${colors.gray}[${entry.tags.join(", ")}]${colors.reset} `;
  }

  output += `${entry.message}`;

  if (entry.metadata) {
    if (entry.metadata.duration !== undefined) {
      const durationColor =
        entry.metadata.duration > 1000
          ? colors.red
          : entry.metadata.duration > 500
            ? colors.yellow
            : colors.green;

      if (
        entry.metadata.wallClockTime !== undefined &&
        entry.metadata.waitTime !== undefined
      ) {
        const wallColor =
          entry.metadata.wallClockTime > 1000
            ? colors.red
            : entry.metadata.wallClockTime > 500
              ? colors.yellow
              : colors.green;
        output += ` ${colors.dim}(${durationColor}${entry.metadata.duration.toFixed(2)}ms compute${colors.dim}, `;
        output += `${wallColor}${entry.metadata.wallClockTime.toFixed(2)}ms total${colors.dim}, `;
        output += `${colors.gray}${entry.metadata.waitTime.toFixed(2)}ms wait${colors.dim})${colors.reset}`;
      } else {
        output += ` ${colors.dim}(${durationColor}${entry.metadata.duration.toFixed(2)}ms${colors.dim})${colors.reset}`;
      }
    }

    // Display trace ID with optional hyperlink
    if (entry.metadata.traceId) {
      const traceIdDisplay = createHyperlink(
        entry.metadata.traceId,
        `quzz://trace/${entry.metadata.traceId}`
      );
      output += `\n  ${colors.dim}Trace: ${colors.cyan}${traceIdDisplay}${colors.reset}`;
    }

    if (entry.metadata.parentTrace) {
      const parentDisplay = createHyperlink(
        entry.metadata.parentTrace,
        `quzz://trace/${entry.metadata.parentTrace}`
      );
      output += `\n  ${colors.dim}↳ Parent: ${colors.cyan}${parentDisplay}${colors.reset}`;
    }

    if (entry.metadata.props && Object.keys(entry.metadata.props).length > 0) {
      output += `\n  ${colors.dim}Props:${colors.reset} ${JSON.stringify(
        entry.metadata.props,
        null,
        2
      )
        .split("\n")
        .map((line, i) => (i === 0 ? line : `  ${line}`))
        .join("\n")}`;
    }

    if (entry.metadata.memory) {
      const heapUsedMB = (entry.metadata.memory.heapUsed / 1024 / 1024).toFixed(
        2
      );
      const heapTotalMB = (
        entry.metadata.memory.heapTotal /
        1024 /
        1024
      ).toFixed(2);
      output += `\n  ${colors.dim}Memory: ${heapUsedMB}MB / ${heapTotalMB}MB${colors.reset}`;
    }
  }

  if (entry.error) {
    output += `\n  ${colors.red}${entry.error.name}: ${entry.error.message}${colors.reset}`;
    if (entry.error.digest) {
      output += `\n  ${colors.dim}Digest: ${entry.error.digest}${colors.reset}`;
    }
    if (entry.error.stack) {
      const stackLines = entry.error.stack.split("\n").slice(1, 6);
      output += `\n${colors.gray}${stackLines.join("\n")}${colors.reset}`;
    }
  }

  return output;
}

/**
 * JSON format for structured logging
 */
export function jsonFormatter(entry: LogEntry): string {
  return JSON.stringify(entry);
}

/**
 * Compact single-line format with colors
 * Format: ComponentName: duration (memory) [level] message
 * Example: BlogDetailPage: 4.79ms (620MB) ✓
 */
export function compactFormatter(entry: LogEntry): string {
  const levelColor = getLevelColor(entry.level);
  let output = `${colors.bright}${entry.componentName}${colors.reset}: `;

  // Duration with color based on performance
  if (entry.metadata?.duration !== undefined) {
    const duration = entry.metadata.duration;
    const durationColor =
      duration > 1000
        ? colors.red
        : duration > 500
          ? colors.yellow
          : colors.green;

    output += `${durationColor}${duration.toFixed(2)}ms${colors.reset}`;
  }

  // Memory usage if available
  if (entry.metadata?.memory) {
    const heapUsedMB = (entry.metadata.memory.heapUsed / 1024 / 1024).toFixed(
      0
    );
    output += ` ${colors.dim}(${heapUsedMB}MB)${colors.reset}`;
  }

  // Level indicator (compact emoji or symbol)
  const levelIndicator =
    entry.level === "error" ? " ✗" : entry.level === "warn" ? " ⚠" : " ✓";
  output += `${levelColor}${levelIndicator}${colors.reset}`;

  // Error message if present
  if (entry.error) {
    output += ` ${colors.red}${entry.error.message}${colors.reset}`;
  }

  return output;
}
export function groupedFormatter(entry: LogEntry): string {
  const time = formatTimestamp(entry.timestamp);
  const header = `${entry.level.toUpperCase()} ${entry.componentName}`;
  const lines = [`${time} ${header} ${entry.message}`];
  if (entry.tags && entry.tags.length > 0) {
    lines.push(`tags: ${entry.tags.join(", ")}`);
  }
  if (entry.metadata) {
    if (entry.metadata.traceId) {
      lines.push(`trace: ${entry.metadata.traceId}`);
    }
    if (entry.metadata.parentTrace) {
      lines.push(`parent: ${entry.metadata.parentTrace}`);
    }
    if (entry.metadata.duration !== undefined) {
      lines.push(`duration: ${entry.metadata.duration.toFixed(2)}ms`);
    }
    if (entry.metadata.wallClockTime !== undefined) {
      lines.push(`wallClock: ${entry.metadata.wallClockTime.toFixed(2)}ms`);
    }
    if (entry.metadata.waitTime !== undefined) {
      lines.push(`wait: ${entry.metadata.waitTime.toFixed(2)}ms`);
    }
    if (entry.metadata.memory) {
      lines.push(
        `memory: ${(entry.metadata.memory.heapUsed / 1024 / 1024).toFixed(2)}MB`
      );
    }
    if (entry.metadata.props && Object.keys(entry.metadata.props).length > 0) {
      lines.push(`props: ${JSON.stringify(entry.metadata.props)}`);
    }
  }
  if (entry.error) {
    lines.push(`error: ${entry.error.name}: ${entry.error.message}`);
    if (entry.error.digest) {
      lines.push(`digest: ${entry.error.digest}`);
    }
  }
  return lines.join("\n");
}

/**
 * Get formatter by output format
 */
export function getFormatter(
  format: OutputFormat
): (entry: LogEntry) => string {
  switch (format) {
    case "json":
      return jsonFormatter;
    case "compact":
      return compactFormatter;
    case "grouped":
      return groupedFormatter;
    case "pretty":
    default:
      return prettyFormatter;
  }
}
