import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearConfessionsCache, CONFESSIONS_CACHE_TTL_MS, getConfessions } from '../../lib/api';

const responseFor = (page: number) => ({
  items: [],
  page,
  limit: 1,
  total: 0,
  hasMore: false,
});

function jsonResponse(body: unknown) {
  return {
    ok: true,
    json: async () => body,
  } as Response;
}

describe('getConfessions cache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearConfessionsCache();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('reuses a cached response for normalized query keys', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(jsonResponse(responseFor(2)));

    const first = await getConfessions({ page: 2, search: 'campus', category: 'CRUSH' });
    const second = await getConfessions({ category: 'CRUSH', search: 'campus', page: 2 });

    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/confessions?page=2&limit=12&search=campus&category=CRUSH'),
      expect.objectContaining({ cache: 'no-store', credentials: 'include' }),
    );
  });

  it('expires cached responses after the short TTL', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(jsonResponse(responseFor(1)))
      .mockResolvedValueOnce(jsonResponse(responseFor(1)));

    await getConfessions(1);
    vi.advanceTimersByTime(CONFESSIONS_CACHE_TTL_MS + 1);
    await getConfessions(1);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('deduplicates identical in-flight requests', async () => {
    const fetchMock = vi.mocked(fetch);
    let resolveResponse: (response: Response) => void = () => undefined;
    fetchMock.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        resolveResponse = resolve;
      }),
    );

    const firstRequest = getConfessions({ page: 3, sort: 'oldest' });
    const secondRequest = getConfessions({ sort: 'oldest', page: 3 });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveResponse(jsonResponse(responseFor(3)));
    await expect(Promise.all([firstRequest, secondRequest])).resolves.toHaveLength(2);
  });

  it('does not cache failed requests', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(jsonResponse(responseFor(1)));

    await expect(getConfessions(1)).rejects.toThrow('offline');
    await expect(getConfessions(1)).resolves.toMatchObject({ page: 1 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('evicts the least recently used entries when the cache is full', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(async (input) => {
      const page = Number(new URL(String(input)).searchParams.get('page'));
      return jsonResponse(responseFor(page));
    });

    for (let page = 1; page <= 24; page += 1) {
      await getConfessions(page);
      vi.advanceTimersByTime(1);
    }
    await getConfessions(1);
    await getConfessions(25);
    await getConfessions(2);

    expect(fetchMock).toHaveBeenCalledTimes(26);
  });
});
