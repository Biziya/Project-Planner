# Mock API

When `VITE_USE_MOCK=true` (which is how `npm run dev` runs), the app uses this in-memory stand-in for the backend. Pages always import `api` from `src/api/api.ts` and don't know which implementation they get.

| File | Job |
| --- | --- |
| `mockData.ts` | Sample holes in acQuire, drafts and lookups (L01–L16). `createMockStore()` gives a fresh copy |
| `mockValidation.ts` | A few of the server checks (mandatory fields, HOLEID pattern, numeric and unique key), so the screens show realistic errors |
| `mockApi.ts` | `createMockApi(store, delayMs)`: same functions and result shapes as `httpApi` (typed `Api`) |
| `mockApi.test.ts` | Tests: list, validation, send with conflict, version conflict |

**Sample data to try:**
- **`PZO_455_059_44_A_`:** a draft without Z. It shows an error and can't be sent.
- **`IZO_449_055_44_A_`:** a draft that already exists in acQuire. Sending it shows the conflict dialog.
- **Saving a hole twice:** if you save a hole after someone else changed it, the save is refused with a version conflict.

**Limits:**
- The data resets when the page reloads.
- Excel import returns a "not available with mock data" message.
- The Excel export links do nothing.

**Moving to the real API:** once the backend has an endpoint, run `npm run dev:api` (mock off) to try it. The real rules always live in the backend; this mock only imitates them.
