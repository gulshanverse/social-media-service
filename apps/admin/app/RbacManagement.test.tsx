import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RbacManagement from './RbacManagement';

const superAdmin = {
  id: 'super-1',
  email: 'super@example.com',
  name: 'Super',
  role: 'SUPER_ADMIN' as const,
};
const designer = {
  id: 'designer-1',
  email: 'designer@example.com',
  name: 'Designer',
  role: 'DESIGNER' as const,
};
const permissions = [
  { key: 'dashboard.read', description: 'Read dashboard aggregates', reserved: false },
  { key: 'confessions.read', description: 'Read confession moderation records', reserved: false },
  { key: 'themes.manage', description: 'Create and manage themes', reserved: false },
  { key: 'roles.manage', description: 'Manage custom administrator roles', reserved: true },
];
const roles = [
  {
    id: 'system-mod',
    key: 'MODERATOR',
    name: 'Moderator',
    description: 'System role',
    system: true,
    permissions: [{ permissionKey: 'confessions.read' }],
    _count: { assignments: 1 },
  },
  {
    id: 'custom-reviewer',
    key: 'REVIEWER',
    name: 'Reviewer',
    description: 'Custom role',
    system: false,
    permissions: [{ permissionKey: 'dashboard.read' }],
    _count: { assignments: 0 },
  },
];
const access = {
  admin: {
    id: 'designer-1',
    email: 'designer@example.com',
    name: 'Designer',
    role: 'DESIGNER',
    isActive: true,
    bannedAt: null,
    deletedAt: null,
  },
  roles: [
    {
      id: 'system-mod',
      key: 'MODERATOR',
      name: 'Moderator',
      description: 'System role',
      system: true,
      permissions: ['confessions.read'],
    },
  ],
  overrides: [{ permissionKey: 'dashboard.read', effect: 'DENY' as const }],
  effectivePermissions: ['themes.manage'],
};

function body(value: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => value } as Response;
}

function installApi(responses: { failLoad?: boolean; failMutation?: boolean } = {}) {
  const calls: string[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push(`${init?.method ?? 'GET'} ${url}`);
    if (url.includes('/admin/rbac/permissions'))
      return responses.failLoad
        ? body({ message: 'RBAC unavailable' }, false, 503)
        : body(permissions);
    if (url.includes('/admin/rbac/roles')) {
      if (init?.method === 'POST' || init?.method === 'PATCH')
        return responses.failMutation
          ? body({ message: 'Role save failed' }, false, 400)
          : body({});
      return body(roles);
    }
    if (url.includes('/admin/users?'))
      return body({ items: [designer], page: 1, limit: 100, total: 1, hasMore: false });
    if (url.includes('/admin/rbac/users/designer-1/access')) return body(access);
    if (url.includes('/admin/rbac/users/designer-1/roles'))
      return responses.failMutation ? body({ message: 'Assignment failed' }, false, 400) : body({});
    return body({});
  });
  vi.stubGlobal('fetch', fetchMock);
  return { calls, fetchMock };
}

describe('Dynamic RBAC management', () => {
  it('denies non-super administrators before making RBAC requests', () => {
    const { fetchMock } = installApi();
    render(<RbacManagement admin={designer} />);
    expect(screen.getByRole('alert')).toHaveTextContent('SUPER_ADMIN access is required');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows searchable roles, protects system roles, and loads selected access', async () => {
    installApi();
    render(<RbacManagement admin={superAdmin} />);
    expect(await screen.findByRole('heading', { name: 'Dynamic RBAC' })).toBeInTheDocument();
    expect(screen.getByText('Protected')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(1);
    fireEvent.change(screen.getByLabelText('Search roles'), { target: { value: 'reviewer' } });
    expect(screen.getByText('Reviewer')).toBeInTheDocument();
    expect(screen.queryByText('Moderator')).not.toBeInTheDocument();
    expect((await screen.findAllByText('dashboard.read')).length).toBeGreaterThan(0);
    expect(screen.getByText('A DENY always wins over inherited grants.')).toBeInTheDocument();
  });

  it('creates a custom role with grouped permissions and ignores duplicate submissions', async () => {
    const { calls } = installApi();
    render(<RbacManagement admin={superAdmin} />);
    await screen.findByText('Reviewer');
    fireEvent.click(screen.getByRole('button', { name: 'Create custom role' }));
    fireEvent.change(screen.getByPlaceholderText('CONTENT_REVIEWER'), {
      target: { value: 'AUDITOR' },
    });
    fireEvent.change(screen.getByPlaceholderText('Content reviewer'), {
      target: { value: 'Auditor' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /dashboard\.read/ }));
    const save = screen.getByRole('button', { name: 'Save role' });
    fireEvent.click(save);
    fireEvent.click(save);
    await waitFor(() =>
      expect(
        calls.filter((call) => call.includes('POST') && call.includes('/admin/rbac/roles')).length,
      ).toBe(1),
    );
  });

  it('surfaces mutation failures and allows retry after the lock is released', async () => {
    const state = { fail: true };
    const { calls } = installApi();
    const original = globalThis.fetch;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (state.fail && (init?.method === 'POST' || init?.method === 'PATCH'))
          return body({ message: 'Assignment failed' }, false, 400);
        return original(input, init);
      }),
    );
    render(<RbacManagement admin={superAdmin} />);
    await screen.findByText('A DENY always wins over inherited grants.');
    fireEvent.change(screen.getByRole('combobox', { name: 'Assign eligible role' }), {
      target: { value: 'REVIEWER' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Assign role' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Assignment failed');
    state.fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Assign role' }));
    await waitFor(() =>
      expect(calls.some((call) => call.includes('POST') && call.includes('/roles'))).toBe(true),
    );
  });

  it('reports initial API failures and supports a reload retry', async () => {
    const { fetchMock } = installApi({ failLoad: true });
    render(<RbacManagement admin={superAdmin} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('RBAC unavailable');
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/admin/rbac/permissions')) return body(permissions);
      if (url.includes('/admin/rbac/roles')) return body(roles);
      if (url.includes('/admin/users?')) return body({ items: [designer], total: 1 });
      if (url.includes('/admin/rbac/users/designer-1/access')) return body(access);
      return body({});
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reload workspace' }));
    expect(await screen.findByText('Reviewer')).toBeInTheDocument();
  });
});
