import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Select } from './Select';
import { SheetsLook } from './sheets';

const OPTIONS = [{ value: '', label: 'All' }, { value: 'PROJECT', label: 'PROJECT' }, { value: 'PROGRAM_TOVALIDATE', label: 'PROGRAM_TOVALIDATE' }];

function Harness({ sheets = true }: { sheets?: boolean }) {
  const [value, setValue] = useState('');
  return (
    <SheetsLook.Provider value={sheets}>
      <Select label="Status" value={value} options={OPTIONS} onChange={setValue} />
      <output>{value || 'none'}</output>
    </SheetsLook.Provider>
  );
}

// Headless UI reads innerText for typeahead; jsdom does not implement it.
const innerText = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'innerText');
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'innerText', { configurable: true, get(this: HTMLElement) { return this.textContent ?? ''; } });
});
afterAll(() => {
  if (innerText) Object.defineProperty(HTMLElement.prototype, 'innerText', innerText);
  else delete (HTMLElement.prototype as { innerText?: string }).innerText;
});

describe('Select', () => {
  it('opens a menu with the selected item marked and picks an item with the arrow keys and Enter', async () => {
    render(<Harness />);
    const button = screen.getByRole('button', { name: 'Status' });
    expect(button).toHaveTextContent('All');

    button.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('option', { name: 'All' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowDown}{Enter}');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('PROJECT');
    expect(button).toHaveTextContent('PROJECT');
  });

  it('jumps to the item that matches what is typed, and Esc closes without a change', async () => {
    render(<Harness />);
    screen.getByRole('button', { name: 'Status' }).focus();

    await userEvent.keyboard(' ');
    await userEvent.keyboard('PROG');
    expect(screen.getByRole('option', { name: 'PROGRAM_TOVALIDATE' })).toHaveAttribute('data-focus');
    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('none');
  });

  it('is the native select outside the Edit page', () => {
    render(<Harness sheets={false} />);

    expect(screen.getByRole('combobox', { name: 'Status' }).parentElement).toHaveClass('sa-input');
  });
});
