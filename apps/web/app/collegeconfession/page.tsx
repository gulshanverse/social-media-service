import type { Metadata } from 'next';
import Link from 'next/link';
import CollegeConfessionComposer from './CollegeConfessionComposer';

export const metadata: Metadata = {
  title: 'College Confession',
  description: 'Send an anonymous confession to the College Confession community.',
  alternates: { canonical: 'https://www.confessions.live/collegeconfession' },
  openGraph: {
    title: 'College Confession',
    description: 'Send an anonymous confession to the College Confession community.',
    url: 'https://www.confessions.live/collegeconfession',
    type: 'website',
  },
};

export type ProfileSettings = {
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

const fallbackSettings: ProfileSettings = {
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
  prompts: [
    'Are u talking to anyone??',
    'Who is your current college crush?',
    'What is something you have never told anyone?',
    'What is your biggest college secret?',
    'Who do you secretly want to talk to?',
  ],
};

async function getProfileSettings(): Promise<ProfileSettings> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  try {
    const response = await fetch(`${apiUrl}/confessions/profile-settings`, {
      next: { revalidate: 30 },
    });
    if (!response.ok) return fallbackSettings;
    return { ...fallbackSettings, ...(await response.json()) };
  } catch {
    return fallbackSettings;
  }
}

export default async function CollegeConfessionPage() {
  const settings = await getProfileSettings();
  return (
    <main className={`college-profile-page college-theme-${settings.themePreset}`}>
      <div className="college-profile-card">
        <header className="college-profile-header">
          <div className="college-profile-avatar" aria-hidden={!settings.profileImageUrl}>
            {settings.profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.profileImageUrl} alt="" />
            ) : (
              '♛'
            )}
          </div>
          <div>
            <p className="college-profile-handle">{settings.handle}</p>
            <p className="college-profile-tagline">{settings.headerMessage}</p>
          </div>
        </header>

        <CollegeConfessionComposer
          defaultPrompt={settings.defaultPrompt}
          prompts={settings.prompts}
          maxCharacters={settings.maxCharacters}
        />

        <section className="college-community-note" aria-label="Community invitation">
          <p>👇 Join your college confession community 👇</p>
          <Link className="college-community-button" href={settings.communityPath}>
            {settings.communityButtonText}
          </Link>
          <Link className="college-own-messages" href="/send">
            {settings.bottomButtonText}
          </Link>
        </section>

        <nav className="college-profile-legal" aria-label="Legal links">
          <Link href="/terms">Terms</Link>
          <span aria-hidden="true">·</span>
          <Link href="/privacy">Privacy</Link>
        </nav>
      </div>
    </main>
  );
}
