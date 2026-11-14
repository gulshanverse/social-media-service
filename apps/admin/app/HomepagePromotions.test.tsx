import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HomepagePromotions from './HomepagePromotions';

const record = {
  id: 'promo-1',
  title: 'Campus festival',
  description: 'Join the campus celebration.',
  badgeText: 'This week',
  desktopImageUrl: 'https://blob.example/college-confession/promotions/festival.webp',
  desktopImageKey: 'college-confession/promotions/festival.webp',
  mobileImageUrl: null,
  mobileImageKey: null,
  imageAlt: 'Festival poster',
  ctaLabel: 'See the schedule',
  destinationUrl: '/events',
  status: 'PUBLISHED' as const,
  state: 'PUBLISHED' as const,
  priority: 3,
  startAt: null,
  endAt: null,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-02T00:00:00.000Z',
};

beforeEach(() => {
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:promotion-test');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Homepage Promotions admin', () => {
  it('lists a campaign and supports immediate unpublish with a refreshed state', async () => {
    let status: 'PUBLISHED' | 'DRAFT' = 'PUBLISHED';
    const api = vi.fn(async (path: string) => {
      if (path.startsWith('/admin/homepage-promotions?'))
        return {
          items: [{ ...record, status, state: status }],
          page: 1,
          limit: 100,
          total: 1,
          hasMore: false,
        };
      if (path.endsWith('/unpublish')) {
        status = 'DRAFT';
        return { ...record, status, state: status };
      }
      return {};
    });
    const uploadFile = vi.fn();
    render(<HomepagePromotions api={api} uploadFile={uploadFile} />);

    expect(await screen.findByRole('heading', { name: 'Homepage Promotions' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Campus festival' })).toBeInTheDocument();
    expect(screen.getByText('PUBLISHED')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Unpublish' }));
    expect(await screen.findByText('Campus festival is now a draft.')).toBeInTheDocument();
    expect(screen.getByText('DRAFT')).toBeInTheDocument();
  });

  it('loads the next page when more than 100 campaigns exist', async () => {
    const pageOne = { ...record, id: 'promo-100', title: 'Campaign 100' };
    const pageTwo = { ...record, id: 'promo-101', title: 'Campaign 101' };
    const api = vi.fn(async (path: string) => {
      if (path.includes('page=2'))
        return { items: [pageTwo], page: 2, limit: 50, total: 101, hasMore: false };
      if (path.startsWith('/admin/homepage-promotions?'))
        return { items: [pageOne], page: 1, limit: 50, total: 101, hasMore: true };
      return {};
    });
    render(<HomepagePromotions api={api} uploadFile={vi.fn()} />);
    expect(await screen.findByRole('heading', { name: 'Campaign 100' })).toBeInTheDocument();
    expect(screen.getByText('All promotions')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByRole('heading', { name: 'Campaign 101' })).toBeInTheDocument();
    expect(api).toHaveBeenCalledWith('/admin/homepage-promotions?page=2&limit=50');
  });

  it('uploads a validated poster, previews it, and saves a scheduled draft using UTC timestamps', async () => {
    const api = vi.fn(async (path: string, init?: RequestInit) => {
      if (path.startsWith('/admin/homepage-promotions?'))
        return { items: [], page: 1, limit: 100, total: 0, hasMore: false };
      if (path === '/admin/homepage-promotions' && init?.method === 'POST')
        return { id: 'created' };
      return {};
    });
    const uploadFile = vi.fn(
      async (_path: string, _file: File, onProgress: (percent: number) => void) => {
        onProgress(70);
        return {
          url: 'https://blob.example/college-confession/promotions/anniversary.webp',
          key: 'college-confession/promotions/anniversary.webp',
          width: 1600,
          height: 600,
          size: 1024,
        };
      },
    );
    const { container } = render(<HomepagePromotions api={api} uploadFile={uploadFile} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Create promotion' }));
    fireEvent.change(screen.getByRole('textbox', { name: /Promotion title/ }), {
      target: { value: 'Campus anniversary' },
    });
    fireEvent.change(screen.getByLabelText('Short description'), {
      target: { value: 'Celebrate together.' },
    });
    fireEvent.change(screen.getByLabelText('CTA button label'), {
      target: { value: 'See the events' },
    });
    fireEvent.change(screen.getByLabelText('CTA destination URL'), {
      target: { value: '/events' },
    });
    fireEvent.change(screen.getByLabelText(/Start date and time/), {
      target: { value: '2026-11-08T10:00' },
    });
    fireEvent.change(screen.getByLabelText(/End date and time/), {
      target: { value: '2026-11-12T18:00' },
    });

    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).toBeTruthy();
    fireEvent.change(fileInput!, {
      target: { files: [new File(['poster'], 'poster.webp', { type: 'image/webp' })] },
    });
    expect(await screen.findByText('Desktop poster uploaded (1 KB).')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    expect(
      screen.getByRole('heading', { level: 3, name: 'Campus anniversary' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Celebrate together.')).toBeInTheDocument();
    expect(screen.getByText('See the events ↗')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to editor' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith(
        '/admin/homepage-promotions',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    const createCall = api.mock.calls.find(
      ([path, init]) => path === '/admin/homepage-promotions' && init?.method === 'POST',
    );
    const payload = JSON.parse(createCall?.[1]?.body as string);
    expect(payload.title).toBe('Campus anniversary');
    expect(payload.status).toBe('DRAFT');
    expect(payload.desktopImageKey).toBe('college-confession/promotions/anniversary.webp');
    expect(new Date(payload.startAt).toISOString()).toBe('2026-11-08T10:00:00.000Z');
    expect(new Date(payload.endAt).toISOString()).toBe('2026-11-12T18:00:00.000Z');
    expect(await screen.findByText('Draft saved.')).toBeInTheDocument();
    expect(uploadFile).toHaveBeenCalledOnce();
  });

  it('saves a background-only promotion without requiring an upload', async () => {
    const api = vi.fn(async (path: string, init?: RequestInit) => {
      if (path.startsWith('/admin/homepage-promotions?'))
        return { items: [], page: 1, limit: 50, total: 0, hasMore: false };
      return {};
    });
    render(<HomepagePromotions api={api} uploadFile={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Create promotion' }));
    fireEvent.change(screen.getByRole('textbox', { name: /Promotion title/ }), {
      target: { value: 'CSS campaign' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith(
        '/admin/homepage-promotions',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    const call = api.mock.calls.find(
      ([path, init]) => path === '/admin/homepage-promotions' && init?.method === 'POST',
    );
    const payload = JSON.parse(call?.[1]?.body as string);
    expect(payload.desktopImageUrl).toBeNull();
    expect(payload.backgroundPreset).toBe('aurora');
  });

  it('blocks publish attempts until a title is provided', async () => {
    const api = vi.fn(async () => ({ items: [], page: 1, limit: 100, total: 0, hasMore: false }));
    render(<HomepagePromotions api={api} uploadFile={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Create promotion' }));
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a promotion title.');
  });
});
