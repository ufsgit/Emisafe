/** Shape returned by the new paginated endpoints (`/api/users`, `/api/auth/login-history`, `/api/exams`). */
export interface PaginatedList<T> {
  rows: T[];
  total: number;
  page: number;
  pages: number;
}

/**
 * Normalizes `{ data, total, page, pages }` responses. The backend may return the
 * rows at the top level (`res.data` = array) or nested (`res.data.data` = array),
 * so both are accepted.
 */
export function normalizePaginated<T = any>(res: any): PaginatedList<T> {
  const d = res?.data;
  if (Array.isArray(d)) {
    return {
      rows: d as T[],
      total: Number(res?.total) || 0,
      page: Number(res?.page) || 1,
      pages: Number(res?.pages) || 1
    };
  }
  if (d && Array.isArray(d.data)) {
    return {
      rows: d.data as T[],
      total: Number(d.total ?? res?.total) || 0,
      page: Number(d.page ?? res?.page) || 1,
      pages: Number(d.pages ?? res?.pages) || 1
    };
  }
  if (Array.isArray(res)) {
    return { rows: res as T[], total: res.length, page: 1, pages: 1 };
  }
  return { rows: [], total: 0, page: 1, pages: 1 };
}
