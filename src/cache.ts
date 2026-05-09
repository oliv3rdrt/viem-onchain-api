import NodeCache from "node-cache";

const store = new NodeCache({ useClones: false });

export function get<T>(key: string): T | undefined {
  return store.get<T>(key);
}

export function set<T>(key: string, value: T, ttlSeconds: number): void {
  store.set(key, value, ttlSeconds);
}

export function del(key: string): void {
  store.del(key);
}

export function stats() {
  return store.getStats();
}

export function make(
  namespace: string,
  ...parts: (string | number)[]
): string {
  return `${namespace}:${parts.join(":")}`;
}
