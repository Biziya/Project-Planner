import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/** In-memory Storage for test runs where jsdom's localStorage is missing (newer Node versions shadow it). */
class MemoryStorage implements Storage {
  private readonly items = new Map<string, string>();
  get length(): number { return this.items.size; }
  clear(): void { this.items.clear(); }
  getItem(key: string): string | null { return this.items.get(key) ?? null; }
  key(index: number): string | null { return [...this.items.keys()][index] ?? null; }
  removeItem(key: string): void { this.items.delete(key); }
  setItem(key: string, value: string): void { this.items.set(key, String(value)); }
}

for (const name of ['localStorage', 'sessionStorage'] as const) {
  let usable = false;
  try { usable = typeof window[name]?.getItem === 'function'; } catch { usable = false; }
  if (!usable) Object.defineProperty(window, name, { configurable: true, value: new MemoryStorage() });
}

/** jsdom has no ResizeObserver; Headless UI menus with an `anchor` use it to place the panel. Layout is not tested here. */
if (!('ResizeObserver' in window)) {
  class NoopResizeObserver { observe() {} unobserve() {} disconnect() {} }
  Object.defineProperty(window, 'ResizeObserver', { configurable: true, value: NoopResizeObserver });
}

afterEach(() => {
  cleanup();
});
