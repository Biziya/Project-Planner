# Models

These are the request and response records the API exchanges with the frontend. There is one folder per feature (`Health/`, `Me/`, later `Holes/`, `Staging/`…), with one type per file.

- **JSON names:** the API sends JSON in camelCase. Keep property names in line with the frontend types in `frontend/src/api/api.ts`.
- **Records:** use `sealed record` types with the required values in the constructor.
