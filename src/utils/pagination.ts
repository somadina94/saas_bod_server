export interface ParsedPagination {
  page: number;
  limit: number;
  skip: number;
}

export const parsePagination = (
  query: Record<string, unknown>,
  maxLimit = 100,
): ParsedPagination => {
  const page = Math.max(1, Number(query.page) || 1);
  const rawLimit = Number(query.limit) || 20;
  const limit = Math.min(Math.max(1, rawLimit), maxLimit);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

export const buildPaginationMeta = (
  page: number,
  limit: number,
  total: number,
) => {
  const totalPages = Math.ceil(total / limit) || 1;
  return { page, limit, total, totalPages };
};

export const escapeRegex = (s: string): string =>
  s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const textSearchFilter = <T>(
  search: string | undefined,
  fields: (keyof T)[],
): Record<string, unknown> | undefined => {
  if (!search || !search.trim()) return undefined;
  const rx = new RegExp(escapeRegex(search.trim()), "i");
  return {
    $or: fields.map((f) => ({ [String(f)]: rx })),
  };
};
