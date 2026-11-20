import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button, type ButtonVariant } from './Button';

describe('Button', () => {
  it.each<[ButtonVariant, string]>([
    ['primary', 'bg-charcoal'],
    ['import', 'bg-blue-600'],
    ['save', 'bg-green-700'],
    ['neutral', 'bg-white'],
    ['ghost', 'bg-transparent'],
    ['danger', 'bg-red-600'],
    ['iconDanger', 'enabled:hover:text-red-600'],
  ])('gives the %s variant its colour', (variant, cls) => {
    render(<Button variant={variant}>Go</Button>);

    const button = screen.getByRole('button', { name: 'Go' });
    expect(button).toHaveClass(cls);
    expect(button).toHaveClass('focus-visible:ring-2', 'disabled:opacity-50', 'disabled:cursor-not-allowed');
  });

  it('only changes colour on hover while enabled', () => {
    render(<Button variant="save">Save hole</Button>);

    const classes = screen.getByRole('button', { name: 'Save hole' }).className.split(' ');
    expect(classes.filter((c) => c.startsWith('hover:'))).toEqual([]);
    expect(classes).toContain('enabled:hover:bg-green-800');
  });

  it('ignores clicks when disabled', async () => {
    const onClick = vi.fn();
    render(<Button variant="import" disabled onClick={onClick}>Import</Button>);

    await userEvent.click(screen.getByRole('button', { name: 'Import' }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it('keeps extra classes and defaults to type="button"', () => {
    render(<Button variant="ghost" size="sm" className="self-start">Clear filters</Button>);

    const button = screen.getByRole('button', { name: 'Clear filters' });
    expect(button).toHaveClass('self-start', 'h-control-sm');
    expect(button).toHaveAttribute('type', 'button');
  });
});
