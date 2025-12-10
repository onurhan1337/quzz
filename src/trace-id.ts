import type { QuzzConfig, RSCTraceOptions, TraceIdConfig } from "./types";
import { generateId } from "./utils";
import { truncatePath } from "./utils/url-parse";

function resolveSearchParams(
  value: unknown,
  maxLength: number
): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") {
    return value.slice(0, maxLength);
  }
  if (value instanceof URLSearchParams) {
    const result = value.toString();
    return result ? result.slice(0, maxLength) : undefined;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .slice(0, 6)
      .map(([k, v]) => [k, String(v ?? "")] as [string, string]);
    if (entries.length === 0) {
      return undefined;
    }
    const params = new URLSearchParams(entries);
    const result = params.toString();
    return result ? result.slice(0, maxLength) : undefined;
  }
  return undefined;
}

function resolveRouteHint(
  props: unknown,
  options: RSCTraceOptions,
  config: QuzzConfig
): string | undefined {
  if (options.routeHint) {
    return options.routeHint;
  }
  if (config.traceId?.includeRouteHint === false) {
    return undefined;
  }
  if (!props || typeof props !== "object") {
    return undefined;
  }
  const value = props as Record<string, unknown>;
  let pathname: string | undefined;
  if (typeof value.pathname === "string") {
    pathname = value.pathname;
  } else if (typeof value.route === "string") {
    pathname = value.route;
  } else if (typeof value.path === "string") {
    pathname = value.path;
  }

  // Pathname varsa, uzunluğunu sınırla
  const maxPathLength = config.traceId?.maxPathLength ?? 120;
  if (pathname && pathname.length > maxPathLength) {
    pathname = truncatePath(pathname, maxPathLength);
  }

  // Lazy evaluation ile search params'ı sadece ihtiyaç duyulduğunda hesapla
  let search: string | undefined;

  // Search params'a ihtiyacımız var mı kontrol et
  const needsSearchParams =
    pathname !== undefined || value.searchParams !== undefined;

  if (needsSearchParams && value.searchParams) {
    search = resolveSearchParams(
      value.searchParams,
      config.traceId?.maxSearchParamsLength ?? 80
    );
  }

  // Sonuç oluşturma aynı kalıyor
  if (pathname && search) {
    return `${pathname}?${search}`;
  }
  if (pathname) {
    return pathname;
  }
  if (search) {
    return `?${search}`;
  }

  return undefined;
}

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
      const excess = this.counters.size - this.maxCounterEntries;
      for (let i = 0; i < excess; i++) {
        const oldest = this.counters.keys().next().value;
        if (oldest === undefined) break;
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

export {
  TraceIdGenerator,
  type TraceIdOptions,
  type GeneratedTraceId,
  resolveRouteHint,
};
