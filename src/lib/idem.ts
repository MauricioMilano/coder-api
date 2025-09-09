type IdemEntry = { value: any, expires: number };

export class IdemCache {
  private cache = new Map<string, IdemEntry>();
  constructor(private max = 1000, private ttlMs = 10 * 60 * 1000) {}
  private key(method: string, path: string, idemKey: string) {
    return `${method}:${path}:${idemKey}`;
  }
  get(method: string, path: string, idemKey: string) {
    const k = this.key(method, path, idemKey);
    const entry = this.cache.get(k);
    if (entry && entry.expires > Date.now()) return entry.value;
    this.cache.delete(k);
    return undefined;
  }
  set(method: string, path: string, idemKey: string, value: any) {
    if (this.cache.size > this.max) {
      // LRU: remove oldest
      const oldest = [...this.cache.entries()].sort((a, b) => a[1].expires - b[1].expires)[0];
      if (oldest) this.cache.delete(oldest[0]);
    }
    this.cache.set(this.key(method, path, idemKey), { value, expires: Date.now() + this.ttlMs });
  }
}
export const idemCache = new IdemCache();
