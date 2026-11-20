import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useApiStatus } from './useApiStatus';

const INTERVAL = 1_000;

/** Lets the promise from `check` settle and React apply the state update. */
const flush = () => act(async () => { await Promise.resolve(); });

describe('useApiStatus', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('starts as checking, then online when the API answers', async () => {
    const check = vi.fn(() => Promise.resolve());
    const { result } = renderHook(() => useApiStatus(check, INTERVAL));
    expect(result.current).toBe('checking');

    await flush();

    expect(result.current).toBe('online');
    expect(check).toHaveBeenCalledTimes(1);
  });

  it('is offline when the API does not answer', async () => {
    const check = vi.fn(() => Promise.reject(new Error('down')));
    const { result } = renderHook(() => useApiStatus(check, INTERVAL));

    await flush();

    expect(result.current).toBe('offline');
  });

  it('checks again after the interval and picks up a recovery', async () => {
    const check = vi.fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValue(undefined);
    const { result } = renderHook(() => useApiStatus(check, INTERVAL));
    await flush();
    expect(result.current).toBe('offline');

    await act(async () => { await vi.advanceTimersByTimeAsync(INTERVAL); });

    expect(check).toHaveBeenCalledTimes(2);
    expect(result.current).toBe('online');
  });

  it('goes offline at once when the browser loses the network, and rechecks when it is back', async () => {
    const check = vi.fn(() => Promise.resolve());
    const { result } = renderHook(() => useApiStatus(check, INTERVAL));
    await flush();

    act(() => { window.dispatchEvent(new Event('offline')); });
    expect(result.current).toBe('offline');

    act(() => { window.dispatchEvent(new Event('online')); });
    await flush();
    expect(check).toHaveBeenCalledTimes(2);
    expect(result.current).toBe('online');
  });

  it('stops checking after unmount', async () => {
    const check = vi.fn(() => Promise.resolve());
    const { unmount } = renderHook(() => useApiStatus(check, INTERVAL));
    await flush();

    unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(INTERVAL * 3); });

    expect(check).toHaveBeenCalledTimes(1);
  });
});
