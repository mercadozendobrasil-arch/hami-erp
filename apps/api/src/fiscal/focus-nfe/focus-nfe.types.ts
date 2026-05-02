export type FocusNfeEnvironment = 'homologation' | 'production';

export interface FocusNfeRequestOptions<TBody = unknown> {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: TBody;
  headers?: HeadersInit;
}

export class FocusNfeError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number,
    readonly details?: unknown,
  ) {
    super(message);
  }
}
