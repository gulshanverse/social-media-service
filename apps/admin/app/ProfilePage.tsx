'use client';

import { useEffect, useState } from 'react';
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
  prompts: string[];
};

const defaults: Settings = {
  handle: '@college.confession.ggv',
  headerMessage: 'send me anonymous weekly Confession!',
  defaultPrompt: 'Are u talking to anyone??',
  communityButtonText: 'Visit Community',
  communityPath: '/confessions',
  bottomButtonText: 'Get your own messages!',
  profileImageUrl: null,
  themePreset: 'sunset',
  prompts: ['Are u talking to anyone??'],
};

function PhonePreview({ settings }: { settings: Settings }) {
  return (
    <div className={`profile-phone-preview college-theme-${settings.themePreset}`}>
      <div className="profile-preview-card">
        <div className="profile-preview-header">
          <div className="profile-preview-avatar">{settings.profileImageUrl ? '▣' : '♛'}</div>
          <div>
            <strong>{settings.handle || defaults.handle}</strong>
            <span>{settings.headerMessage || defaults.headerMessage}</span>
          </div>
        </div>
        <div className="profile-preview-message">
          {settings.defaultPrompt || defaults.defaultPrompt}
        </div>
        <div className="profile-preview-anonymous">🔒 anonymous q&amp;a</div>
        <div className="profile-preview-send">SEND!</div>
        <p>👇 Join your college confession community 👇</p>
        <div className="profile-preview-bottom">
          {settings.bottomButtonText || defaults.bottomButtonText}
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const [settings, setSettings] = useState<Settings>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api('/admin/profile-settings')
      .then((value) =>
        setSettings({
          ...defaults,
          ...value,
          prompts: value.prompts?.length ? value.prompts : defaults.prompts,
        }),
      )
      .catch((caught) =>
        setError(caught instanceof Error ? caught.message : 'Unable to load profile settings.'),
      )
      .finally(() => setLoading(false));
  }, []);

  function update(key: keyof Settings, value: string) {
    setSettings((current) => ({ ...current, [key]: value }));
    setNotice('');
  }

  function updatePrompt(index: number, value: string) {
    setSettings((current) => ({
      ...current,
      prompts: current.prompts.map((item, i) => (i === index ? value : item)),
    }));
    setNotice('');
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    setError('');
    try {
      const saved = await api('/admin/profile-settings', {
        method: 'PATCH',
        body: JSON.stringify({
          ...settings,
          prompts: settings.prompts.filter((item) => item.trim()),
        }),
      });
      setSettings({ ...defaults, ...saved });
      setNotice('Profile page changes saved successfully.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save profile settings.');
    } finally {
      setSaving(false);
    }
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
          <a
            className="profile-public-link"
            href="https://www.confessions.live/collegeconfession"
            target="_blank"
            rel="noreferrer"
          >
            https://www.confessions.live/collegeconfession ↗
          </a>
        </div>
        <div className="profile-heading-actions">
          <a
            className="secondary"
            href="https://www.confessions.live/collegeconfession"
            target="_blank"
            rel="noreferrer"
          >
            Preview Page ↗
          </a>
          <a
            className="secondary"
            href="https://www.confessions.live/confessions"
            target="_blank"
            rel="noreferrer"
          >
            Visit Community ↗
          </a>
        </div>
      </div>
      <div className="profile-settings-layout">
        <form className="panel profile-settings-form" onSubmit={save}>
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

          <h2>Personalization</h2>
          <label>
            Profile Image URL{' '}
            <span className="muted">Secure HTTPS image URL; upload storage is not configured.</span>
            <input
              value={settings.profileImageUrl ?? ''}
              onChange={(e) => update('profileImageUrl', e.target.value)}
              placeholder="https://…"
              type="url"
            />
          </label>
          <label>
            Gradient Preset
            <select
              value={settings.themePreset}
              onChange={(e) => update('themePreset', e.target.value)}
            >
              <option value="sunset">Sunset</option>
              <option value="pink-flame">Pink Flame</option>
              <option value="coral">Coral</option>
              <option value="ocean">Ocean</option>
              <option value="midnight">Midnight</option>
            </select>
          </label>

          <div className="profile-prompts-heading">
            <h2>Random Prompt Suggestions</h2>
            <button
              className="secondary"
              type="button"
              onClick={() =>
                setSettings((current) => ({ ...current, prompts: [...current.prompts, ''] }))
              }
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
                    setSettings((current) => ({
                      ...current,
                      prompts: current.prompts.filter((_, i) => i !== index),
                    }))
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
          <button className="profile-save" disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
        <aside className="profile-preview-column">
          <p className="eyebrow">LIVE PREVIEW</p>
          <PhonePreview settings={settings} />
        </aside>
      </div>
    </section>
  );
}
