import { createContext, useContext } from 'react';

/**
 * The Edit program page turns this on to get the Google Sheets-style look (white areas, Sheets controls, Tailwind buttons).
 * Shared components (the hole form, lookups) keep the design-system look elsewhere, e.g. in the Import page pop-up.
 */
export const SheetsLook = createContext(false);
export const useSheetsLook = () => useContext(SheetsLook);

export type ControlState = 'normal' | 'invalid' | 'locked' | 'disabled';

// The frame alone shows focus; app.css removes the outline of the focused control inside it.
const FRAME =
  'flex h-9 w-full min-w-0 items-center gap-2 rounded-md border border-solid px-3 font-sans text-sm transition-colors selection:bg-gblue/25 ' +
  '[&_input]:min-w-0 [&_input]:flex-1 [&_input]:border-0 [&_input]:bg-transparent [&_input]:p-0 ' +
  '[&_input]:[font:inherit] [&_input]:text-[color:inherit] [&_input]:placeholder:text-gray-400 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:flex-none';

const SHEETS: Record<ControlState, string> = {
  normal: 'bg-white text-gray-900 border-gray-300 hover:border-gray-400 focus-within:!border-gblue focus-within:ring-2 focus-within:ring-gblue/20',
  invalid: 'bg-white text-gray-900 border-red-600 focus-within:ring-2 focus-within:ring-red-600/20',
  locked: 'bg-gray-100 text-gray-600 border-gray-200',
  disabled: 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed [&_*]:cursor-not-allowed',
};

const CLASSIC: Record<ControlState, string> = {
  normal: 'sa-input',
  invalid: 'sa-input is-invalid',
  locked: 'sa-input is-readonly',
  disabled: 'sa-input is-readonly',
};

/** HOLEID link in a hole table: blue, underlined on hover, blue ring on keyboard focus (overrides the copper `sa-idlink`). */
export const ID_LINK =
  'sa-idlink rounded-sm text-gblue no-underline hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gblue/40';

/** Class of the frame around an input or select: Sheets style on the Edit page, design-system `sa-input` elsewhere. */
export function useControlFrame() {
  const sheets = useSheetsLook();
  return (state: ControlState = 'normal') => (sheets ? `${FRAME} ${SHEETS[state]}` : CLASSIC[state]);
}
