/**
 * Visualization-specific types
 */

/**
 * Timeline view data point
 */
export interface TimelineEntry {
  componentName: string;
  traceId: string;
  startTime: number;
  endTime: number;
  duration: number;
  wallClockTime?: number;
  waitTime?: number;
  depth: number;
  tags?: string[];
  error?: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Flamegraph node
 */
export interface FlamegraphNode {
  name: string;
  value: number;
  children: FlamegraphNode[];
  traceId: string;
  error?: boolean;
  tags?: string[];
  wallClockTime?: number;
  waitTime?: number;
}

/**
 * Component statistics for visualization
 */
export interface ComponentStats {
  name: string;
  renderCount: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  totalDuration: number;
  errorCount: number;
  errorRate: number;
  tags: Set<string>;
}

/**
 * Visualization configuration
 */
export interface VisualizationConfig {
  width?: number;
  height?: number;
  colorScheme?: "default" | "performance" | "errors";
  showLabels?: boolean;
  showTooltips?: boolean;
  filterByTags?: string[];
  filterByDuration?: {
    min?: number;
    max?: number;
  };
  sortBy?: "startTime" | "duration" | "name" | "depth";
  groupBy?: "component" | "tag" | "none";
}

/**
 * Visualization export format
 */
export type ExportFormat = "png" | "svg" | "json" | "html";

/**
 * Color palette for visualization
 */
export interface ColorPalette {
  background: string;
  text: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  highlight: string;
  gradient: {
    fast: string;
    medium: string;
    slow: string;
    verySlow: string;
  };
}

/**
 * Default color palettes
 */
export const DEFAULT_PALETTES: Record<string, ColorPalette> = {
  default: {
    background: "#1e1e1e",
    text: "#ffffff",
    border: "#333333",
    success: "#4caf50",
    warning: "#ff9800",
    error: "#f44336",
    highlight: "#2196f3",
    gradient: {
      fast: "#4caf50",
      medium: "#ffeb3b",
      slow: "#ff9800",
      verySlow: "#f44336",
    },
  },
  performance: {
    background: "#0a0a0a",
    text: "#e0e0e0",
    border: "#2a2a2a",
    success: "#00e676",
    warning: "#ffc107",
    error: "#ff5252",
    highlight: "#00bcd4",
    gradient: {
      fast: "#00e676",
      medium: "#76ff03",
      slow: "#ffc107",
      verySlow: "#ff5252",
    },
  },
  errors: {
    background: "#1a0000",
    text: "#ffcccc",
    border: "#4a0000",
    success: "#66ff66",
    warning: "#ffaa00",
    error: "#ff0000",
    highlight: "#ff6666",
    gradient: {
      fast: "#003300",
      medium: "#333300",
      slow: "#663300",
      verySlow: "#660000",
    },
  },
};
