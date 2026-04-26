export function toShopeePayload<T>(input: T): unknown {
  if (Array.isArray(input)) {
    return input.map((item) => toShopeePayload(item));
  }

  if (
    input instanceof Blob ||
    input instanceof Buffer ||
    input instanceof Uint8Array
  ) {
    return input;
  }

  if (!input || typeof input !== 'object') {
    return input;
  }

  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [toSnakeCase(key), toShopeePayload(value)]),
  );
}

export function toSnakeCase(input: string): string {
  return input.replace(/[A-Z]/g, (value) => `_${value.toLowerCase()}`);
}
