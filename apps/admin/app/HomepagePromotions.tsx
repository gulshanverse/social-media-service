'use client';

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';

type PublicationStatus = 'DRAFT' | 'PUBLISHED' | 'DISABLED';
type PromotionState = PublicationStatus | 'SCHEDULED' | 'EXPIRED';
type Promotion = {
  id: string;
  title: string;
  description: string | null;
  badgeText: string | null;
  desktopImageUrl: string;
  desktopImageKey: string;
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
type PromotionForm = {
  title: string;
  description: string;
  badgeText: string;
  desktopImageUrl: string;
  desktopImageKey: string;
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

const blankForm = (): PromotionForm => ({
  title: '',
  description: '',
  badgeText: '',
  desktopImageUrl: '',
  desktopImageKey: '',
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
    desktopImageUrl: promotion.desktopImageUrl,
    desktopImageKey: promotion.desktopImageKey,
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

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api('/admin/homepage-promotions?page=1&limit=100');
      setItems(result.items ?? []);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Promotions could not be loaded.',
      );
    } finally {
      setLoading(false);
    }
  }, [api]);

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
  }

  function openCreate() {
    setForm(blankForm());
    setSelectedId(null);
    setDesktopPreview('');
    setMobilePreview('');
    setMode('create');
    setError('');
    setMessage('');
  }

  function openEdit(item: Promotion, nextMode: EditorMode = 'edit') {
    setForm(fromPromotion(item));
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

  function validateForm() {
    if (!form.title.trim()) return 'Enter a promotion title.';
    if (!form.desktopImageUrl || !form.desktopImageKey) return 'Upload a desktop poster image.';
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
    const validationError = validateForm();
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
      desktopImageUrl: form.desktopImageUrl,
      desktopImageKey: form.desktopImageKey,
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
                {(imageForPreview || form.desktopImageUrl) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageForPreview || form.desktopImageUrl}
                    alt={form.imageAlt || form.title || 'Promotion artwork'}
                  />
                )}
                <div className="promotion-preview-shade" />
                <div className="promotion-preview-copy">
                  {form.badgeText && <p className="promotion-preview-badge">{form.badgeText}</p>}
                  <h3>{form.title || 'Promotion title'}</h3>
                  {form.description && <p>{form.description}</p>}
                  {form.ctaLabel && (
                    <span className="promotion-preview-cta">{form.ctaLabel} ↗</span>
                  )}
                </div>
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
                <PosterUpload
                  label="Desktop poster"
                  required
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
            All promotions <span>{items.length}</span>
          </h2>
          <p className="muted">
            Published banners appear automatically when their schedule is active.
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
                <img src={item.desktopImageUrl} alt={item.imageAlt || item.title} />
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
