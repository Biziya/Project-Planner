/// <reference types="vite/client" />
interface ImportMetaEnv {
  /** API base URL, e.g. https://10.10.10.10:444/api. Empty = same server as the front end (/api). */
  readonly VITE_API_BASE_URL?: string;
}
interface ImportMeta { readonly env: ImportMetaEnv }
