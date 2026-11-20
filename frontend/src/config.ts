// App settings from Vite env variables, checked once at load. A bad value stops the app with a clear message.

function parseFlag(name: string, value: string | undefined): boolean {
  if (value === undefined || value === '') return false;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${name} must be 'true' or 'false' (found '${value}').`);
}

/** true: the app runs on in-memory mock data and never calls the backend. */
export const USE_MOCK = parseFlag('VITE_USE_MOCK', import.meta.env.VITE_USE_MOCK);
