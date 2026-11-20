import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from './toast';
import { Toaster } from './Toaster';

describe('toasts', () => {
  beforeEach(() => { vi.useFakeTimers(); render(<Toaster />); });
  afterEach(() => { act(() => toast.clear()); vi.useRealTimers(); });

  it('shows success as a polite status and hides it after 4 seconds', () => {
    act(() => { toast.success('IZO_446 saved'); });
    const t = screen.getByRole('status');
    expect(t).toHaveTextContent('IZO_446 saved');
    expect(t).toHaveAttribute('aria-live', 'polite');

    act(() => { vi.advanceTimersByTime(3900); });
    expect(screen.getByText('IZO_446 saved')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(200); });
    expect(screen.queryByText('IZO_446 saved')).not.toBeInTheDocument();
  });

  it('keeps a warning for 6 seconds', () => {
    act(() => { toast.warning('2 errors to fix'); });
    act(() => { vi.advanceTimersByTime(5900); });
    expect(screen.getByText('2 errors to fix')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(200); });
    expect(screen.queryByText('2 errors to fix')).not.toBeInTheDocument();
  });

  it('keeps an error, announced assertively, until it is closed', () => {
    act(() => { toast.error('Could not save: network error'); });
    const t = screen.getByRole('alert');
    expect(t).toHaveAttribute('aria-live', 'assertive');

    act(() => { vi.advanceTimersByTime(60_000); });
    expect(t).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('pauses the timer while the mouse is over the toast', () => {
    act(() => { toast.info('Hello'); });
    act(() => { vi.advanceTimersByTime(3000); });
    fireEvent.mouseEnter(screen.getByRole('status'));
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(screen.getByText('Hello')).toBeInTheDocument();

    fireEvent.mouseLeave(screen.getByRole('status'));
    act(() => { vi.advanceTimersByTime(900); });
    expect(screen.getByText('Hello')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(200); });
    expect(screen.queryByText('Hello')).not.toBeInTheDocument();
  });

  it('shows at most 3, newest at the bottom, dropping the oldest', () => {
    act(() => { ['one', 'two', 'three', 'four'].forEach((m) => toast.error(m)); });
    expect(screen.getAllByRole('alert').map((t) => t.textContent?.replace('Dismiss', '').trim()))
      .toEqual(['two', 'three', 'four']);
  });

  it('does not show the same message twice at the same time', () => {
    act(() => { toast.success('Saved'); toast.success('Saved'); });
    expect(screen.getAllByText('Saved')).toHaveLength(1);
  });

  it('runs the action and closes the toast', () => {
    const onClick = vi.fn();
    act(() => { toast.success('Excel import: 3 holes added', { action: { label: 'View', onClick } }); });
    fireEvent.click(screen.getByRole('button', { name: 'View' }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.queryByText('Excel import: 3 holes added')).not.toBeInTheDocument();
  });
});
