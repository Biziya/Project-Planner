/** An API call that failed. `status` is the HTTP status, or 0 when the server could not be reached. */
export class ApiError extends Error {
  constructor(public status: number, message: string, public body: unknown) { super(message); }
}
