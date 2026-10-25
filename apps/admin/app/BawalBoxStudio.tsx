'use client';

import { useEffect, useState } from 'react';
import { api } from './AdminClient';

type Settings = Record<string, any>;
type Question = {
  id: string;
  title: string;
  description?: string;
  status: string;
  featured: boolean;
  _count?: { responses: number };
};
type Response = { id: string; content: string; status: string; pinned: boolean; createdAt: string };
const settingFields = [
  ['brandName', 'Brand name'],
  ['tagline', 'Tagline'],
  ['shortDescription', 'Short description'],
  ['longDescription', 'Long description'],
  ['heroHeading', 'Hero heading'],
  ['heroSubtitle', 'Hero subtitle'],
  ['heroTagline', 'Hero tagline'],
  ['heroCtaLabel', 'Hero CTA label'],
  ['homepageTeaserTitle', 'Homepage teaser title'],
  ['homepageTeaserDescription', 'Homepage teaser description'],
  ['homepageTeaserCta', 'Homepage CTA'],
  ['introTitle', 'Intro title'],
  ['introDescription', 'Intro description'],
  ['emptyStateText', 'Empty state text'],
];

export default function BawalBoxStudio() {
  const [tab, setTab] = useState<'branding' | 'questions' | 'responses'>('branding');
  const [settings, setSettings] = useState<Settings>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selected, setSelected] = useState<Question | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [draftQuestion, setDraftQuestion] = useState({
    title: '',
    description: '',
    status: 'DRAFT',
    featured: false,
  });
  async function load() {
    try {
      setSettings(await api('/admin/bawalbox/settings'));
      const result = await api('/admin/bawalbox/questions?limit=50');
      setQuestions(result.items);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load BawalBox.');
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function saveSettings(event: React.FormEvent) {
    event.preventDefault();
    try {
      setSettings(
        await api('/admin/bawalbox/settings', { method: 'PATCH', body: JSON.stringify(settings) }),
      );
      setNotice('BawalBox settings saved.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save settings.');
    }
  }
  async function createQuestion(event: React.FormEvent) {
    event.preventDefault();
    try {
      await api('/admin/bawalbox/questions', {
        method: 'POST',
        body: JSON.stringify(draftQuestion),
      });
      setDraftQuestion({ title: '', description: '', status: 'DRAFT', featured: false });
      setNotice('Question created.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create question.');
    }
  }
  async function chooseQuestion(question: Question) {
    setSelected(question);
    setTab('responses');
    try {
      setResponses(await api(`/admin/bawalbox/questions/${question.id}/responses?status=PENDING`));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load responses.');
    }
  }
  async function moderate(id: string, status: string, pinned = false) {
    try {
      await api(`/admin/bawalbox/responses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, pinned }),
      });
      setResponses((items) => items.filter((item) => item.id !== id));
      setNotice(`Response ${status.toLowerCase()}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Moderation failed.');
    }
  }
  return (
    <section className="bawalbox-studio">
      <div className="profile-settings-heading">
        <div>
          <p className="eyebrow">BAWALBOX STUDIO</p>
          <h1>Shape the question box.</h1>
          <p className="muted">
            Manage public content without a deploy. All responses remain private until approved.
          </p>
        </div>
        <a
          className="secondary"
          href="https://www.confessions.live/bawalbox"
          target="_blank"
          rel="noreferrer"
        >
          Preview public page ↗
        </a>
      </div>
      <div className="admin-tabs" role="tablist">
        {[
          ['branding', 'Branding & hero'],
          ['questions', 'Weekly questions'],
          ['responses', 'Responses'],
        ].map(([value, label]) => (
          <button
            key={value}
            className={tab === value ? 'is-active' : ''}
            onClick={() => setTab(value as typeof tab)}
          >
            {label}
          </button>
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
      {tab === 'branding' && (
        <form className="panel bawalbox-studio-grid" onSubmit={saveSettings}>
          <div>
            <h2>Branding</h2>
            {settingFields.slice(0, 4).map(([key, label]) => (
              <label key={key}>
                {label}
                <textarea
                  rows={key.includes('Description') ? 3 : 1}
                  value={settings[key] ?? ''}
                  onChange={(event) => setSettings({ ...settings, [key]: event.target.value })}
                />
              </label>
            ))}
            <label>
              Accent color
              <input
                value={settings.accentColor ?? '#ff2d75'}
                onChange={(event) => setSettings({ ...settings, accentColor: event.target.value })}
              />
            </label>
          </div>
          <div>
            <h2>Hero & page copy</h2>
            {settingFields.slice(4).map(([key, label]) => (
              <label key={key}>
                {label}
                <textarea
                  rows={key.includes('Description') ? 3 : 1}
                  value={settings[key] ?? ''}
                  onChange={(event) => setSettings({ ...settings, [key]: event.target.value })}
                />
              </label>
            ))}
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={settings.heroEnabled ?? true}
                onChange={(event) =>
                  setSettings({ ...settings, heroEnabled: event.target.checked })
                }
              />{' '}
              Enable BawalBox promotion
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={settings.navVisible ?? true}
                onChange={(event) => setSettings({ ...settings, navVisible: event.target.checked })}
              />{' '}
              Show in navigation
            </label>
            <button type="submit">Save BawalBox settings</button>
          </div>
        </form>
      )}
      {tab === 'questions' && (
        <div className="bawalbox-studio-grid">
          <form className="panel" onSubmit={createQuestion}>
            <h2>Create weekly question</h2>
            <label>
              Question title
              <input
                value={draftQuestion.title}
                onChange={(event) =>
                  setDraftQuestion({ ...draftQuestion, title: event.target.value })
                }
                required
                maxLength={180}
              />
            </label>
            <label>
              Description
              <textarea
                value={draftQuestion.description}
                onChange={(event) =>
                  setDraftQuestion({ ...draftQuestion, description: event.target.value })
                }
                maxLength={500}
              />
            </label>
            <label>
              Status
              <select
                value={draftQuestion.status}
                onChange={(event) =>
                  setDraftQuestion({ ...draftQuestion, status: event.target.value })
                }
              >
                <option>DRAFT</option>
                <option>PUBLISHED</option>
                <option>PAUSED</option>
                <option>ARCHIVED</option>
              </select>
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={draftQuestion.featured}
                onChange={(event) =>
                  setDraftQuestion({ ...draftQuestion, featured: event.target.checked })
                }
              />{' '}
              Make featured
            </label>
            <button>Create question</button>
          </form>
          <div className="panel">
            <h2>Questions</h2>
            {questions.length === 0 ? (
              <p className="muted">No questions yet.</p>
            ) : (
              questions.map((question) => (
                <article className="bawalbox-admin-row" key={question.id}>
                  <div>
                    <strong>{question.title}</strong>
                    <p className="muted">
                      {question.status} · {question._count?.responses ?? 0} responses{' '}
                      {question.featured ? '· featured' : ''}
                    </p>
                  </div>
                  <button className="secondary" onClick={() => void chooseQuestion(question)}>
                    Review responses
                  </button>
                </article>
              ))
            )}
          </div>
        </div>
      )}
      {tab === 'responses' && (
        <div className="panel">
          <div className="form-heading">
            <div>
              <p className="eyebrow">RESPONSE MODERATION</p>
              <h2>{selected?.title ?? 'Select a question'}</h2>
            </div>
            <button className="secondary" onClick={() => setTab('questions')}>
              Back to questions
            </button>
          </div>
          {!selected ? (
            <p className="muted">
              Open Weekly questions and select a question to review its pending answers.
            </p>
          ) : responses.length === 0 ? (
            <p className="muted">No pending responses for this question.</p>
          ) : (
            responses.map((response) => (
              <article className="bawalbox-admin-response" key={response.id}>
                <p>{response.content}</p>
                <div className="actions">
                  <button onClick={() => void moderate(response.id, 'APPROVED')}>Approve</button>
                  <button
                    className="secondary"
                    onClick={() => void moderate(response.id, 'APPROVED', true)}
                  >
                    Approve & pin
                  </button>
                  <button className="danger" onClick={() => void moderate(response.id, 'REJECTED')}>
                    Reject
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      )}
    </section>
  );
}
