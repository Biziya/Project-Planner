/// <reference types="vite/client" />
interface ImportMetaEnv {
  /** API base URL, e.g. https://api.example.local/api. Empty = same server as the front end (/api). */
  readonly VITE_API_BASE_URL?: string;
}
interface ImportMeta { readonly env: ImportMetaEnv }
