'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from './AdminClient';
import {
  defaultReadLiveConfessionButton,
  normalizeReadLiveConfessionButton,
  readLiveButtonAnimations,
  readLiveButtonAnimationSpeeds,
  readLiveButtonColorModes,
  readLiveButtonDirections,
  readLiveButtonGlowIntensities,
  readLiveConfessionButtonClassName,
  readLiveConfessionButtonCssVariables,
  type ReadLiveConfessionButtonConfig,
} from '@ggv/types';

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
  readLiveConfessionButton: ReadLiveConfessionButtonConfig;
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
  readLiveConfessionButton: defaultReadLiveConfessionButton,
};

const buttonPresets: Record<string, string[]> = {
  '🔥 Fire': ['#FF6B35', '#EF233C', '#FF2D75'],
  '💗 Candy': ['#FF2D75', '#D500F9', '#8B5CF6'],
  '🌌 Aurora': ['#22D3EE', '#2563EB', '#7C3AED'],
  '🌅 Sunset': ['#FACC15', '#F97316', '#EC4899', '#8B5CF6'],
  '💎 Ocean': ['#22D3EE', '#2563EB', '#4338CA'],
  '👑 Royal': ['#FACC15', '#7C3AED', '#D500F9'],
  '⚡ Neon': ['#A3E635', '#22D3EE', '#7C3AED'],
  '🌹 Rose': ['#EF233C', '#FF2D75', '#E11D48'],
  '🌈 Rainbow': ['#EF233C', '#F97316', '#FACC15', '#22D3EE'],
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
        <div
          className={readLiveConfessionButtonClassName(settings.readLiveConfessionButton)}
          style={
            readLiveConfessionButtonCssVariables(
              settings.readLiveConfessionButton,
            ) as React.CSSProperties
          }
        >
          {settings.bottomButtonText}
        </div>
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
          readLiveConfessionButton: normalizeReadLiveConfessionButton(
            value.readLiveConfessionButton,
          ),
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
  function updateButton<K extends keyof ReadLiveConfessionButtonConfig>(
    key: K,
    value: ReadLiveConfessionButtonConfig[K],
  ) {
    update('readLiveConfessionButton', {
      ...settings.readLiveConfessionButton,
      [key]: value,
    });
  }
  function updateButtonColor(index: number, color: string) {
    updateButton(
      'colors',
      settings.readLiveConfessionButton.colors.map((item, colorIndex) =>
        colorIndex === index ? color : item,
      ),
    );
  }
  function applyButtonPreset(colors: string[]) {
    update('readLiveConfessionButton', {
      ...settings.readLiveConfessionButton,
      colorMode: 'gradient',
      colors,
      glowEnabled: true,
      glowIntensity: 'medium',
      animation: 'subtle',
    });
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
        readLiveConfessionButton: settings.readLiveConfessionButton,
      };
      const saved = await api('/admin/profile-settings', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      const next = {
        ...defaults,
        ...saved,
        prompts: saved.prompts?.length ? saved.prompts : defaults.prompts,
        readLiveConfessionButton: normalizeReadLiveConfessionButton(saved.readLiveConfessionButton),
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

          <div className="read-live-button-settings">
            <h2>Read Live Confession Button</h2>
            <p className="muted">
              Customize the existing button&apos;s colors and effects. Its text, destination, and
              position stay unchanged.
            </p>
            <label>
              Color Mode
              <select
                value={settings.readLiveConfessionButton.colorMode}
                onChange={(event) =>
                  updateButton(
                    'colorMode',
                    event.target.value as ReadLiveConfessionButtonConfig['colorMode'],
                  )
                }
              >
                {readLiveButtonColorModes.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode === 'animated-gradient'
                      ? 'Animated Gradient'
                      : mode[0].toUpperCase() + mode.slice(1)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Preset Color Style
              <select
                defaultValue=""
                onChange={(event) => {
                  const colors = buttonPresets[event.target.value];
                  if (colors) applyButtonPreset(colors);
                  event.target.value = '';
                }}
              >
                <option value="">Choose a preset…</option>
                {Object.keys(buttonPresets).map((preset) => (
                  <option key={preset} value={preset}>
                    {preset}
                  </option>
                ))}
                <option value="custom">✨ Custom</option>
              </select>
            </label>
            <div className="read-live-colors" aria-label="Button colors">
              {settings.readLiveConfessionButton.colors.map((color, index) => (
                <label key={`${index}-${color}`}>
                  Color {index + 1}
                  <span className="read-live-color-control">
                    <input
                      type="color"
                      value={color}
                      onChange={(event) =>
                        updateButtonColor(index, event.target.value.toUpperCase())
                      }
                      aria-label={`Button color ${index + 1}`}
                    />
                    <input
                      value={color}
                      pattern="#[0-9A-Fa-f]{6}"
                      maxLength={7}
                      onChange={(event) => updateButtonColor(index, event.target.value)}
                      aria-label={`Button color ${index + 1} hex value`}
                    />
                  </span>
                </label>
              ))}
            </div>
            <div className="read-live-inline-actions">
              {settings.readLiveConfessionButton.colors.length < 4 && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    updateButton('colors', [...settings.readLiveConfessionButton.colors, '#8B5CF6'])
                  }
                >
                  + Add Color
                </button>
              )}
              {settings.readLiveConfessionButton.colors.length > 2 && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    updateButton('colors', settings.readLiveConfessionButton.colors.slice(0, -1))
                  }
                >
                  − Remove Color
                </button>
              )}
            </div>
            <label>
              Gradient Direction
              <select
                value={settings.readLiveConfessionButton.gradientDirection}
                onChange={(event) =>
                  updateButton(
                    'gradientDirection',
                    event.target.value as ReadLiveConfessionButtonConfig['gradientDirection'],
                  )
                }
              >
                {readLiveButtonDirections.map((direction) => (
                  <option key={direction} value={direction}>
                    {direction === 'to-right'
                      ? 'Left → Right'
                      : direction === 'to-left'
                        ? 'Right → Left'
                        : direction === 'to-bottom'
                          ? 'Top → Bottom'
                          : direction === 'to-bottom-right'
                            ? 'Diagonal ↘'
                            : 'Diagonal ↗'}
                  </option>
                ))}
              </select>
            </label>
            <div className="read-live-control-grid">
              <label>
                Glow
                <select
                  value={String(settings.readLiveConfessionButton.glowEnabled)}
                  onChange={(event) => updateButton('glowEnabled', event.target.value === 'true')}
                >
                  <option value="true">On</option>
                  <option value="false">Off</option>
                </select>
              </label>
              <label>
                Glow Intensity
                <select
                  value={settings.readLiveConfessionButton.glowIntensity}
                  onChange={(event) =>
                    updateButton(
                      'glowIntensity',
                      event.target.value as ReadLiveConfessionButtonConfig['glowIntensity'],
                    )
                  }
                >
                  {readLiveButtonGlowIntensities.map((intensity) => (
                    <option key={intensity} value={intensity}>
                      {intensity[0].toUpperCase() + intensity.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Glow Color
                <input
                  type="color"
                  value={settings.readLiveConfessionButton.glowColor}
                  onChange={(event) => updateButton('glowColor', event.target.value.toUpperCase())}
                />
              </label>
              <label>
                Animation
                <select
                  value={settings.readLiveConfessionButton.animation}
                  onChange={(event) =>
                    updateButton(
                      'animation',
                      event.target.value as ReadLiveConfessionButtonConfig['animation'],
                    )
                  }
                >
                  {readLiveButtonAnimations.map((animation) => (
                    <option key={animation} value={animation}>
                      {animation[0].toUpperCase() + animation.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Animation Speed
                <select
                  value={settings.readLiveConfessionButton.animationSpeed}
                  onChange={(event) =>
                    updateButton(
                      'animationSpeed',
                      event.target.value as ReadLiveConfessionButtonConfig['animationSpeed'],
                    )
                  }
                >
                  {readLiveButtonAnimationSpeeds.map((speed) => (
                    <option key={speed} value={speed}>
                      {speed[0].toUpperCase() + speed.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="read-live-admin-preview">
              <span>Live Preview</span>
              <div
                className={readLiveConfessionButtonClassName(settings.readLiveConfessionButton)}
                style={
                  readLiveConfessionButtonCssVariables(
                    settings.readLiveConfessionButton,
                  ) as React.CSSProperties
                }
              >
                {settings.bottomButtonText}
              </div>
            </div>
          </div>

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
