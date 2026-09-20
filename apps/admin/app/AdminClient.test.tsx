import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Confessions, Dashboard, Nav } from './AdminClient';

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
});
