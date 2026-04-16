export const isValidEmail = (value: unknown): value is string =>
  typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
