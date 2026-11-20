/**
 * Spreadsheet-style (Google Sheets) cell classes, shared by every editable interval table
 * through components/holeForm/GridTable.tsx. The `!` on focus wins over the app's global
 * `.sa :focus-visible` outline so the focused cell shows a 2 px blue inner border only.
 */
const FOCUS_CELL = 'focus:!outline focus:!outline-2 focus:!outline-[#1a73e8] focus:!-outline-offset-2';

export const GRID = {
  /** Outer border and rounded corners; overflow keeps the corners clean. */
  wrap: 'overflow-x-auto rounded-md border border-solid border-gray-200 bg-white',
  table: 'w-full table-fixed border-collapse font-sans text-sm',
  /** Header cell: grey band, same vertical lines as the body. The outer edge lines come from `wrap`. */
  th: 'h-9 border border-solid border-gray-200 border-t-0 bg-gray-50 px-2 font-sans text-xs font-semibold text-gray-600 first:border-l-0 last:border-r-0',
  /** Body cell: 1 px lines, no padding (the control fills it), h-9. */
  td: 'h-9 p-0 border border-solid border-gray-200 first:border-l-0 last:border-r-0 [tr:last-child_&]:border-b-0',
  hover: 'hover:bg-[#f8f9fa]',
  /** The input or dropdown button inside a cell: fills it, no frame. */
  control:
    'm-0 box-border block h-9 w-full rounded-none border-0 bg-transparent px-2 font-sans text-sm text-gray-900 shadow-none ' +
    `placeholder:text-gray-400 ${FOCUS_CELL}`,
  /** Number inputs: no spinner arrows, like Sheets. */
  number: '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
  /** Read-only cell (Rec % on Destructive rows…): grey, not focusable (the control is disabled). */
  disabled: 'bg-gray-50 text-gray-400 [&_*]:cursor-not-allowed',
  /** Cell with a validation error: light red with a red inner line; the message is in the tooltip. */
  error: 'bg-red-50 shadow-[inset_0_0_0_1px_theme(colors.red.600)]',
  /** Narrow delete column; the cell turns light red on hover. */
  del: 'group w-10 hover:bg-red-50',
  delButton:
    'm-0 flex h-9 w-full cursor-pointer items-center justify-center rounded-none border-0 bg-transparent p-0 text-gray-400 group-hover:text-red-600 ' +
    'focus-visible:!outline focus-visible:!outline-2 focus-visible:!outline-[#1a73e8] focus-visible:!-outline-offset-2 [&_svg]:h-4 [&_svg]:w-4',
} as const;

/** Classes of a body cell in its state. */
export function cellClass({ align = 'left', disabled = false, error }: { align?: 'left' | 'right'; disabled?: boolean; error?: string }) {
  const state = error ? GRID.error : disabled ? GRID.disabled : GRID.hover;
  return `${GRID.td} ${state} ${align === 'right' ? 'text-right' : 'text-left'}`;
}
