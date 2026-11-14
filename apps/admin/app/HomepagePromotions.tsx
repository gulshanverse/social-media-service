'use client';

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import {
  garbaThemes,
  normalizeImportedTheme,
  normalizeTheme,
  themePresets,
  themes,
} from '@ggv/themes';
import type { PromotionLayoutSettings, PublicPromotionTheme } from '@ggv/types';
import { HomepagePromotionBanner } from '@ggv/ui';

type PublicationStatus = 'DRAFT' | 'PUBLISHED' | 'DISABLED';
type PromotionState = PublicationStatus | 'SCHEDULED' | 'EXPIRED';
const BACKGROUND_PRESETS = ['aurora', 'sunset', 'ocean', 'midnight'] as const;
type BackgroundPreset = (typeof BACKGROUND_PRESETS)[number];
type Promotion = {
  id: string;
  title: string;
  description: string | null;
  badgeText: string | null;
  desktopImageUrl: string | null;
  desktopImageKey: string | null;
  backgroundPreset: string;
  themeId: string | null;
  layoutSettings: PromotionLayoutSettings;
  mobileImageUrl: string | null;
  mobileImageKey: string | null;
  imageAlt: string | null;
  ctaLabel: string | null;
  destinationUrl: string | null;
  status: PublicationStatus;
  state: PromotionState;
  priority: number;
  startAt: string | null;
  endAt: string | null;
  createdAt: string;
  updatedAt: string;
};
type PromotionPage = {
  items: Promotion[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};
type PromotionForm = {
  title: string;
  description: string;
  badgeText: string;
  desktopImageUrl: string;
  desktopImageKey: string;
  backgroundPreset: BackgroundPreset;
  themeId: string;
  layoutSettings: PromotionLayoutSettings;
  mobileImageUrl: string;
  mobileImageKey: string;
  imageAlt: string;
  ctaLabel: string;
  destinationUrl: string;
  status: PublicationStatus;
  priority: number;
  startAt: string;
  endAt: string;
};
type UploadResult = { url: string; key: string; width: number; height: number; size: number };
type Props = {
  api: (path: string, init?: RequestInit) => Promise<any>;
  uploadFile: (
    path: string,
    file: File,
    onProgress: (percent: number) => void,
  ) => Promise<UploadResult>;
};

type EditorMode = 'create' | 'edit' | 'preview' | null;

const DEFAULT_UPLOAD_LIMIT = 5 * 1024 * 1024;
const configuredUploadLimit = Number(
  process.env.NEXT_PUBLIC_HOMEPAGE_PROMOTION_MAX_UPLOAD_BYTES ?? DEFAULT_UPLOAD_LIMIT,
);
const MAX_UPLOAD_BYTES =
  Number.isSafeInteger(configuredUploadLimit) &&
  configuredUploadLimit >= 1024 * 1024 &&
  configuredUploadLimit <= 20 * 1024 * 1024
    ? configuredUploadLimit
    : DEFAULT_UPLOAD_LIMIT;
const MAX_UPLOAD_LABEL = `${(MAX_UPLOAD_BYTES / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} MB`;
const DEFAULT_LAYOUT: PromotionLayoutSettings = {
  version: 1,
  mode: 'auto',
  headingFont: 'inherit',
  bodyFont: 'inherit',
  headingSize: 3.2,
  descriptionSize: 1,
  headingWeight: 800,
  descriptionWeight: 500,
  headingLineHeight: 1.02,
  descriptionLineHeight: 1.45,
  letterSpacing: 'tight',
  headingTransform: 'none',
  alignment: 'left',
  horizontalPosition: 'left',
  verticalPosition: 'bottom',
  contentWidth: 'standard',
  padding: 'comfortable',
  spacing: 'comfortable',
};
const LEGACY_THEME: PublicPromotionTheme = {
  id: 'midnight',
  name: 'Midnight',
  background: '#090c21',
  gradient: 'linear-gradient(125deg,#090c21,#211447 52%,#5d275c)',
  textColor: '#fff',
  accentColor: '#c36cff',
  fontFamily: 'Inter',
  radius: '24px',
};
type ThemeLifecycle = 'AVAILABLE' | 'DRAFT' | 'SCHEDULED' | 'EXPIRED' | 'UNPUBLISHED';
type ThemeChoice = PublicPromotionTheme & {
  source: 'built-in' | 'database';
  value: string;
  lifecycle: ThemeLifecycle;
};
function publicTheme(theme: any): PublicPromotionTheme {
  const normalized = normalizeTheme({ ...theme, slug: theme.slug ?? theme.id });
  return {
    id: normalized.slug,
    name: normalized.name,
    background: normalized.background,
    gradient: normalized.gradient,
    textColor: normalized.textColor,
    accentColor: normalized.accentColor,
    fontFamily: normalized.fontFamily,
    radius: `${normalized.radius}px`,
  };
}
function builtInThemes(): ThemeChoice[] {
  const values = [...themes, ...garbaThemes].map((theme) => ({
    ...publicTheme(theme),
    source: 'built-in' as const,
    value: `builtin:${theme.id}`,
    lifecycle: 'AVAILABLE' as const,
  }));
  for (const preset of themePresets)
    try {
      const theme = normalizeImportedTheme(preset).normalized;
      values.push({
        ...publicTheme(theme),
        source: 'built-in',
        value: `builtin:${preset.slug}`,
        lifecycle: 'AVAILABLE',
      });
    } catch {
      /* invalid registry entries are not selectable */
    }
  return Array.from(new Map(values.map((theme) => [theme.value, theme])).values());
}
function databaseThemeLifecycle(theme: {
  status?: string;
  startAt?: string | null;
  endAt?: string | null;
}): ThemeLifecycle {
  const now = Date.now();
  if (theme.status === 'DRAFT') return 'DRAFT';
  if (theme.endAt && new Date(theme.endAt).getTime() <= now) return 'EXPIRED';
  if (theme.startAt && new Date(theme.startAt).getTime() > now) return 'SCHEDULED';
  if (theme.status === 'SCHEDULED') return theme.startAt ? 'AVAILABLE' : 'SCHEDULED';
  return theme.status === 'ACTIVE' || theme.status === 'PUBLISHED' ? 'AVAILABLE' : 'UNPUBLISHED';
}
function lifecycleLabel(lifecycle: ThemeLifecycle) {
  return {
    AVAILABLE: 'available',
    DRAFT: 'draft · publish first',
    SCHEDULED: 'scheduled',
    EXPIRED: 'expired',
    UNPUBLISHED: 'unpublished',
  }[lifecycle];
}

const blankForm = (): PromotionForm => ({
  title: '',
  description: '',
  badgeText: '',
  desktopImageUrl: '',
  desktopImageKey: '',
  backgroundPreset: 'aurora',
  themeId: 'builtin:aurora',
  layoutSettings: DEFAULT_LAYOUT,
  mobileImageUrl: '',
  mobileImageKey: '',
  imageAlt: '',
  ctaLabel: '',
  destinationUrl: '',
  status: 'DRAFT',
  priority: 0,
  startAt: '',
  endAt: '',
});

function toLocalInput(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function toPayloadDate(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : '—';
}

function fromPromotion(promotion: Promotion): PromotionForm {
  return {
    title: promotion.title,
    description: promotion.description ?? '',
    badgeText: promotion.badgeText ?? '',
    desktopImageUrl: promotion.desktopImageUrl ?? '',
    desktopImageKey: promotion.desktopImageKey ?? '',
    backgroundPreset: (BACKGROUND_PRESETS.includes(promotion.backgroundPreset as BackgroundPreset)
      ? promotion.backgroundPreset
      : 'aurora') as BackgroundPreset,
    themeId: promotion.themeId ?? `builtin:${promotion.backgroundPreset || 'aurora'}`,
    layoutSettings: promotion.layoutSettings ?? DEFAULT_LAYOUT,
    mobileImageUrl: promotion.mobileImageUrl ?? '',
    mobileImageKey: promotion.mobileImageKey ?? '',
    imageAlt: promotion.imageAlt ?? '',
    ctaLabel: promotion.ctaLabel ?? '',
    destinationUrl: promotion.destinationUrl ?? '',
    status: promotion.status,
    priority: promotion.priority,
    startAt: toLocalInput(promotion.startAt),
    endAt: toLocalInput(promotion.endAt),
  };
}

export default function HomepagePromotions({ api, uploadFile }: Props) {
  const [items, setItems] = useState<Promotion[]>([]);
  const [pageData, setPageData] = useState<PromotionPage | null>(null);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<PromotionForm>(blankForm);
  const [mode, setMode] = useState<EditorMode>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [desktopProgress, setDesktopProgress] = useState<number | null>(null);
  const [mobileProgress, setMobileProgress] = useState<number | null>(null);
  const [desktopPreview, setDesktopPreview] = useState('');
  const [mobilePreview, setMobilePreview] = useState('');
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [artworkMode, setArtworkMode] = useState<'background' | 'upload'>('background');
  const [availableThemes, setAvailableThemes] = useState<ThemeChoice[]>(builtInThemes);
  const [themeLoading, setThemeLoading] = useState(true);
  const [themeError, setThemeError] = useState('');

  useEffect(() => {
    let active = true;
    setThemeLoading(true);
    api('/admin/themes?page=1&limit=100')
      .then((result) => {
        if (!active) return;
        const databaseThemes = (result.items ?? []).flatMap((theme: any) => {
          try {
            return [
              {
                ...publicTheme(theme),
                source: 'database' as const,
                value: `db:${theme.id}`,
                lifecycle: databaseThemeLifecycle(theme),
                name: theme.name,
              },
            ];
          } catch {
            return [];
          }
        });
        setAvailableThemes([...builtInThemes(), ...databaseThemes]);
      })
      .catch((requestError) => {
        if (active)
          setThemeError(
            requestError instanceof Error ? requestError.message : 'Themes unavailable.',
          );
      })
      .finally(() => {
        if (active) setThemeLoading(false);
      });
    return () => {
      active = false;
    };
  }, [api]);

  const load = useCallback(
    async (requestedPage = page) => {
      setLoading(true);
      setError('');
      try {
        const result = (await api(
          `/admin/homepage-promotions?page=${requestedPage}&limit=50`,
        )) as PromotionPage;
        const totalPages = Math.max(1, Math.ceil(result.total / result.limit));
        if (result.items.length === 0 && requestedPage > totalPages) {
          setPage(totalPages);
          return;
        }
        setItems(result.items ?? []);
        setPageData(result);
      } catch (requestError) {
        setError(
          requestError instanceof Error ? requestError.message : 'Promotions could not be loaded.',
        );
      } finally {
        setLoading(false);
      }
    },
    [api, page],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (desktopPreview.startsWith('blob:')) URL.revokeObjectURL(desktopPreview);
      if (mobilePreview.startsWith('blob:')) URL.revokeObjectURL(mobilePreview);
    };
  }, [desktopPreview, mobilePreview]);

  const editing = mode === 'edit' && Boolean(selectedId);
  const selectedTheme =
    availableThemes.find((theme) => theme.value === form.themeId) ?? LEGACY_THEME;

  const imageForPreview = useMemo(() => {
    if (previewViewport === 'mobile')
      return mobilePreview || form.mobileImageUrl || desktopPreview || form.desktopImageUrl;
    return desktopPreview || form.desktopImageUrl;
  }, [desktopPreview, form.desktopImageUrl, form.mobileImageUrl, mobilePreview, previewViewport]);

  function resetEditor() {
    setMode(null);
    setSelectedId(null);
    setForm(blankForm());
    setDesktopPreview('');
    setMobilePreview('');
    setDesktopProgress(null);
    setMobileProgress(null);
    setError('');
    setArtworkMode('background');
  }

  function openCreate() {
    setForm(blankForm());
    setSelectedId(null);
    setDesktopPreview('');
    setMobilePreview('');
    setArtworkMode('background');
    setMode('create');
    setError('');
    setMessage('');
  }

  function openEdit(item: Promotion, nextMode: EditorMode = 'edit') {
    setForm(fromPromotion(item));
    setArtworkMode(item.desktopImageUrl || item.mobileImageUrl ? 'upload' : 'background');
    setSelectedId(item.id);
    setDesktopPreview('');
    setMobilePreview('');
    setPreviewViewport('desktop');
    setMode(nextMode);
    setError('');
    setMessage('');
  }

  function updateField<K extends keyof PromotionForm>(key: K, value: PromotionForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  function updateLayout<K extends keyof PromotionLayoutSettings>(
    key: K,
    value: PromotionLayoutSettings[K],
  ) {
    setForm((current) => ({
      ...current,
      layoutSettings: { ...current.layoutSettings, [key]: value },
    }));
  }

  async function onFileChange(event: ChangeEvent<HTMLInputElement>, variant: 'desktop' | 'mobile') {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Choose a PNG, JPG, or WEBP image.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`Images must be ${MAX_UPLOAD_LABEL} or smaller.`);
      return;
    }
    setError('');
    const localUrl = URL.createObjectURL(file);
    if (variant === 'desktop') {
      setDesktopPreview(localUrl);
      setDesktopProgress(0);
    } else {
      setMobilePreview(localUrl);
      setMobileProgress(0);
    }
    try {
      const result = await uploadFile('/admin/homepage-promotions/upload', file, (percent) => {
        if (variant === 'desktop') setDesktopProgress(percent);
        else setMobileProgress(percent);
      });
      if (variant === 'desktop') {
        setForm((current) => ({
          ...current,
          desktopImageUrl: result.url,
          desktopImageKey: result.key,
        }));
        setDesktopPreview(result.url);
        setDesktopProgress(null);
      } else {
        setForm((current) => ({
          ...current,
          mobileImageUrl: result.url,
          mobileImageKey: result.key,
        }));
        setMobilePreview(result.url);
        setMobileProgress(null);
      }
      setMessage(
        `${variant === 'desktop' ? 'Desktop' : 'Mobile'} poster uploaded (${Math.round(result.size / 1024)} KB).`,
      );
    } catch (uploadError) {
      if (variant === 'desktop') {
        setDesktopProgress(null);
        setDesktopPreview(form.desktopImageUrl);
      } else {
        setMobileProgress(null);
        setMobilePreview(form.mobileImageUrl);
      }
      setError(uploadError instanceof Error ? uploadError.message : 'The image upload failed.');
    }
  }

  function validateForm(publishNow = false) {
    if (!form.title.trim()) return 'Enter a promotion title.';
    if (!BACKGROUND_PRESETS.includes(form.backgroundPreset))
      return 'Choose a valid built-in background.';
    const selectedThemeChoice = availableThemes.find((theme) => theme.value === form.themeId);
    if (
      (publishNow || form.status === 'PUBLISHED') &&
      form.themeId &&
      selectedThemeChoice?.lifecycle !== 'AVAILABLE'
    )
      return selectedThemeChoice
        ? `Theme “${selectedThemeChoice.name}” is ${lifecycleLabel(selectedThemeChoice.lifecycle)} and cannot publish this promotion.`
        : 'Choose an available theme before publishing.';
    if (Boolean(form.desktopImageUrl) !== Boolean(form.desktopImageKey))
      return 'Replace the desktop poster or remove it before saving.';
    if (Boolean(form.mobileImageUrl) !== Boolean(form.mobileImageKey))
      return 'Replace the mobile image or remove it before saving.';
    if (form.startAt && form.endAt && new Date(form.endAt) <= new Date(form.startAt))
      return 'The end date must be later than the start date.';
    if (form.destinationUrl) {
      const url = form.destinationUrl.trim();
      if (url.startsWith('//') || url.includes('\\')) return 'Use a site path or secure HTTPS URL.';
      if (!url.startsWith('/')) {
        try {
          const parsed = new URL(url);
          if (parsed.protocol !== 'https:' || parsed.username || parsed.password)
            return 'External campaign links must use HTTPS.';
        } catch {
          return 'Enter a valid site path or HTTPS URL.';
        }
      }
    }
    return '';
  }

  async function save(publishNow = false) {
    const validationError = validateForm(publishNow);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      badgeText: form.badgeText.trim() || null,
      desktopImageUrl: form.desktopImageUrl || null,
      desktopImageKey: form.desktopImageKey || null,
      backgroundPreset: form.backgroundPreset,
      themeId: form.themeId || null,
      layoutSettings: form.layoutSettings,
      mobileImageUrl: form.mobileImageUrl || null,
      mobileImageKey: form.mobileImageKey || null,
      imageAlt: form.imageAlt.trim() || null,
      ctaLabel: form.ctaLabel.trim() || null,
      destinationUrl: form.destinationUrl.trim() || null,
      status: publishNow ? 'PUBLISHED' : form.status,
      priority: Number(form.priority),
      startAt: toPayloadDate(form.startAt),
      endAt: toPayloadDate(form.endAt),
    };
    try {
      if (editing && selectedId) {
        await api(`/admin/homepage-promotions/${encodeURIComponent(selectedId)}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await api('/admin/homepage-promotions', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      await load();
      setMessage(
        publishNow ? 'Promotion published.' : editing ? 'Promotion saved.' : 'Draft saved.',
      );
      resetEditor();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'The promotion could not be saved.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function changePublication(item: Promotion) {
    setError('');
    setMessage('');
    try {
      const publish = item.status !== 'PUBLISHED';
      await api(
        `/admin/homepage-promotions/${encodeURIComponent(item.id)}/${publish ? 'publish' : 'unpublish'}`,
        {
          method: 'POST',
        },
      );
      await load();
      setMessage(publish ? `${item.title} is published.` : `${item.title} is now a draft.`);
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : 'The publication state could not be changed.',
      );
    }
  }

  async function remove(item: Promotion) {
    if (!window.confirm(`Delete “${item.title}”? This cannot be undone.`)) return;
    setError('');
    setMessage('');
    try {
      await api(`/admin/homepage-promotions/${encodeURIComponent(item.id)}`, { method: 'DELETE' });
      await load();
      setMessage('Promotion deleted.');
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : 'The promotion could not be deleted.',
      );
    }
  }

  async function reorder(item: Promotion, direction: -1 | 1) {
    const index = items.findIndex(({ id }) => id === item.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= items.length) return;
    const ordered = [...items];
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    setItems(ordered);
    try {
      await api('/admin/homepage-promotions/reorder', {
        method: 'POST',
        body: JSON.stringify({ ids: ordered.map(({ id }) => id) }),
      });
      await load();
    } catch (orderError) {
      setError(
        orderError instanceof Error
          ? orderError.message
          : 'The promotion order could not be saved.',
      );
      await load();
    }
  }

  return (
    <section className="workspace homepage-promotions-admin" aria-labelledby="promotions-heading">
      <div className="workspace-heading promotions-heading">
        <div>
          <p className="eyebrow">CAMPAIGN MANAGEMENT</p>
          <h1 id="promotions-heading">Homepage Promotions</h1>
          <p className="muted">
            Manage the posters and announcements shown beneath the community hero.
          </p>
        </div>
        <button type="button" onClick={openCreate}>
          Create promotion
        </button>
      </div>

      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="notice success" role="status">
          {message}
        </div>
      )}

      {mode && (
        <section className="promotion-editor" aria-labelledby="promotion-editor-heading">
          <div className="promotion-editor-heading">
            <div>
              <p className="eyebrow">
                {mode === 'create'
                  ? 'NEW CAMPAIGN'
                  : mode === 'preview'
                    ? 'LIVE-STYLE PREVIEW'
                    : 'EDIT CAMPAIGN'}
              </p>
              <h2 id="promotion-editor-heading">
                {mode === 'create' ? 'Create a promotion' : form.title || 'Promotion preview'}
              </h2>
            </div>
            <button type="button" className="secondary" onClick={resetEditor}>
              Close
            </button>
          </div>
          {mode === 'preview' ? (
            <div className="promotion-preview-panel">
              <div className="promotion-preview-switch" role="group" aria-label="Preview size">
                <button
                  type="button"
                  className={previewViewport === 'desktop' ? 'active' : 'secondary'}
                  onClick={() => setPreviewViewport('desktop')}
                >
                  Desktop
                </button>
                <button
                  type="button"
                  className={previewViewport === 'mobile' ? 'active' : 'secondary'}
                  onClick={() => setPreviewViewport('mobile')}
                >
                  Mobile
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setMode(selectedId ? 'edit' : 'create')}
                >
                  Back to editor
                </button>
              </div>
              <div className={`promotion-preview-card promotion-preview-card--${previewViewport}`}>
                <HomepagePromotionBanner
                  promotion={{
                    title: form.title || 'Promotion title',
                    description: form.description || null,
                    badgeText: form.badgeText || null,
                    desktopImageUrl: form.desktopImageUrl || null,
                    mobileImageUrl: form.mobileImageUrl || null,
                    imageAlt: form.imageAlt || null,
                    ctaLabel: form.ctaLabel || null,
                    destinationUrl: form.destinationUrl || null,
                  }}
                  theme={selectedTheme}
                  layoutSettings={form.layoutSettings}
                  image={imageForPreview}
                  interactiveCta={false}
                  headingLevel={3}
                />
              </div>
              <p className="muted">
                The preview uses the same poster crop and overlay hierarchy as the public homepage.
              </p>
            </div>
          ) : (
            <form
              className="promotion-form"
              onSubmit={(event) => {
                event.preventDefault();
                void save();
              }}
            >
              <div className="promotion-form-fields">
                <label>
                  Promotion title <span aria-hidden="true">*</span>
                  <input
                    maxLength={120}
                    required
                    value={form.title}
                    onChange={(event) => updateField('title', event.target.value)}
                  />
                </label>
                <label>
                  Publication state
                  <select
                    value={form.status}
                    onChange={(event) =>
                      updateField('status', event.target.value as PublicationStatus)
                    }
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="DISABLED">Disabled</option>
                  </select>
                </label>
                <label className="promotion-form-wide">
                  Short description
                  <textarea
                    maxLength={500}
                    rows={3}
                    value={form.description}
                    onChange={(event) => updateField('description', event.target.value)}
                  />
                </label>
                <label>
                  Eyebrow / badge text
                  <input
                    maxLength={80}
                    value={form.badgeText}
                    onChange={(event) => updateField('badgeText', event.target.value)}
                    placeholder="Optional"
                  />
                </label>
                <label>
                  Image alternative text
                  <input
                    maxLength={300}
                    value={form.imageAlt}
                    onChange={(event) => updateField('imageAlt', event.target.value)}
                    placeholder="Describe the poster for screen readers"
                  />
                </label>
                <label className="promotion-form-wide" htmlFor="artwork-mode">
                  <span>Artwork mode</span>
                  <select
                    id="artwork-mode"
                    value={artworkMode}
                    onChange={(event) =>
                      setArtworkMode(event.target.value as 'background' | 'upload')
                    }
                  >
                    <option value="background">Built-in background</option>
                    <option value="upload">Upload poster</option>
                  </select>
                  <small>Posters are optional. A built-in background is always available.</small>
                </label>
                <fieldset className="promotion-theme-section promotion-form-wide">
                  <legend>Visual theme</legend>
                  {themeLoading ? (
                    <p className="muted">Loading themes…</p>
                  ) : themeError ? (
                    <p className="notice error">{themeError} Built-in themes remain available.</p>
                  ) : null}
                  {!themeLoading && availableThemes.length === 0 ? (
                    <p className="muted">
                      No themes are available. The safe fallback will be used.
                    </p>
                  ) : (
                    <div className="promotion-theme-gallery" aria-label="Promotion themes">
                      {availableThemes.map((theme) => (
                        <button
                          type="button"
                          key={theme.value}
                          className={`promotion-theme-choice${form.themeId === theme.value ? ' is-selected' : ''}${theme.lifecycle !== 'AVAILABLE' ? ' is-unavailable' : ''}`}
                          onClick={() => updateField('themeId', theme.value)}
                          aria-pressed={form.themeId === theme.value}
                          aria-label={`${theme.name} (${lifecycleLabel(theme.lifecycle)})`}
                        >
                          <span
                            className="promotion-theme-swatch"
                            style={{
                              background: theme.gradient,
                              color: theme.textColor,
                              borderColor: theme.accentColor,
                            }}
                          />
                          <strong>{theme.name}</strong>
                          <small>
                            {theme.source} · {lifecycleLabel(theme.lifecycle)}
                          </small>
                        </button>
                      ))}
                    </div>
                  )}
                  {form.themeId &&
                    selectedTheme !== LEGACY_THEME &&
                    availableThemes.find((theme) => theme.value === form.themeId)?.lifecycle !==
                      'AVAILABLE' && (
                      <p className="notice error">
                        This theme can be saved for a draft, but publication is blocked until its
                        lifecycle is available.
                      </p>
                    )}
                  <label className="promotion-legacy-select">
                    Legacy background fallback
                    <select
                      value={form.backgroundPreset}
                      onChange={(event) =>
                        updateField('backgroundPreset', event.target.value as BackgroundPreset)
                      }
                    >
                      {BACKGROUND_PRESETS.map((preset) => (
                        <option key={preset} value={preset}>
                          {preset[0].toUpperCase() + preset.slice(1)}
                        </option>
                      ))}
                    </select>
                  </label>
                </fieldset>
                <fieldset className="promotion-layout-section promotion-form-wide">
                  <legend>Banner layout &amp; typography</legend>
                  <div className="promotion-layout-grid">
                    <label>
                      Layout mode
                      <select
                        value={form.layoutSettings.mode}
                        onChange={(event) =>
                          updateLayout(
                            'mode',
                            event.target.value as PromotionLayoutSettings['mode'],
                          )
                        }
                      >
                        <option value="auto">Automatic</option>
                        <option value="manual">Manual</option>
                      </select>
                    </label>
                    <label>
                      Alignment
                      <select
                        value={form.layoutSettings.alignment}
                        onChange={(event) =>
                          updateLayout(
                            'alignment',
                            event.target.value as PromotionLayoutSettings['alignment'],
                          )
                        }
                      >
                        <option>left</option>
                        <option>center</option>
                        <option>right</option>
                      </select>
                    </label>
                    <label>
                      Horizontal placement
                      <select
                        value={form.layoutSettings.horizontalPosition}
                        onChange={(event) =>
                          updateLayout(
                            'horizontalPosition',
                            event.target.value as PromotionLayoutSettings['horizontalPosition'],
                          )
                        }
                      >
                        <option>left</option>
                        <option>center</option>
                        <option>right</option>
                      </select>
                    </label>
                    <label>
                      Vertical placement
                      <select
                        value={form.layoutSettings.verticalPosition}
                        onChange={(event) =>
                          updateLayout(
                            'verticalPosition',
                            event.target.value as PromotionLayoutSettings['verticalPosition'],
                          )
                        }
                      >
                        <option>top</option>
                        <option>center</option>
                        <option>bottom</option>
                      </select>
                    </label>
                    <label>
                      Heading font
                      <select
                        value={form.layoutSettings.headingFont}
                        onChange={(event) =>
                          updateLayout(
                            'headingFont',
                            event.target.value as PromotionLayoutSettings['headingFont'],
                          )
                        }
                      >
                        <option>inherit</option>
                        <option>Inter</option>
                        <option>Poppins</option>
                        <option>Space Grotesk</option>
                        <option>DM Sans</option>
                        <option>Georgia</option>
                      </select>
                    </label>
                    <label>
                      Body font
                      <select
                        value={form.layoutSettings.bodyFont}
                        onChange={(event) =>
                          updateLayout(
                            'bodyFont',
                            event.target.value as PromotionLayoutSettings['bodyFont'],
                          )
                        }
                      >
                        <option>inherit</option>
                        <option>Inter</option>
                        <option>Poppins</option>
                        <option>Space Grotesk</option>
                        <option>DM Sans</option>
                        <option>Georgia</option>
                      </select>
                    </label>
                    <label>
                      Content width
                      <select
                        value={form.layoutSettings.contentWidth}
                        onChange={(event) =>
                          updateLayout(
                            'contentWidth',
                            event.target.value as PromotionLayoutSettings['contentWidth'],
                          )
                        }
                      >
                        <option>narrow</option>
                        <option>standard</option>
                        <option>wide</option>
                      </select>
                    </label>
                    <label>
                      Spacing
                      <select
                        value={form.layoutSettings.spacing}
                        onChange={(event) =>
                          updateLayout(
                            'spacing',
                            event.target.value as PromotionLayoutSettings['spacing'],
                          )
                        }
                      >
                        <option>compact</option>
                        <option>comfortable</option>
                        <option>airy</option>
                      </select>
                    </label>
                    <label>
                      Heading size
                      <input
                        type="number"
                        min={1.4}
                        max={5.5}
                        step={0.1}
                        value={form.layoutSettings.headingSize}
                        onChange={(event) =>
                          updateLayout('headingSize', Number(event.target.value))
                        }
                      />
                    </label>
                    <label>
                      Description size
                      <input
                        type="number"
                        min={0.7}
                        max={2}
                        step={0.05}
                        value={form.layoutSettings.descriptionSize}
                        onChange={(event) =>
                          updateLayout('descriptionSize', Number(event.target.value))
                        }
                      />
                    </label>
                    <label>
                      Heading weight
                      <select
                        value={form.layoutSettings.headingWeight}
                        onChange={(event) =>
                          updateLayout(
                            'headingWeight',
                            Number(event.target.value) as PromotionLayoutSettings['headingWeight'],
                          )
                        }
                      >
                        <option value={500}>500</option>
                        <option value={600}>600</option>
                        <option value={700}>700</option>
                        <option value={800}>800</option>
                      </select>
                    </label>
                    <label>
                      Text transform
                      <select
                        value={form.layoutSettings.headingTransform}
                        onChange={(event) =>
                          updateLayout(
                            'headingTransform',
                            event.target.value as PromotionLayoutSettings['headingTransform'],
                          )
                        }
                      >
                        <option>none</option>
                        <option>uppercase</option>
                        <option>capitalize</option>
                      </select>
                    </label>
                  </div>
                </fieldset>
                <PosterUpload
                  label="Desktop poster (optional)"
                  image={desktopPreview || form.desktopImageUrl}
                  progress={desktopProgress}
                  onChange={(event) => void onFileChange(event, 'desktop')}
                />
                <PosterUpload
                  label="Mobile poster (optional)"
                  image={mobilePreview || form.mobileImageUrl}
                  progress={mobileProgress}
                  onChange={(event) => void onFileChange(event, 'mobile')}
                />
                {(form.desktopImageUrl || form.mobileImageUrl) && (
                  <button
                    type="button"
                    className="secondary promotion-form-wide"
                    onClick={() => {
                      updateField('desktopImageUrl', '');
                      updateField('desktopImageKey', '');
                      updateField('mobileImageUrl', '');
                      updateField('mobileImageKey', '');
                      setDesktopPreview('');
                      setMobilePreview('');
                      setMessage('Uploaded artwork removed. The built-in background will be used.');
                    }}
                  >
                    Remove uploaded artwork
                  </button>
                )}
                <label>
                  CTA button label
                  <input
                    maxLength={60}
                    value={form.ctaLabel}
                    onChange={(event) => updateField('ctaLabel', event.target.value)}
                    placeholder="e.g. Explore event"
                  />
                </label>
                <label>
                  CTA destination URL
                  <input
                    maxLength={2048}
                    value={form.destinationUrl}
                    onChange={(event) => updateField('destinationUrl', event.target.value)}
                    placeholder="/events or https://example.com"
                  />
                </label>
                <label>
                  Start date and time
                  <input
                    type="datetime-local"
                    value={form.startAt}
                    onChange={(event) => updateField('startAt', event.target.value)}
                  />
                  <small>Uses your browser’s local time; saved as UTC.</small>
                </label>
                <label>
                  End date and time
                  <input
                    type="datetime-local"
                    value={form.endAt}
                    onChange={(event) => updateField('endAt', event.target.value)}
                  />
                  <small>After this time, a published promotion is hidden automatically.</small>
                </label>
                <label>
                  Display priority
                  <input
                    type="number"
                    min={-10000}
                    max={10000}
                    step={1}
                    value={form.priority}
                    onChange={(event) => updateField('priority', Number(event.target.value))}
                  />
                </label>
              </div>
              <div className="promotion-editor-actions">
                <button type="button" className="secondary" onClick={() => setMode('preview')}>
                  Preview
                </button>
                <button
                  type="submit"
                  className="secondary"
                  disabled={saving || desktopProgress !== null || mobileProgress !== null}
                >
                  {saving ? 'Saving…' : 'Save draft'}
                </button>
                <button
                  type="button"
                  disabled={saving || desktopProgress !== null || mobileProgress !== null}
                  onClick={() => void save(true)}
                >
                  {saving ? 'Publishing…' : 'Publish'}
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      <div className="promotion-list-heading">
        <div>
          <h2>
            All promotions <span>{pageData?.total ?? items.length}</span>
          </h2>
          <p className="muted">
            Published banners appear automatically when their schedule is active. Showing page{' '}
            {pageData?.page ?? page} of{' '}
            {pageData ? Math.max(1, Math.ceil(pageData.total / pageData.limit)) : 1}.
          </p>
        </div>
      </div>
      {loading ? (
        <div className="state" role="status">
          Loading promotions…
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <strong>No promotions yet</strong>
          <p>Create a draft, preview it on desktop and mobile, then publish when it is ready.</p>
          <button type="button" onClick={openCreate}>
            Create the first promotion
          </button>
        </div>
      ) : (
        <div className="promotion-list">
          {items.map((item, index) => (
            <article className="promotion-row" key={item.id}>
              <div className="promotion-row-poster">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {item.desktopImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.desktopImageUrl} alt={item.imageAlt || item.title} />
                ) : (
                  <div
                    className={`promotion-row-background promotion-background--${BACKGROUND_PRESETS.includes(item.backgroundPreset as BackgroundPreset) ? item.backgroundPreset : 'aurora'}`}
                    aria-label="Built-in background preview"
                  />
                )}
              </div>
              <div className="promotion-row-details">
                <div className="promotion-row-title">
                  <h3>{item.title}</h3>
                  <span
                    className={`promotion-status promotion-status--${item.state.toLowerCase()}`}
                  >
                    {item.state}
                  </span>
                </div>
                <p className="muted">{item.description || 'No description'}</p>
                <dl>
                  <div>
                    <dt>Window</dt>
                    <dd>
                      {formatDate(item.startAt)} – {formatDate(item.endAt)}
                    </dd>
                  </div>
                  <div>
                    <dt>Priority</dt>
                    <dd>{item.priority}</dd>
                  </div>
                  <div>
                    <dt>Destination</dt>
                    <dd>{item.destinationUrl || '—'}</dd>
                  </div>
                  <div>
                    <dt>Created</dt>
                    <dd>{formatDate(item.createdAt)}</dd>
                  </div>
                  <div>
                    <dt>Updated</dt>
                    <dd>{formatDate(item.updatedAt)}</dd>
                  </div>
                </dl>
                <div className="promotion-row-actions">
                  <button type="button" className="secondary" onClick={() => openEdit(item)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => openEdit(item, 'preview')}
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => void changePublication(item)}
                  >
                    {item.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    aria-label={`Move ${item.title} up`}
                    disabled={index === 0}
                    onClick={() => void reorder(item, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    aria-label={`Move ${item.title} down`}
                    disabled={index === items.length - 1}
                    onClick={() => void reorder(item, 1)}
                  >
                    ↓
                  </button>
                  <button type="button" className="danger" onClick={() => void remove(item)}>
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {pageData && pageData.total > 0 && (
        <nav className="promotion-pagination" aria-label="Promotion pages">
          <button
            type="button"
            className="secondary"
            disabled={pageData.page <= 1 || loading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </button>
          <span aria-live="polite">
            Page {pageData.page} of {Math.max(1, Math.ceil(pageData.total / pageData.limit))}
          </span>
          <button
            type="button"
            className="secondary"
            disabled={!pageData.hasMore || loading}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </button>
        </nav>
      )}
    </section>
  );
}

function PosterUpload({
  label,
  image,
  progress,
  required = false,
  onChange,
}: {
  label: string;
  image: string;
  progress: number | null;
  required?: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="promotion-upload">
      <label>
        {label}
        {required && <span aria-hidden="true"> *</span>}
        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onChange} />
        <small>PNG, JPG, or WEBP · up to {MAX_UPLOAD_LABEL}</small>
      </label>
      {image && (
        <div className="promotion-upload-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt={`${label} preview`} />
        </div>
      )}
      {progress !== null && (
        <div
          className="promotion-upload-progress"
          role="status"
          aria-label={`Upload ${progress}% complete`}
        >
          <progress max={100} value={progress} />
          <span>{progress}% uploaded</span>
        </div>
      )}
    </div>
  );
}
