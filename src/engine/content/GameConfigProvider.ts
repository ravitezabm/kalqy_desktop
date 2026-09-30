import type { StorageAdapter } from "../persistence/StorageAdapter";

/** Where a game's content/config comes from — the game never cares which. */
export interface GameConfigProvider<T> {
  load(): Promise<T>;
}

export class LocalGameConfigProvider<T> implements GameConfigProvider<T> {
  constructor(private readonly config: T) {}
  async load(): Promise<T> {
    return this.config;
  }
}

/**
 * Prepared for the backend: fetches declarative JSON, validates it, and caches the
 * last good copy. Config is data only — nothing from it is ever executed.
 */
export class RemoteGameConfigProvider<T> implements GameConfigProvider<T> {
  constructor(
    private readonly url: string,
    private readonly validate: (data: unknown) => data is T,
    private readonly storage: StorageAdapter,
    private readonly cacheKey: string,
    private readonly fetchImpl: typeof fetch = (...args) => fetch(...args),
    private readonly timeoutMs = 4000
  ) {}

  async load(): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(this.url, { signal: controller.signal });
      if (!response.ok) throw new Error(`config ${response.status}`);
      const data: unknown = await response.json();
      if (!this.validate(data)) throw new Error("config failed validation");
      this.storage.set(this.cacheKey, data);
      return data;
    } finally {
      clearTimeout(timer);
    }
  }
}

export class CachedGameConfigProvider<T> implements GameConfigProvider<T> {
  constructor(
    private readonly storage: StorageAdapter,
    private readonly cacheKey: string,
    private readonly validate: (data: unknown) => data is T
  ) {}
  async load(): Promise<T> {
    const cached = this.storage.get<unknown>(this.cacheKey);
    if (!this.validate(cached)) throw new Error("no valid cached config");
    return cached;
  }
}

/** remote → cached → local → safe default: the first provider that works wins; the game always starts. */
export async function loadWithFallback<T>(providers: GameConfigProvider<T>[], safeDefault: T): Promise<T> {
  for (const provider of providers) {
    try {
      return await provider.load();
    } catch {
      // try the next source
    }
  }
  return safeDefault;
}
