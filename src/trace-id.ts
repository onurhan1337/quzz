import type { QuzzConfig, TraceIdConfig } from "./types";
import { generateId } from "./utils";

interface TraceIdOptions {
  componentName: string;
  config: QuzzConfig;
  contextId?: string;
  routeHint?: string;
}

interface GeneratedTraceId {
  traceId: string;
  rootTraceId?: string;
  sequence?: number;
  routeHint?: string;
}

class TraceIdGenerator {
  private static instance: TraceIdGenerator;
  private counters = new Map<string, number>();
  private readonly maxCounterEntries = 512;

  static getInstance(): TraceIdGenerator {
    if (!TraceIdGenerator.instance) {
      TraceIdGenerator.instance = new TraceIdGenerator();
    }
    return TraceIdGenerator.instance;
  }

  generate(options: TraceIdOptions): GeneratedTraceId {
    const mode = options.config.traceId?.mode ?? "structured";
    const maxIdLength = options.config.traceId?.maxIdLength ?? 180;
    if (!options.contextId || mode === "random") {
      return { traceId: this.truncate(generateId("trace"), maxIdLength) };
    }

    const rootTraceId = this.buildRootId(options.contextId);
    const sequence = this.nextSequence(rootTraceId);
    const componentPart = this.cleanComponent(
      options.componentName,
      options.config.traceId
    );
    const routeHint = this.formatRouteHint(
      options.routeHint,
      options.config.traceId
    );

    const base = `${rootTraceId}.${componentPart}#${sequence}`;
    const full = routeHint ? `${base} ${routeHint}` : base;

    return {
      traceId: this.truncate(full, maxIdLength),
      rootTraceId,
      sequence,
      routeHint,
    };
  }

  private nextSequence(rootId: string): number {
    const current = this.counters.get(rootId) ?? 0;
    const next = current + 1;
    this.counters.set(rootId, next);
    if (this.counters.size > this.maxCounterEntries) {
      const oldest = this.counters.keys().next().value;
      if (oldest !== undefined) {
        this.counters.delete(oldest);
      }
    }
    return next;
  }

  private buildRootId(contextId: string): string {
    const parts = contextId.split("_");
    const token = parts[2] || parts[1] || contextId;
    return `req_${token.slice(0, 8)}`;
  }

  private cleanComponent(name: string, config?: TraceIdConfig): string {
    const limit = config?.maxIdLength ? Math.min(config.maxIdLength, 120) : 120;
    let out = "";
    for (let i = 0; i < name.length; i++) {
      const ch = name[i];
      if (ch !== " " && ch !== "\n" && ch !== "\t" && ch !== "\r") {
        out += ch;
      }
    }
    return this.truncate(out || "Component", limit);
  }

  private formatRouteHint(
    hint: string | undefined,
    config?: TraceIdConfig
  ): string | undefined {
    if (!hint) return undefined;
    if (config?.includeRouteHint === false) return undefined;
    const maxRouteLength = config?.maxRouteLength ?? 120;
    const cleaned = this.collapseWhitespace(hint);
    if (cleaned.length === 0) return undefined;
    const limited = this.truncate(cleaned, maxRouteLength);
    return `(${limited})`;
  }

  private collapseWhitespace(value: string): string {
    let out = "";
    let lastWasSpace = false;
    for (let i = 0; i < value.length; i++) {
      const ch = value[i];
      const isSpace =
        ch === " " || ch === "\n" || ch === "\t" || ch === "\r" || ch === "\f";
      if (isSpace) {
        if (!lastWasSpace) {
          out += " ";
        }
        lastWasSpace = true;
      } else {
        out += ch;
        lastWasSpace = false;
      }
    }
    return out.trim();
  }

  private truncate(value: string, max: number): string {
    if (value.length <= max) return value;
    if (max <= 3) return value.slice(0, max);
    return `${value.slice(0, max - 3)}...`;
  }
}

export { TraceIdGenerator, type TraceIdOptions, type GeneratedTraceId };
