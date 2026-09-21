'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from './AdminClient';

type Settings = {
  handle: string;
  headerMessage: string;
  defaultPrompt: string;
  communityButtonText: string;
  communityPath: '/confessions';
  bottomButtonText: string;
  profileImageUrl: string | null;
  themePreset: string;
  maxCharacters: number;
  cardTextSize: number;
  previewLines: number;
  prompts: string[];
};

const PROFILE_URL = 'https://www.confessions.live/collegeconfession';
const defaults: Settings = {
  handle: '@college.confession.ggv',
  headerMessage: 'send me anonymous weekly Confession!',
  defaultPrompt: 'Are u talking to anyone??',
  communityButtonText: 'Visit Community',
  communityPath: '/confessions',
  bottomButtonText: 'Get your own messages!',
  profileImageUrl: null,
  themePreset: 'sunset',
  maxCharacters: 1000,
  cardTextSize: 16,
  previewLines: 5,
  prompts: ['Are u talking to anyone??'],
};

function PhonePreview({ settings }: { settings: Settings }) {
  return (
    <div className={`profile-phone-preview college-theme-${settings.themePreset}`}>
      <div className="profile-preview-card">
        <div className="profile-preview-header">
          <div className="profile-preview-avatar">
            {settings.profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.profileImageUrl} alt="" />
            ) : (
              '♛'
            )}
          </div>
          <div>
            <strong>{settings.handle || defaults.handle}</strong>
            <span>{settings.headerMessage || defaults.headerMessage}</span>
          </div>
        </div>
        <div className="profile-preview-message">
          {settings.defaultPrompt || defaults.defaultPrompt}
        </div>
        <div className="profile-preview-counter">0/{settings.maxCharacters}</div>
        <div className="profile-preview-anonymous">🔒 anonymous q&amp;a</div>
        <div className="profile-preview-send">SEND!</div>
        <p>👇 Join your college confession community 👇</p>
        <div className="profile-preview-bottom">{settings.communityButtonText}</div>
        <div className="profile-preview-bottom">{settings.bottomButtonText}</div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const [settings, setSettings] = useState<Settings>(defaults);
  const [savedSettings, setSavedSettings] = useState<Settings>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const dirty = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(savedSettings),
    [settings, savedSettings],
  );

  useEffect(() => {
    api('/admin/profile-settings')
      .then((value) => {
        const next = {
          ...defaults,
          ...value,
          prompts: value.prompts?.length ? value.prompts : defaults.prompts,
        };
        setSettings(next);
        setSavedSettings(next);
      })
      .catch((caught) =>
        setError(caught instanceof Error ? caught.message : 'Unable to load profile settings.'),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
    setNotice('');
  }
  function updatePrompt(index: number, value: string) {
    update(
      'prompts',
      settings.prompts.map((item, i) => (i === index ? value : item)),
    );
  }
  async function chooseImage(file: File | undefined) {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Use a PNG, JPG, or WEBP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Images must be 5 MB or smaller.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const body = new FormData();
      body.append('file', file);
      const result = await api('/admin/profile-image', { method: 'POST', body });
      update('profileImageUrl', result.url);
      setFileInfo({ name: file.name, size: file.size });
      setNotice('Image uploaded. Save changes to publish it on the profile.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Image upload failed.');
    } finally {
      setUploading(false);
    }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    setError('');
    try {
      const payload = {
        handle: settings.handle,
        headerMessage: settings.headerMessage,
        defaultPrompt: settings.defaultPrompt,
        communityButtonText: settings.communityButtonText,
        communityPath: settings.communityPath,
        bottomButtonText: settings.bottomButtonText,
        profileImageUrl: settings.profileImageUrl,
        themePreset: settings.themePreset,
        maxCharacters: Number(settings.maxCharacters),
        cardTextSize: Number(settings.cardTextSize),
        previewLines: Number(settings.previewLines),
        prompts: settings.prompts.filter((item) => item.trim()),
      };
      const saved = await api('/admin/profile-settings', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      const next = {
        ...defaults,
        ...saved,
        prompts: saved.prompts?.length ? saved.prompts : defaults.prompts,
      };
      setSettings(next);
      setSavedSettings(next);
      setNotice('Profile page changes saved successfully.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save profile settings.');
    } finally {
      setSaving(false);
    }
  }
  function resetToDefault() {
    if (!confirm('Reset the profile design to the default College Confession configuration?'))
      return;
    setSettings({ ...defaults, prompts: [...defaults.prompts] });
    setFileInfo(null);
    setNotice('Defaults restored locally. Save changes to apply them.');
    setError('');
  }
  async function copyProfileLink() {
    await navigator.clipboard.writeText(PROFILE_URL);
    setNotice('Profile link copied.');
  }
  async function shareProfile() {
    if (navigator.share) await navigator.share({ title: 'College Confession', url: PROFILE_URL });
    else await copyProfileLink();
  }

  if (loading) return <div className="state">Loading profile settings…</div>;
  return (
    <section className="profile-settings-page">
      <div className="profile-settings-heading">
        <div>
          <p className="eyebrow">PROFILE PAGE</p>
          <h1>College Confession Page</h1>
          <p className="muted">
            Manage the content and appearance of your public confession profile.
          </p>
          <a className="profile-public-link" href={PROFILE_URL} target="_blank" rel="noreferrer">
            {PROFILE_URL} ↗
          </a>
        </div>
        <div className="profile-heading-actions">
          <a className="secondary" href={PROFILE_URL} target="_blank" rel="noreferrer">
            Preview Public Page ↗
          </a>
          <button type="button" className="secondary" onClick={copyProfileLink}>
            Copy Profile Link
          </button>
          <button type="button" className="secondary" onClick={shareProfile}>
            Share Profile
          </button>
        </div>
      </div>
      <div className="profile-settings-layout">
        <form className="panel profile-settings-form" onSubmit={save}>
          <div className={`save-state ${dirty ? 'save-state--dirty' : ''}`}>
            {saving ? 'Saving…' : dirty ? 'Unsaved changes' : 'Saved'}
          </div>
          <h2>Content</h2>
          <label>
            Username / Handle
            <input
              value={settings.handle}
              onChange={(e) => update('handle', e.target.value)}
              maxLength={80}
              required
            />
          </label>
          <label>
            Header Message
            <input
              value={settings.headerMessage}
              onChange={(e) => update('headerMessage', e.target.value)}
              maxLength={120}
              required
            />
            <small>{settings.headerMessage.length}/120</small>
          </label>
          <label>
            Message Placeholder
            <input
              value={settings.defaultPrompt}
              onChange={(e) => update('defaultPrompt', e.target.value)}
              maxLength={120}
              required
            />
          </label>
          <label>
            Maximum Characters <span className="muted">100–5000 characters</span>
            <input
              type="number"
              min="100"
              max="5000"
              value={settings.maxCharacters}
              onChange={(e) => update('maxCharacters', Number(e.target.value))}
              required
            />
          </label>
          <label>
            Confession Card Text Size <span className="muted">14–20px</span>
            <select
              value={settings.cardTextSize}
              onChange={(e) => update('cardTextSize', Number(e.target.value))}
            >
              {[14, 15, 16, 17, 18, 19, 20].map((size) => (
                <option key={size} value={size}>
                  {size}px
                </option>
              ))}
            </select>
          </label>
          <label>
            Preview Lines <span className="muted">3–6 lines</span>
            <select
              value={settings.previewLines}
              onChange={(e) => update('previewLines', Number(e.target.value))}
            >
              {[3, 4, 5, 6].map((lines) => (
                <option key={lines} value={lines}>
                  {lines} lines
                </option>
              ))}
            </select>
          </label>

          <h2>Community</h2>
          <label>
            Community Button Text
            <input
              value={settings.communityButtonText}
              onChange={(e) => update('communityButtonText', e.target.value)}
              maxLength={80}
              required
            />
          </label>
          <label>
            Community Destination
            <select
              value={settings.communityPath}
              onChange={(e) => update('communityPath', e.target.value as '/confessions')}
            >
              <option value="/confessions">/confessions</option>
            </select>
          </label>
          <label>
            Bottom Button Text
            <input
              value={settings.bottomButtonText}
              onChange={(e) => update('bottomButtonText', e.target.value)}
              maxLength={80}
              required
            />
          </label>

          <h2>Profile Image</h2>
          <div className="profile-upload-row">
            <div className="profile-upload-avatar">
              {settings.profileImageUrl ? (
                <img src={settings.profileImageUrl} alt="Selected profile logo preview" />
              ) : (
                '♛'
              )}
            </div>
            <div>
              <input
                ref={fileInput}
                className="sr-only"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                aria-label="Upload profile image"
                onChange={(e) => void chooseImage(e.target.files?.[0])}
              />
              <button
                type="button"
                className="secondary"
                disabled={uploading}
                onClick={() => fileInput.current?.click()}
              >
                {uploading
                  ? 'Uploading…'
                  : settings.profileImageUrl
                    ? 'Replace Image'
                    : 'Upload Image'}
              </button>
              {settings.profileImageUrl && (
                <button
                  type="button"
                  className="danger profile-remove"
                  onClick={() => {
                    update('profileImageUrl', null);
                    setFileInfo(null);
                  }}
                >
                  Remove / Revert
                </button>
              )}
              <small>PNG, JPG, or WEBP · max 5 MB</small>
              {fileInfo && (
                <small>
                  {fileInfo.name} · {(fileInfo.size / 1024 / 1024).toFixed(2)} MB
                </small>
              )}
            </div>
          </div>
          <label>
            Gradient Preset
            <select
              value={settings.themePreset}
              onChange={(e) => update('themePreset', e.target.value)}
            >
              {['sunset', 'pink-flame', 'coral', 'ocean', 'midnight'].map((theme) => (
                <option key={theme} value={theme}>
                  {theme.replace('-', ' ')}
                </option>
              ))}
            </select>
          </label>

          <div className="profile-prompts-heading">
            <h2>Random Prompt Suggestions</h2>
            <button
              className="secondary"
              type="button"
              onClick={() => update('prompts', [...settings.prompts, ''])}
            >
              + Add Prompt
            </button>
          </div>
          <div className="profile-prompts-list">
            {settings.prompts.map((prompt, index) => (
              <div className="profile-prompt-row" key={`${index}-${prompt}`}>
                <span aria-hidden="true">⁙</span>
                <input
                  aria-label={`Prompt ${index + 1}`}
                  value={prompt}
                  onChange={(e) => updatePrompt(index, e.target.value)}
                  maxLength={120}
                />
                <button
                  className="danger"
                  type="button"
                  aria-label={`Delete prompt ${index + 1}`}
                  onClick={() =>
                    update(
                      'prompts',
                      settings.prompts.filter((_, i) => i !== index),
                    )
                  }
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="notice success" role="status">
              {notice}
            </div>
          )}
          <div className="profile-save-actions">
            <button className="profile-save" disabled={saving}>
              {saving ? 'Saving…' : dirty ? 'Save Changes' : 'Saved'}
            </button>
            <button type="button" className="secondary" onClick={resetToDefault}>
              Reset to Default
            </button>
          </div>
        </form>
        <aside className="profile-preview-column">
          <p className="eyebrow">LIVE MOBILE PREVIEW</p>
          <PhonePreview settings={settings} />
        </aside>
      </div>
    </section>
  );
}
