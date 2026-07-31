export interface ApiErrorDetail {
  field: string;
  reason: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ApiErrorDetail[] | null;

  constructor(
    status: number,
    code: string,
    message: string,
    details: ApiErrorDetail[] | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
