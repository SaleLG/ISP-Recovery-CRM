/**
 * PostgREST (Supabase) returns at most `max-rows` (default 1000) rows per
 * request. This helper transparently pages through a query in 1000-row chunks
 * so callers can work with the full result set regardless of size.
 *
 * Pass a factory that applies `.range(from, to)` to the query and returns it.
 * The query MUST have a stable, deterministic order (e.g. order by id) so that
 * pages don't overlap or skip rows.
 */
const PAGE_SIZE = 1000;

type PageResult<T> = { data: T[] | null; error: { message: string } | null };

export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    all.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}
