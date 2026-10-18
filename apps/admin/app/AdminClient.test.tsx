import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminClient, {
  asPublicTheme,
  Confessions,
  Dashboard,
  GarbaAdmin,
  Nav,
  importThemeJson,
  proposeContrastCorrections,
  refresh,
  Themes,
} from './AdminClient';

const navigation = vi.hoisted(() => ({ pathname: '/', push: vi.fn() }));

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push }),
}));

vi.mock('next/link', () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

const admin = { id: '1', email: 'admin@example.com', name: 'Admin', role: 'SUPER_ADMIN' as const };
const designer = { ...admin, role: 'DESIGNER' as const };

function response(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response;
}

describe('admin workspace behavior', () => {
  beforeEach(() => {
    localStorage.clear();
    navigation.pathname = '/';
    navigation.push.mockReset();
    vi.restoreAllMocks();
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/admin/themes'))
          return response({ items: [{ id: 'theme-1', name: 'Campus', slug: 'campus' }] });
        if (url.includes('/admin/confessions/bulk'))
          return response({
            processed: 1,
            skipped: 0,
            results: [{ id: 'c-1', outcome: 'APPROVED' }],
          });
        if (url.includes('/admin/confessions')) {
          return response({
            items: [
              {
                id: 'c-1',
                publicId: 'GGV-1',
                content: 'A campus thought',
                status: 'PENDING',
                category: 'OTHER',
                theme: { name: 'Campus' },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                reportCount: 0,
              },
            ],
            page: 1,
            limit: 20,
            total: 1,
            hasMore: false,
          });
        }
        return response({});
      }),
    );
  });

  it('shows role-appropriate navigation and hides restricted designer links', () => {
    render(<Nav admin={designer} />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Themes')).toBeInTheDocument();
    expect(screen.queryByText('Queue')).not.toBeInTheDocument();
    expect(screen.queryByText('Reports')).not.toBeInTheDocument();
    expect(screen.queryByText('Audit')).not.toBeInTheDocument();
  });

  it('keeps the Themes page renderable when a legacy theme has malformed preview CSS', async () => {
    const malformed = {
      id: 'legacy-theme',
      name: 'Paper & Ink',
      background: '#F1EBDD',
      gradient: 'linear-gradient(135deg, #F7F3E8 0%, #E7E0CF',
      textColor: '#202020',
      accentColor: '#8B1E1E',
      fontFamily: 'Lora',
      radius: 25,
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        response({ items: [malformed], page: 1, limit: 20, total: 1, hasMore: false }),
      ),
    );
    expect(asPublicTheme(malformed)?.gradient).toBe('linear-gradient(135deg,#151c2b,#243c5a)');
    render(<Themes admin={admin} />);
    expect((await screen.findAllByText('Paper & Ink')).length).toBeGreaterThan(1);
    expect(screen.queryByText('Application error')).not.toBeInTheDocument();
  });

  it('saves new themes and edits without sending immutable slugs or empty dates', async () => {
    const savedTheme = {
      id: 'theme-1',
      slug: 'campus-night',
      name: 'Campus Night',
      background: '#070a12',
      gradient: 'linear-gradient(135deg,#070a12,#101c3b)',
      textColor: '#ffffff',
      accentColor: '#00b8ff',
      fontFamily: 'Inter',
      radius: 28,
      status: 'DRAFT',
      tokens: {},
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/admin/themes?') && !init?.method)
        return response({ items: [savedTheme], page: 1, limit: 20, total: 1, hasMore: false });
      if (url.endsWith('/admin/themes') && init?.method === 'POST') return response(savedTheme);
      if (url.endsWith('/admin/themes/theme-1') && init?.method === 'PATCH')
        return response(savedTheme);
      return response({});
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<Themes admin={admin} />);
    await screen.findByRole('heading', { name: 'Create theme' });
    fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'campus-night' } });
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Campus Night' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/admin/themes'),
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    const createCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    const createBody = JSON.parse(String(createCall?.[1]?.body));
    expect(createBody.slug).toBe('campus-night');
    expect(createBody).not.toHaveProperty('startAt');
    expect(createBody).not.toHaveProperty('endAt');

    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Campus Night Updated' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/admin/themes/theme-1'),
        expect.objectContaining({ method: 'PATCH' }),
      ),
    );
    const updateCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH');
    const updateBody = JSON.parse(String(updateCall?.[1]?.body));
    expect(updateBody).not.toHaveProperty('slug');
    expect(updateBody).not.toHaveProperty('startAt');
    expect(updateBody).not.toHaveProperty('endAt');
  });

  it('proposes contrast corrections without touching unrelated advanced tokens', () => {
    const corrections = proposeContrastCorrections({
      name: 'Low contrast',
      slug: 'low-contrast',
      background: '#ffffff',
      gradient: 'none',
      textColor: '#eeeeee',
      accentColor: '#00b8ff',
      fontFamily: 'Inter',
      radius: 28,
      tokens: { primaryText: '#eeeeee', glow: '0 0 20px #00b8ff' },
    });
    expect(corrections.some((correction) => correction.key === 'primaryText')).toBe(true);
    expect(corrections.find((correction) => correction.key === 'primaryText')?.to).toMatch(
      /^#(?:ffffff|000000)$/,
    );
    expect(corrections.some((correction) => correction.key === 'glow')).toBe(false);
    expect(
      proposeContrastCorrections({
        name: 'Passing',
        slug: 'passing',
        background: '#000000',
        gradient: 'none',
        textColor: '#ffffff',
        accentColor: '#ffffff',
        fontFamily: 'Inter',
        radius: 28,
        tokens: {
          primaryText: '#ffffff',
          secondaryText: '#ffffff',
          mutedText: '#ffffff',
          headingText: '#ffffff',
          linkText: '#ffffff',
          buttonText: '#ffffff',
          buttonBackground: '#000000',
          input: '#000000',
          card: '#000000',
          surface: '#000000',
        },
      }),
    ).toEqual([]);
  });

  it('imports flat and canonical JSON without saving or losing unspecified values', () => {
    const current = {
      slug: 'current-theme',
      name: 'Current Theme',
      description: 'Keep this',
      background: '#070a12',
      gradient: 'linear-gradient(135deg,#070a12,#101c3b)',
      textColor: '#ffffff',
      accentColor: '#00b8ff',
      fontFamily: 'Inter',
      radius: 28,
      layoutVariant: 'classic',
      mode: 'dark',
      tags: ['keep'],
      tokens: { glassOpacity: '0.72', glow: '0 0 20px #00b8ff' },
    };
    const flat = importThemeJson({ backdropBlur: 18, gradientAngle: 135 }, current);
    expect(flat.form.tokens.backdropBlur).toBe('18');
    expect(flat.form.tokens.gradientAngle).toBe('135');
    expect(flat.form.tokens.glassOpacity).toBe('0.72');
    expect(flat.form.description).toBe('Keep this');

    const canonical = {
      schemaVersion: 1,
      type: 'theme',
      name: 'Imported Theme',
      slug: 'imported-theme',
      variant: 'classic',
      mode: 'dark',
      tags: ['imported'],
      tokens: {
        background: '#101522',
        gradient: 'linear-gradient(135deg,#101522,#243c5a)',
        textColor: '#ffffff',
        accentColor: '#00d9ff',
        fontFamily: 'Inter',
        radius: 24,
        glassOpacity: '0.64',
        backdropBlur: '24px',
      },
    };
    const complete = importThemeJson(canonical, current);
    expect(complete.form.name).toBe('Imported Theme');
    expect(complete.form.tokens.backdropBlur).toBe('24px');
    expect(() => importThemeJson({ unsupported: true }, current)).toThrow(/Unsupported theme keys/);
    expect(() => importThemeJson({ glassOpacity: { bad: true } }, current)).toThrow(
      /primitive value/,
    );
    const replaced = importThemeJson({ glassOpacity: '0.4' }, current, true);
    expect(replaced.form.description).toBe('');
    expect(replaced.form.tokens.glow).toBe('0');
  });

  it('renders dashboard metrics and loading-to-success behavior', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        response({
          pendingConfessions: 12,
          publishedConfessions: 8,
          rejectedConfessions: 2,
          openReports: 3,
          resolvedReports: 4,
          totalConfessions: 22,
          activeThemes: 5,
        }),
      ),
    );
    render(<Dashboard admin={admin} />);
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.getByText('12')).toBeInTheDocument());
    expect(screen.getByText('Open moderation queue')).toBeInTheDocument();
    expect(screen.getByText('Review reports')).toBeInTheDocument();
  });

  it('restores queue filters, supports selection, and performs confirmed bulk actions', async () => {
    localStorage.setItem('admin.queue.status', 'PUBLISHED');
    localStorage.setItem('admin.queue.category', 'OTHER');
    render(<Confessions />);
    await waitFor(() => expect(screen.getByText('GGV-1')).toBeInTheDocument());
    expect(screen.getByDisplayValue('PUBLISHED')).toBeInTheDocument();
    expect(screen.getByDisplayValue('OTHER')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Select GGV-1'));
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Approve selected'));
    await waitFor(() => expect(screen.getByText('1 processed, 0 skipped.')).toBeInTheDocument());
    expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
    expect(vi.mocked(confirm)).toHaveBeenCalledWith('Approve 1 selected confessions?');
  });

  it('shows the privacy-aware review checklist for the pending queue', async () => {
    render(<Confessions />);
    await waitFor(() => expect(screen.getByText('GGV-1')).toBeInTheDocument());
    expect(screen.getByText('Review each confession for safety')).toBeInTheDocument();
    expect(screen.getByText(/masked names can still be identifiable/i)).toBeInTheDocument();
  });

  it('handles queue filtering and clear selection controls', async () => {
    render(<Confessions />);
    await waitFor(() => expect(screen.getByText('GGV-1')).toBeInTheDocument());
    const search = screen.getByPlaceholderText('Content or public ID');
    fireEvent.change(search, { target: { value: 'campus' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(screen.getByDisplayValue('campus')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Select all visible'));
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Clear selection'));
    expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
  });

  it('renders Garba moderation at /garba through the authenticated AdminClient route dispatch', async () => {
    navigation.pathname = '/garba';
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/admin/auth/refresh')) return response({ accessToken: 'test-token' });
        if (url.includes('/admin/auth/me')) return response(admin);
        if (url.includes('/admin/garba'))
          return response({
            total: 4,
            pending: 2,
            published: 1,
            rejected: 1,
            archived: 0,
            comments: 3,
            openReports: 0,
          });
        return response({});
      }),
    );

    render(<AdminClient />);

    expect(await screen.findByRole('heading', { name: 'Garba moderation' })).toBeInTheDocument();
    expect(await screen.findByText('4')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Garba' })).toHaveAttribute('href', '/garba');
  });

  it('shares one refresh request when concurrent callers refresh together', async () => {
    let resolveRefresh: ((value: Response) => void) | undefined;
    const refreshResponse = new Promise<Response>((resolve) => {
      resolveRefresh = resolve;
    });
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toContain('/admin/auth/refresh');
      return refreshResponse;
    });
    vi.stubGlobal('fetch', fetchMock);

    const first = refresh();
    const second = refresh();
    resolveRefresh?.(response({ accessToken: 'shared-token' }));

    await expect(Promise.all([first, second])).resolves.toEqual(['shared-token', 'shared-token']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps ALL explicit when opening Total posts from Garba overview', async () => {
    window.history.pushState({}, '', '/garba');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/admin/garba'))
          return response({
            total: 4,
            pending: 2,
            published: 1,
            rejected: 1,
            archived: 0,
            comments: 3,
            openReports: 0,
          });
        return response({ items: [], page: 1, limit: 20, total: 0, hasMore: false });
      }),
    );

    render(<GarbaAdmin admin={admin} />);

    await waitFor(() =>
      expect(screen.getByRole('link', { name: /Total posts: 4/i })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('link', { name: /Total posts: 4/i }));

    expect(navigation.push).toHaveBeenCalledWith('/garba?tab=posts&status=ALL');
    expect(screen.getByDisplayValue('ALL')).toBeInTheDocument();
  });

  it('keeps the existing sign-in flow when the Garba admin route is unauthenticated', async () => {
    navigation.pathname = '/garba';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response({}, false, 401)),
    );

    render(<AdminClient />);

    expect(await screen.findByRole('heading', { name: 'Admin sign in' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Garba moderation' })).not.toBeInTheDocument();
  });
});
