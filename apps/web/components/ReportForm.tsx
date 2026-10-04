'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { reportConfession } from '../lib/api';
import { parsePublicConfessionId } from '../lib/report-link';

const reasons = [
  ['HARASSMENT', 'Harassment or targeted abuse'],
  ['HATE', 'Hate or dehumanizing content'],
  ['SEXUAL_CONTENT', 'Sexual content'],
  ['THREAT', 'Threat or safety concern'],
  ['SPAM', 'Spam or scam'],
  ['PERSONAL_INFORMATION', 'Personal information'],
  ['OTHER', 'Other'],
];
const maxDetailsLength = 1000;

export function ReportForm() {
  const [publicId, setPublicId] = useState('');
  const publicIdEdited = useRef(false);
  const searchParams = useSearchParams();
  const confessionParam = searchParams.get('confession');
  const [reason, setReason] = useState('HARASSMENT');
  const [details, setDetails] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (publicIdEdited.current || publicId.trim() || !confessionParam) return;
    const parsedPublicId = parsePublicConfessionId(confessionParam);
    if (parsedPublicId) setPublicId(parsedPublicId);
  }, [confessionParam, publicId]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('loading');
    setMessage('');
    try {
      const confessionId = parsePublicConfessionId(publicId);
      if (!confessionId)
        throw new Error('Enter a valid College Confession link or public confession ID.');
      const trimmedDetails = details.trim();
      if (reason === 'OTHER' && !trimmedDetails)
        throw new Error('Please explain why you are reporting this confession.');
      const result = await reportConfession(
        confessionId,
        reason,
        reason === 'OTHER' ? trimmedDetails : undefined,
      );
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
        onChange={(event) => {
          publicIdEdited.current = true;
          setPublicId(event.target.value);
        }}
        placeholder="https://www.confessions.live/confessions/..."
        required
      />
      <label htmlFor="report-reason">Reason</label>
      <select
        id="report-reason"
        value={reason}
        onChange={(event) => {
          setReason(event.target.value);
          setMessage('');
          setState('idle');
        }}
      >
        {reasons.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      {reason === 'OTHER' && (
        <>
          <label htmlFor="report-details">Explain your concern</label>
          <textarea
            id="report-details"
            value={details}
            onChange={(event) => setDetails(event.target.value.slice(0, maxDetailsLength))}
            maxLength={maxDetailsLength}
            rows={5}
            aria-describedby="report-details-count"
            required
          />
          <p id="report-details-count" className="muted">
            {details.length}/{maxDetailsLength}
          </p>
        </>
      )}
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
      <p className="privacy-note" id="report-privacy-note">
        Reports go to authorized moderators. Technical request information may be processed to
        prevent abuse. See our <a href="/privacy">Privacy Policy</a>; do not include passwords or
        private credentials.
      </p>
    </form>
  );
}
