'use client';

import { useState } from 'react';
import { reportConfession } from '../lib/api';

const reasons = [
  ['HARASSMENT', 'Harassment or targeted abuse'],
  ['HATE', 'Hate or dehumanizing content'],
  ['SEXUAL_CONTENT', 'Sexual content'],
  ['THREAT', 'Threat or safety concern'],
  ['SPAM', 'Spam or scam'],
  ['PERSONAL_INFORMATION', 'Personal information'],
  ['OTHER', 'Other'],
];

export function ReportForm() {
  const [publicId, setPublicId] = useState(() =>
    typeof window === 'undefined'
      ? ''
      : (new URLSearchParams(window.location.search).get('confession') ?? ''),
  );
  const [reason, setReason] = useState('HARASSMENT');
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('loading');
    setMessage('');
    try {
      const value = publicId.trim().split('/').pop() || '';
      const result = await reportConfession(value, reason);
      setMessage(result.message);
      setState('success');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'We could not send that report.');
      setState('error');
    }
  }
  return (
    <form className="submission-form report-form" onSubmit={submit} noValidate>
      <label htmlFor="report-link">Public confession link or ID</label>
      <input
        id="report-link"
        value={publicId}
        onChange={(event) => setPublicId(event.target.value)}
        placeholder="https://www.confessions.live/confessions/..."
        required
      />
      <label htmlFor="report-reason">Reason</label>
      <select id="report-reason" value={reason} onChange={(event) => setReason(event.target.value)}>
        {reasons.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      {message && (
        <p
          className={state === 'error' ? 'form-error' : 'form-success'}
          role={state === 'error' ? 'alert' : 'status'}
        >
          {message}
        </p>
      )}
      <button className="ggv-button submit-button" type="submit" disabled={state === 'loading'}>
        {state === 'loading'
          ? 'Sending report…'
          : state === 'success'
            ? 'Send another report'
            : 'Submit report'}
      </button>
      <p className="privacy-note">
        Reports are reviewed by authorized moderators. Do not include passwords or private
        credentials.
      </p>
    </form>
  );
}
