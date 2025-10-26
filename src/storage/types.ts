/**
 * Type-safe AsyncLocalStorage types for Node.js
 */

export interface AsyncLocalStorageInstance<T> {
  getStore(): T | undefined;
  enterWith(store: T): void;
  run<R>(store: T, callback: (...args: unknown[]) => R, ...args: unknown[]): R;
  exit<R>(callback: (...args: unknown[]) => R, ...args: unknown[]): R;
  disable(): void;
  snapshot?(): <R>(
    callback: (...args: unknown[]) => R,
    ...args: unknown[]
  ) => R;
}

export interface AsyncLocalStorageConstructor {
  new <T>(): AsyncLocalStorageInstance<T>;
}

export interface AsyncHooksModule {
  AsyncLocalStorage: AsyncLocalStorageConstructor;
}

export interface NodeProcess {
  version: string;
  versions?: {
    node?: string;
    [key: string]: string | undefined;
  };
  hrtime?: {
    bigint(): bigint;
  };
}

export interface StorageOptions {
  readonly name: string;
  readonly enableFallback?: boolean;
  readonly debugMode?: boolean;
}

export interface StorageMetrics {
  readonly hits: number;
  readonly misses: number;
  readonly errors: number;
  readonly lastAccess: number;
}

export interface MutableStorageMetrics {
  hits: number;
  misses: number;
  errors: number;
  lastAccess: number;
}

export interface ContextSnapshot<T = unknown> {
  readonly timestamp: number;
  readonly store: T | undefined;
  readonly stackDepth: number;
  readonly label?: string;
}

export interface SnapshotOptions {
  readonly label?: string;
  readonly includeStack?: boolean;
  readonly maxSnapshots?: number;
}
