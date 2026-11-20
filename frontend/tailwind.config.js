/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // bundle.css (the shared design system) keeps the base styles, so other pages do not change.
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        // New drillhole and other main buttons (same as --btn-primary-* in tokens.css)
        charcoal: { DEFAULT: '#2f3337', hover: '#1e2124' },
        // Border of locked (read-only) fields on the white form panels
        locked: '#e0e0e0',
        // Google Sheets-style controls on the Edit program page
        gblue: { DEFAULT: '#1a73e8', hover: '#1765cc', light: '#e8f0fe' }, // focus, checked box, selected item and row
        sheet: { hover: '#f1f3f4' },                     // menu item and table row hover
        snackbar: { DEFAULT: '#323232', action: '#8ab4f8' }, // toast background and its action text
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', '"Segoe UI"', 'Arial', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'Consolas', '"Courier New"', 'monospace'],
      },
      height: { 'control-sm': '32px', 'control-md': '40px' },
      width: { 'control-sm': '32px', 'control-md': '40px', 'filter-panel': '280px' },
      minHeight: { split: '520px' },
      maxHeight: { 'list-stacked': '420px' }, // hole list above the form, below the lg breakpoint
      // White check mark drawn on a checked checkbox
      backgroundImage: {
        check: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3.5 8.5l3 3 6-6.5'/%3E%3C/svg%3E\")",
      },
    },
  },
};
