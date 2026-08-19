/**
 * PostgREST caps every response at 1000 rows. Any analysis that reads the
 * full `exercises` history (PRs, last-used weights, volume charts) silently
 * lost everything past that ceiling once the account crossed it — which is
 * exactly why new personal records stopped appearing: the newest sets were
 * simply never returned. Always page through instead of issuing one select.
 */
export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  pageSize = 1000,
): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await page(offset, offset + pageSize - 1);
    if (error) throw error;
    const batch = data || [];
    rows.push(...batch);
    if (batch.length < pageSize) return rows;
    // Hard stop so a pathological dataset can't spin forever.
    if (offset > 200_000) return rows;
  }
}
