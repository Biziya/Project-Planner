/// <reference types="vite/client" />
interface ImportMetaEnv {
  /** API base URL, e.g. https://api.example.local/api. Empty = same server as the front end (/api). */
  readonly VITE_API_BASE_URL?: string;
  /** 'true' = use in-memory mock data instead of the backend (set in .env.mock, used by npm run dev). */
  readonly VITE_USE_MOCK?: string;
}
interface ImportMeta { readonly env: ImportMetaEnv }
