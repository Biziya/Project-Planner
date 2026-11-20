import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { GRID } from './grid';
import { Icon } from './Icon';
import { useControlFrame, useSheetsLook } from './sheets';

export interface SelectOption { value: string; label: string }

interface SelectProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  /** `cell`: fills a spreadsheet grid cell (value + small chevron, no box), on every page. */
  look?: 'field' | 'cell';
}

/**
 * Edit page: a Google Sheets-style dropdown (Headless UI Listbox). Arrow keys move, Enter selects,
 * Esc closes and typing jumps to the first matching item. Elsewhere: the native design-system select.
 */
export function Select({ label, value, options, onChange, invalid, disabled, look = 'field' }: SelectProps) {
  const sheets = useSheetsLook();
  const frame = useControlFrame();
  const state = disabled ? 'disabled' : invalid ? 'invalid' : 'normal';

  const isCell = look === 'cell';
  if (!sheets && !isCell) {
    return (
      <span className={frame(state)}>
        <select aria-label={label} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </span>
    );
  }

  const current = options.find((o) => o.value === value);
  return (
    <Listbox value={value} onChange={onChange} disabled={disabled}>
      <ListboxButton aria-label={label} aria-invalid={invalid || undefined}
        className={isCell
          ? `${GRID.control} flex items-center justify-between gap-1 text-left enabled:cursor-pointer disabled:text-gray-400 [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:flex-none [&_svg]:text-gray-500`
          : `${frame(state)} justify-between text-left !outline-none enabled:cursor-pointer`}>
        <span className="min-w-0 truncate">{current?.label ?? value}</span>
        <Icon name="chevron" />
      </ListboxButton>
      <ListboxOptions anchor="bottom start"
        className="z-50 max-h-64 w-max min-w-[var(--button-width)] max-w-sm overflow-auto rounded-md border border-solid border-gray-200 bg-white py-1 shadow-lg !outline-none [--anchor-gap:4px]">
        {options.map((o) => (
          <ListboxOption key={o.value} value={o.value}
            className="group flex h-8 cursor-pointer items-center gap-2 px-3 font-sans text-sm text-gray-900 data-[focus]:bg-sheet-hover data-[selected]:bg-gblue-light data-[selected]:text-gblue">
            <span className="flex-1 truncate">{o.label}</span>
            <span className="invisible flex group-data-[selected]:visible [&_svg]:h-4 [&_svg]:w-4"><Icon name="check" /></span>
          </ListboxOption>
        ))}
      </ListboxOptions>
    </Listbox>
  );
}
