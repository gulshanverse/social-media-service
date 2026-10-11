'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from './AdminClient';

type Role = 'SUPER_ADMIN' | 'MODERATOR' | 'DESIGNER';
type Admin = { id: string; email: string; name: string | null; role: Role };
type Permission = { key: string; description: string; reserved: boolean };
type RoleDefinition = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  system: boolean;
  permissions: { permissionKey: string }[] | string[];
  _count?: { assignments: number };
};
type ManagedAdmin = { id: string; email: string; name: string | null; role: Role };
type Access = {
  admin: {
    id: string;
    email: string;
    name: string | null;
    role: Role;
    isActive: boolean;
    bannedAt: string | null;
    deletedAt: string | null;
  };
  roles: Array<{
    id: string;
    key: string;
    name: string;
    description: string | null;
    system: boolean;
    permissions: string[];
  }>;
  overrides: Array<{ permissionKey: string; effect: 'GRANT' | 'DENY' }>;
  effectivePermissions: string[];
};

type Props = { admin: Admin };

type Mutation = (callback: () => Promise<void>) => Promise<void>;

function permissionKeys(role: RoleDefinition) {
  return role.permissions.map((permission) =>
    typeof permission === 'string' ? permission : permission.permissionKey,
  );
}

function errorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : '';
  if (/session expired|authentication|required|unauthorized|401/i.test(message))
    return 'Your admin session has expired. Sign in again and retry.';
  if (/permission|forbidden|403|super_admin/i.test(message))
    return 'You do not have permission to manage dynamic RBAC.';
  return message || fallback;
}

export function RbacManagement({ admin }: Props) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [administrators, setAdministrators] = useState<ManagedAdmin[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [access, setAccess] = useState<Access | null>(null);
  const [roleSearch, setRoleSearch] = useState('');
  const [permissionSearch, setPermissionSearch] = useState('');
  const [adminSearch, setAdminSearch] = useState('');
  const [selectedRoleKey, setSelectedRoleKey] = useState('');
  const [editingRoleKey, setEditingRoleKey] = useState<string | null>(null);
  const [roleEditorOpen, setRoleEditorOpen] = useState(false);
  const [roleForm, setRoleForm] = useState({
    key: '',
    name: '',
    description: '',
    permissions: [] as string[],
  });
  const [overridePermission, setOverridePermission] = useState('');
  const [overrideEffect, setOverrideEffect] = useState<'GRANT' | 'DENY'>('GRANT');
  const [loading, setLoading] = useState(true);
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [error, setError] = useState('');
  const [accessError, setAccessError] = useState('');
  const [message, setMessage] = useState('');
  const mutationLock = useRef(false);

  const runMutation: Mutation = async (callback) => {
    if (mutationLock.current) return;
    mutationLock.current = true;
    setError('');
    setMessage('');
    try {
      await callback();
    } catch (error) {
      setError(errorMessage(error, 'The RBAC change failed. Retry when ready.'));
    } finally {
      mutationLock.current = false;
    }
  };

  const loadAccess = async (id: string) => {
    if (!id) {
      setAccess(null);
      setAccessError('');
      return;
    }
    setLoadingAccess(true);
    setAccessError('');
    try {
      setAccess(await api(`/admin/rbac/users/${encodeURIComponent(id)}/access`));
    } catch (error) {
      setAccess(null);
      setAccessError(errorMessage(error, 'Unable to load this administrator’s RBAC access.'));
    } finally {
      setLoadingAccess(false);
    }
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [permissionResult, roleResult, adminResult] = await Promise.all([
        api('/admin/rbac/permissions'),
        api('/admin/rbac/roles'),
        api('/admin/users?page=1&limit=100'),
      ]);
      setPermissions(permissionResult);
      setRoles(roleResult);
      setAdministrators(adminResult.items ?? []);
      setSelectedAdminId((current) => current || adminResult.items?.[0]?.id || '');
    } catch (error) {
      setError(errorMessage(error, 'Unable to load the RBAC management workspace.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (admin.role === 'SUPER_ADMIN') void load();
  }, [admin.role]);

  useEffect(() => {
    void loadAccess(selectedAdminId);
  }, [selectedAdminId]);

  const filteredRoles = useMemo(() => {
    const query = roleSearch.trim().toLowerCase();
    return roles.filter(
      (role) =>
        !query ||
        `${role.key} ${role.name} ${role.description ?? ''}`.toLowerCase().includes(query),
    );
  }, [roles, roleSearch]);

  const filteredAdmins = useMemo(() => {
    const query = adminSearch.trim().toLowerCase();
    return administrators.filter(
      (item) =>
        !query || `${item.name ?? ''} ${item.email} ${item.role}`.toLowerCase().includes(query),
    );
  }, [administrators, adminSearch]);

  const groupedPermissions = useMemo(() => {
    const query = permissionSearch.trim().toLowerCase();
    const groups = new Map<string, Permission[]>();
    for (const permission of permissions) {
      if (query && !`${permission.key} ${permission.description}`.toLowerCase().includes(query))
        continue;
      const group = permission.key.split('.')[0].replace(/_/g, ' ');
      const list = groups.get(group) ?? [];
      list.push(permission);
      groups.set(group, list);
    }
    return [...groups.entries()];
  }, [permissions, permissionSearch]);

  const selectedRole = roles.find((role) => role.key === selectedRoleKey);
  const assignableRoles = roles.filter(
    (role) => role.key !== 'SUPER_ADMIN' && role.key !== 'super_admin',
  );
  const overrideByKey = new Map(
    (access?.overrides ?? []).map((item) => [item.permissionKey, item]),
  );
  const rolePermissionKeys = new Set(access?.effectivePermissions ?? []);

  const startCreate = () => {
    setEditingRoleKey(null);
    setRoleEditorOpen(true);
    setRoleForm({ key: '', name: '', description: '', permissions: [] });
  };

  const startEdit = (role: RoleDefinition) => {
    setEditingRoleKey(role.key);
    setRoleEditorOpen(true);
    setRoleForm({
      key: role.key,
      name: role.name,
      description: role.description ?? '',
      permissions: permissionKeys(role),
    });
  };

  const togglePermission = (key: string) => {
    setRoleForm((form) => ({
      ...form,
      permissions: form.permissions.includes(key)
        ? form.permissions.filter((value) => value !== key)
        : [...form.permissions, key],
    }));
  };

  const refreshAfterMutation = async (successMessage: string) => {
    setMessage(successMessage);
    await load();
    if (selectedAdminId) await loadAccess(selectedAdminId);
  };

  if (admin.role !== 'SUPER_ADMIN') {
    return (
      <section>
        <p className="eyebrow">ACCESS CONTROL</p>
        <h1>Dynamic RBAC</h1>
        <div className="notice error" role="alert">
          SUPER_ADMIN access is required to manage roles, assignments, and permission overrides.
        </div>
      </section>
    );
  }

  if (loading)
    return (
      <section>
        <div className="state" role="status">
          Loading RBAC management…
        </div>
      </section>
    );

  return (
    <section className="rbac-workspace">
      <div className="form-heading">
        <div>
          <p className="eyebrow">ACCESS CONTROL</p>
          <h1>Dynamic RBAC</h1>
          <p className="muted">
            Manage reusable roles and inspect effective administrator access. Server authorization
            remains authoritative.
          </p>
        </div>
        <button type="button" className="secondary" onClick={() => void load()}>
          Reload workspace
        </button>
      </div>
      <div className="notice-stack" aria-live="polite">
        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}
        {accessError && (
          <div className="notice error" role="alert">
            {accessError}
          </div>
        )}
        {message && (
          <div className="notice success" role="status">
            {message}
          </div>
        )}
      </div>

      <div className="rbac-grid">
        <div className="rbac-main-column">
          <div className="panel">
            <div className="form-heading">
              <div>
                <p className="eyebrow">ROLE LIBRARY</p>
                <h2>System and custom roles</h2>
              </div>
              <button type="button" onClick={startCreate}>
                Create custom role
              </button>
            </div>
            <input
              aria-label="Search roles"
              placeholder="Search roles…"
              value={roleSearch}
              onChange={(event) => setRoleSearch(event.target.value)}
            />
            {filteredRoles.length === 0 && (
              <div className="state empty">No roles match this search.</div>
            )}
            <div className="rbac-role-list">
              {filteredRoles.map((role) => (
                <article
                  className={`rbac-role-card ${selectedRoleKey === role.key ? 'selected' : ''}`}
                  key={role.key}
                >
                  <button
                    type="button"
                    className="rbac-role-select"
                    onClick={() => setSelectedRoleKey(role.key)}
                  >
                    <span className="row-title">
                      <strong>{role.name}</strong>
                      <Status value={role.system ? 'SYSTEM' : 'CUSTOM'} />
                    </span>
                    <span>
                      {role.key} · {permissionKeys(role).length} permissions ·{' '}
                      {role._count?.assignments ?? 0} assignments
                    </span>
                    <small>{role.description || 'No description provided.'}</small>
                  </button>
                  {role.system ? (
                    <span className="muted rbac-protected">Protected</span>
                  ) : (
                    <button type="button" className="secondary" onClick={() => startEdit(role)}>
                      Edit
                    </button>
                  )}
                </article>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="form-heading">
              <div>
                <p className="eyebrow">ROLE EDITOR</p>
                <h2>{editingRoleKey ? `Edit ${editingRoleKey}` : 'Create a custom role'}</h2>
              </div>
              {editingRoleKey && (
                <button type="button" className="secondary" onClick={startCreate}>
                  New role
                </button>
              )}
            </div>
            {!roleEditorOpen ? (
              <p className="muted">
                Choose “Create custom role” or edit a custom role to manage its permissions.
              </p>
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void runMutation(async () => {
                    const body = {
                      name: roleForm.name,
                      description: roleForm.description,
                      permissions: roleForm.permissions,
                    };
                    if (editingRoleKey) {
                      await api(`/admin/rbac/roles/${encodeURIComponent(editingRoleKey)}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ permissions: roleForm.permissions }),
                      });
                      await refreshAfterMutation('Custom role permissions updated.');
                    } else {
                      await api('/admin/rbac/roles', {
                        method: 'POST',
                        body: JSON.stringify({ key: roleForm.key, ...body }),
                      });
                      setRoleEditorOpen(false);
                      await refreshAfterMutation('Custom role created.');
                    }
                  });
                }}
              >
                <div className="form-grid">
                  <label>
                    Role key
                    <input
                      required
                      disabled={Boolean(editingRoleKey)}
                      value={roleForm.key}
                      onChange={(event) => setRoleForm({ ...roleForm, key: event.target.value })}
                      placeholder="CONTENT_REVIEWER"
                    />
                  </label>
                  <label>
                    Display name
                    <input
                      required
                      value={roleForm.name}
                      onChange={(event) => setRoleForm({ ...roleForm, name: event.target.value })}
                      placeholder="Content reviewer"
                    />
                  </label>
                </div>
                <label>
                  Description
                  <textarea
                    className="rbac-description"
                    value={roleForm.description}
                    onChange={(event) =>
                      setRoleForm({ ...roleForm, description: event.target.value })
                    }
                    placeholder="What this role is allowed to do"
                  />
                </label>
                <div className="rbac-permission-toolbar">
                  <strong>Permissions ({roleForm.permissions.length})</strong>
                  <input
                    aria-label="Search permissions"
                    placeholder="Search permissions…"
                    value={permissionSearch}
                    onChange={(event) => setPermissionSearch(event.target.value)}
                  />
                </div>
                <div className="rbac-permission-groups">
                  {groupedPermissions.map(([group, groupPermissions]) => (
                    <fieldset key={group} className="rbac-permission-group">
                      <legend>{group}</legend>
                      {groupPermissions.map((permission) => (
                        <label key={permission.key} className="rbac-permission-option">
                          <input
                            type="checkbox"
                            checked={roleForm.permissions.includes(permission.key)}
                            disabled={permission.reserved}
                            onChange={() => togglePermission(permission.key)}
                          />
                          <span>
                            <strong>{permission.key}</strong>
                            <small>
                              {permission.description}
                              {permission.reserved ? ' · SUPER_ADMIN only' : ''}
                            </small>
                          </span>
                        </label>
                      ))}
                    </fieldset>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={
                    !roleForm.key.trim() ||
                    !roleForm.name.trim() ||
                    roleForm.permissions.some(
                      (key) => permissions.find((permission) => permission.key === key)?.reserved,
                    )
                  }
                >
                  Save role
                </button>
              </form>
            )}
          </div>
        </div>

        <aside className="rbac-side-column">
          <div className="panel">
            <p className="eyebrow">ADMINISTRATOR ACCESS</p>
            <h2>Inspect assignments and overrides</h2>
            <input
              aria-label="Search administrators"
              placeholder="Search administrators…"
              value={adminSearch}
              onChange={(event) => setAdminSearch(event.target.value)}
            />
            <label>
              Select administrator
              <select
                aria-label="Select administrator"
                value={selectedAdminId}
                onChange={(event) => setSelectedAdminId(event.target.value)}
              >
                <option value="">Choose an administrator</option>
                {filteredAdmins.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name || item.email} · {item.role}
                  </option>
                ))}
              </select>
            </label>
            {filteredAdmins.length === 0 && (
              <p className="muted">No administrators match this search.</p>
            )}
          </div>
          {loadingAccess && (
            <div className="state" role="status">
              Loading effective access…
            </div>
          )}
          {access && !loadingAccess && (
            <div className="panel rbac-access-panel">
              <div className="form-heading">
                <div>
                  <p className="eyebrow">SELECTED ADMINISTRATOR</p>
                  <h2>{access.admin.name || access.admin.email}</h2>
                </div>
                <Status value={access.admin.role} />
              </div>
              <p className="muted">{access.admin.email}</p>
              <h3>Assigned roles</h3>
              <div className="rbac-chip-list">
                {access.roles.length === 0 && (
                  <span className="muted">No dynamic roles assigned.</span>
                )}
                {access.roles.map((role) => (
                  <span className="rbac-chip" key={role.key}>
                    {role.name}
                    {role.system ? ' · system' : ''}
                    <button
                      type="button"
                      aria-label={`Remove ${role.name}`}
                      onClick={() =>
                        void runMutation(async () => {
                          await api(
                            `/admin/rbac/users/${access.admin.id}/roles/${encodeURIComponent(role.key)}`,
                            { method: 'DELETE' },
                          );
                          await refreshAfterMutation(`${role.name} removed.`);
                        })
                      }
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <label>
                Assign eligible role
                <select
                  aria-label="Assign eligible role"
                  value={selectedRoleKey}
                  onChange={(event) => setSelectedRoleKey(event.target.value)}
                >
                  <option value="">Choose a role</option>
                  {assignableRoles.map((role) => (
                    <option key={role.key} value={role.key}>
                      {role.name} · {role.system ? 'system' : 'custom'}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="secondary"
                disabled={!selectedRoleKey || selectedRoleKey === 'SUPER_ADMIN'}
                onClick={() =>
                  void runMutation(async () => {
                    await api(`/admin/rbac/users/${access.admin.id}/roles`, {
                      method: 'POST',
                      body: JSON.stringify({ roleKey: selectedRoleKey }),
                    });
                    setSelectedRoleKey('');
                    await refreshAfterMutation('Role assigned.');
                  })
                }
              >
                Assign role
              </button>
              <h3>Permission overrides</h3>
              <div className="rbac-override-form">
                <select
                  aria-label="Override permission"
                  value={overridePermission}
                  onChange={(event) => setOverridePermission(event.target.value)}
                >
                  <option value="">Choose a permission</option>
                  {permissions
                    .filter((permission) => !permission.reserved)
                    .map((permission) => (
                      <option key={permission.key} value={permission.key}>
                        {permission.key}
                      </option>
                    ))}
                </select>
                <select
                  aria-label="Override effect"
                  value={overrideEffect}
                  onChange={(event) => setOverrideEffect(event.target.value as 'GRANT' | 'DENY')}
                >
                  <option value="GRANT">GRANT</option>
                  <option value="DENY">DENY</option>
                </select>
                <button
                  type="button"
                  disabled={!overridePermission}
                  onClick={() =>
                    void runMutation(async () => {
                      await api(`/admin/rbac/users/${access.admin.id}/overrides`, {
                        method: 'PUT',
                        body: JSON.stringify({
                          permissionKey: overridePermission,
                          effect: overrideEffect,
                        }),
                      });
                      setOverridePermission('');
                      await refreshAfterMutation('Permission override saved.');
                    })
                  }
                >
                  Save override
                </button>
              </div>
              <div className="rbac-override-list">
                {access.overrides.length === 0 && (
                  <span className="muted">No individual overrides.</span>
                )}
                {access.overrides.map((override) => (
                  <div className="rbac-override-row" key={override.permissionKey}>
                    <span>
                      <strong>{override.permissionKey}</strong>
                      <Status value={override.effect} />
                    </span>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() =>
                        void runMutation(async () => {
                          await api(
                            `/admin/rbac/users/${access.admin.id}/overrides/${encodeURIComponent(override.permissionKey)}`,
                            { method: 'DELETE' },
                          );
                          await refreshAfterMutation('Permission override cleared.');
                        })
                      }
                    >
                      Clear
                    </button>
                  </div>
                ))}
              </div>
              <h3>Effective permissions</h3>
              <p className="muted">A DENY always wins over inherited grants.</p>
              <div className="rbac-effective-list">
                {access.effectivePermissions.length === 0 ? (
                  <span className="muted">No effective permissions.</span>
                ) : (
                  access.effectivePermissions.map((key) => (
                    <span
                      className={`rbac-effective-key ${overrideByKey.get(key)?.effect === 'DENY' ? 'denied' : ''}`}
                      key={key}
                    >
                      {key}
                      {rolePermissionKeys.has(key) ? '' : ' · override'}
                    </span>
                  ))
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function Status({ value }: { value: string }) {
  return <span className={`status status-${value.toLowerCase()}`}>{value}</span>;
}

export default RbacManagement;
