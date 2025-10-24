import type { LogEntry, OutputFormat } from './types'

/**
 * ANSI color codes for terminal output
 */
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toISOString().replace('T', ' ').replace('Z', '')
}

/**
 * Get color for log level
 */
function getLevelColor(level: string): string {
  switch (level) {
    case 'error':
      return colors.red
    case 'warn':
      return colors.yellow
    case 'info':
      return colors.cyan
    case 'debug':
      return colors.blue
    case 'trace':
      return colors.magenta
    default:
      return colors.reset
  }
}

/**
 * Get emoji for log level
 */
function getLevelEmoji(level: string): string {
  switch (level) {
    case 'error':
      return '❌'
    case 'warn':
      return '⚠️ '
    case 'info':
      return 'ℹ️ '
    case 'debug':
      return '🔍'
    case 'trace':
      return '🔬'
    default:
      return '  '
  }
}

/**
 * Pretty format with colors and emojis
 */
export function prettyFormatter(entry: LogEntry): string {
  const levelColor = getLevelColor(entry.level)
  const emoji = getLevelEmoji(entry.level)
  const time = formatTimestamp(entry.timestamp)

  let output = `${colors.dim}${time}${colors.reset} ${emoji} ${levelColor}${entry.level.toUpperCase()}${colors.reset} `
  output += `${colors.bright}${entry.componentName}${colors.reset} `

  if (entry.tags && entry.tags.length > 0) {
    output += `${colors.gray}[${entry.tags.join(', ')}]${colors.reset} `
  }

  output += `${entry.message}`

  if (entry.metadata) {
    if (entry.metadata.duration !== undefined) {
      const durationColor = entry.metadata.duration > 1000 ? colors.red : entry.metadata.duration > 500 ? colors.yellow : colors.green
      output += ` ${colors.dim}(${durationColor}${entry.metadata.duration.toFixed(2)}ms${colors.dim})${colors.reset}`
    }

    if (entry.metadata.parentTrace) {
      output += `\n  ${colors.dim}↳ Parent: ${entry.metadata.parentTrace}${colors.reset}`
    }

    if (entry.metadata.props && Object.keys(entry.metadata.props).length > 0) {
      output += `\n  ${colors.dim}Props:${colors.reset} ${JSON.stringify(entry.metadata.props, null, 2)
        .split('\n')
        .map((line, i) => (i === 0 ? line : `  ${line}`))
        .join('\n')}`
    }

    if (entry.metadata.memory) {
      const heapUsedMB = (entry.metadata.memory.heapUsed / 1024 / 1024).toFixed(2)
      const heapTotalMB = (entry.metadata.memory.heapTotal / 1024 / 1024).toFixed(2)
      output += `\n  ${colors.dim}Memory: ${heapUsedMB}MB / ${heapTotalMB}MB${colors.reset}`
    }
  }

  if (entry.error) {
    output += `\n  ${colors.red}${entry.error.name}: ${entry.error.message}${colors.reset}`
    if (entry.error.digest) {
      output += `\n  ${colors.dim}Digest: ${entry.error.digest}${colors.reset}`
    }
    if (entry.error.stack) {
      const stackLines = entry.error.stack.split('\n').slice(1, 6)
      output += `\n${colors.gray}${stackLines.join('\n')}${colors.reset}`
    }
  }

  return output
}

/**
 * JSON format for structured logging
 */
export function jsonFormatter(entry: LogEntry): string {
  return JSON.stringify(entry)
}

/**
 * Compact single-line format
 */
export function compactFormatter(entry: LogEntry): string {
  const parts = [
    entry.timestamp,
    entry.level.toUpperCase(),
    entry.componentName,
    entry.message,
  ]

  if (entry.metadata?.duration) {
    parts.push(`${entry.metadata.duration.toFixed(2)}ms`)
  }

  if (entry.error) {
    parts.push(`ERROR: ${entry.error.message}`)
  }

  return parts.join(' | ')
}

/**
 * Get formatter by output format
 */
export function getFormatter(format: OutputFormat): (entry: LogEntry) => string {
  switch (format) {
    case 'json':
      return jsonFormatter
    case 'compact':
      return compactFormatter
    case 'pretty':
    default:
      return prettyFormatter
  }
}
