import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { emptyHole, type HoleStatus, type Issue } from '../api/api';
import type * as ApiModule from '../api/api';
import { HoleForm } from './HoleForm';
import { SheetsLook } from './sheets';

vi.mock('../api/api', async (importOriginal) => {
  const original = await importOriginal<typeof ApiModule>();
  const { createMockApi } = await import('../services/mock/mockApi');
  return { ...original, api: createMockApi(undefined, 0) };
});

const INTERVALS = [
  { type: 'Destructive' as const, from: 0, to: 210, recovery: null, comment: null },
  { type: 'Core' as const, from: 210, to: 240, recovery: 90, comment: 'Target sand' },
];

interface RenderProps { sheets?: boolean; context?: 'staging' | 'acquire'; dirty?: boolean; savedStatus?: HoleStatus; isSupervisor?: boolean; issues?: Issue[] }

function renderForm(props: RenderProps = {}) {
  const savedStatus = props.savedStatus ?? 'PROGRAM_TOVALIDATE';
  const hole = { ...emptyHole(), holeId: 'PZO_1', status: savedStatus, intervals: INTERVALS };
  const onValidate = vi.fn();
  const onChange = vi.fn();
  render(
    <SheetsLook.Provider value={props.sheets ?? false}>
      <HoleForm hole={hole} onChange={onChange} issues={props.issues ?? []} context={props.context ?? 'acquire'} savedStatus={savedStatus}
        isSupervisor={props.isSupervisor ?? true} dirty={props.dirty ?? false} onSave={vi.fn()} onValidate={onValidate} />
    </SheetsLook.Provider>,
  );
  return { onValidate, onChange };
}

const openConstruction = () => userEvent.click(screen.getByRole('tab', { name: 'Drilling construction planned' }));

describe('HoleForm action buttons', () => {
  it('on the Edit page, Save hole (green) and Validate for drilling are two separate buttons', async () => {
    const { onValidate } = renderForm({ sheets: true });
    expect(await screen.findByRole('button', { name: 'Save hole' })).toHaveClass('bg-green-700');

    const validate = screen.getByRole('button', { name: /Validate for drilling/ });
    expect(validate).toBeEnabled();
    await userEvent.click(validate);
    expect(onValidate).toHaveBeenCalledOnce();
  });

  it('explains why Validate for drilling is disabled', () => {
    renderForm({ sheets: true, dirty: true });
    const validate = screen.getByRole('button', { name: /Validate for drilling/ });
    expect(validate).toBeDisabled();
    expect(validate).toHaveAttribute('title', 'Save your changes first');
  });

  it('lets only supervisors validate', () => {
    renderForm({ sheets: true, isSupervisor: false });
    expect(screen.getByRole('button', { name: /Validate for drilling/ })).toHaveAttribute('title', 'Supervisors only');
  });

  it('shows "Edit mode" on editable panels', () => {
    renderForm({ sheets: true });
    expect(screen.getAllByText('Edit mode').length).toBeGreaterThan(0);
  });

  it('on the Edit page, a new hole is checked and imported with the blue import button', async () => {
    renderForm({ sheets: true, context: 'staging' });

    expect(await screen.findByRole('button', { name: 'Save draft' })).toHaveClass('bg-blue-600');
  });

  it('without the Sheets look (Import page) keeps the design-system buttons and controls', async () => {
    renderForm({ context: 'staging' });

    expect(await screen.findByRole('button', { name: 'Save draft' })).toHaveClass('sa-btn', 'sa-btn--primary');
    expect(screen.getByRole('spinbutton', { name: 'Planned depth' }).parentElement).toHaveClass('sa-input');
    expect(screen.getByRole('combobox', { name: 'Project' })).toBeInTheDocument();
  });

  it('gives the three general panels white bodies', () => {
    renderForm({ sheets: true });

    for (const title of ['Drillhole header', 'Planned coordinates and direction', 'Picket details']) {
      expect(screen.getByRole('heading', { name: title }).closest('section')).toHaveClass('bg-white');
    }
  });
});

describe('HoleForm Sheets-style controls', () => {
  it('uses the Sheets frame on inputs and a listbox button for selects', () => {
    renderForm({ sheets: true });

    expect(screen.getByRole('spinbutton', { name: 'Planned depth' }).parentElement).toHaveClass('h-9', 'rounded-md', 'focus-within:ring-2');
    // Planned depth is mandatory and empty here, so it shows the invalid (red) frame.
    expect(screen.getByRole('spinbutton', { name: 'Planned depth' }).parentElement).toHaveClass('border-red-600');
    expect(screen.getByRole('spinbutton', { name: 'Azimuth' }).parentElement).toHaveClass('border-gray-300', 'focus-within:!border-gblue');
    expect(screen.getByRole('button', { name: 'Status' })).toHaveAttribute('aria-haspopup', 'listbox');
  });
});

describe('Interval tables (spreadsheet grid)', () => {
  it('puts the controls inside the cells, numbers right-aligned', async () => {
    renderForm({ sheets: true });
    await openConstruction();

    const from = screen.getByRole('spinbutton', { name: 'From, row 1' });
    expect(from.closest('td')).toHaveClass('h-9', 'p-0', 'border-gray-200');
    expect(from).toHaveClass('w-full', 'border-0', 'text-right');
    expect(screen.getByRole('button', { name: 'Interval type, row 1' })).toHaveClass('w-full', 'border-0');
  });

  it('uses the same grid in the Import page pop-up', async () => {
    renderForm({ context: 'staging' });
    await openConstruction();
    expect(screen.getByRole('button', { name: 'Interval type, row 1' })).toHaveAttribute('aria-haspopup', 'listbox');
  });

  it('locks Rec % and the comment on Destructive rows', async () => {
    renderForm({ sheets: true });
    await openConstruction();

    const rec = screen.getByRole('spinbutton', { name: 'Recovery, row 1' });
    expect(rec).toBeDisabled();
    expect(rec.closest('td')).toHaveClass('bg-gray-50');
    expect(screen.getByRole('textbox', { name: 'Comment, row 1' })).toBeDisabled();
    expect(screen.getByRole('spinbutton', { name: 'Recovery, row 2' })).toBeEnabled();
  });

  it('moves cell to cell with Tab, skipping locked cells, then on to the next row', async () => {
    renderForm({ sheets: true });
    await openConstruction();

    screen.getByRole('spinbutton', { name: 'From, row 1' }).focus();
    await userEvent.tab();
    expect(screen.getByRole('spinbutton', { name: 'To, row 1' })).toHaveFocus();
    await userEvent.tab();   // Rec % and the comment are locked on a Destructive row
    expect(screen.getAllByRole('button', { name: 'Delete row' })[0]).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Interval type, row 2' })).toHaveFocus();
  });

  it('deletes a row with the trash button', async () => {
    const { onChange } = renderForm({ sheets: true });
    await openConstruction();

    const [first] = screen.getAllByRole('button', { name: 'Delete row' });
    if (!first) throw new Error('no delete button');
    await userEvent.click(first);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ intervals: [INTERVALS[1]] }));
  });

  it('marks a cell with an error and gives its message as a tooltip', async () => {
    const issue: Issue = { holeId: 'PZO_1', row: 2, field: 'Intervals.To', rule: 'I-01', level: 'Error', message: 'To must be above From' };
    renderForm({ sheets: true, issues: [issue] });
    await openConstruction();

    const to = screen.getByRole('spinbutton', { name: 'To, row 2' });
    expect(to).toHaveAttribute('aria-invalid', 'true');
    expect(to).toHaveAccessibleDescription('To must be above From');
    expect(to.closest('td')).toHaveClass('bg-red-50');
    expect(to.closest('td')).toHaveAttribute('title', 'To must be above From');
  });
});
