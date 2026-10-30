import Link from 'next/link';
import { CommunityPreview } from '../components/CommunityPreview';

type Service = {
  icon: string;
  title: string;
  description: string;
  href?: string;
  action: string;
  accent: string;
};

const services: Service[] = [
  {
    icon: '✦',
    title: 'Confessions',
    description: 'Share your thoughts anonymously and explore community conversations.',
    href: '/confessions',
    action: 'Explore confessions',
    accent: 'pink',
  },
  {
    icon: '◌',
    title: 'VibeMatch',
    description: 'Discover compatible people through a private, choice-based experience.',
    href: '/vibematch',
    action: 'Find your vibe',
    accent: 'lavender',
  },
  {
    icon: '?',
    title: 'BawalBox',
    description: 'Ask the question everyone is thinking and hear your campus answer.',
    href: '/bawalbox',
    action: 'Open BawalBox',
    accent: 'pink',
  },
  {
    icon: '✺',
    title: 'Garba',
    description: 'Find Garba circles, partners, and festive campus connections.',
    href: '/garba',
    action: 'Explore Garba',
    accent: 'peach',
  },
  {
    icon: '＋',
    title: 'Buy & Sell',
    description: 'A future space for finding or listing useful campus essentials.',
    action: 'Coming soon',
    accent: 'cyan',
  },
  {
    icon: '♡',
    title: 'Find Your Partner',
    description: 'A future way to discover meaningful connections in your community.',
    action: 'Coming soon',
    accent: 'mint',
  },
];

const steps = [
  ['01', 'Choose a service', 'Start with the part of campus life you want to explore.'],
  ['02', 'Participate', 'Share, browse, connect, and keep the conversation useful.'],
  ['03', 'Stay safe', 'Protect personal details and respect the people behind every post.'],
  [
    '04',
    'Follow the guidelines',
    'Our community rules keep the platform thoughtful and welcoming.',
  ],
];

export default function Home() {
  return (
    <>
      <main className="home-shell">
        <section className="home-hero" aria-labelledby="home-title">
          <div className="home-hero__copy">
            <p className="home-eyebrow">YOUR CAMPUS. YOUR COMMUNITY.</p>
            <h1 id="home-title">
              Real people.
              <br />
              <span>Real campus life.</span>
            </h1>
            <p className="home-hero__lede">
              Confess anonymously, discover campus opportunities, meet new people, and explore
              everything your community has to offer.
            </p>
            <div className="home-actions">
              <Link className="home-button" href="/send">
                Send a confession <span aria-hidden="true">↗</span>
              </Link>
              <Link className="home-button home-button--secondary" href="#services">
                Explore all services <span aria-hidden="true">↓</span>
              </Link>
            </div>
            <div className="home-trust" aria-label="Trust and safety highlights">
              <span>
                <i aria-hidden="true">✓</i> No public profile required
              </span>
              <span>
                <i aria-hidden="true">✓</i> Reviewed before publishing
              </span>
            </div>
          </div>
          <div className="home-hero__aside" aria-label="A quick note about the platform">
            <div className="home-note">
              <span className="home-note__mark" aria-hidden="true">
                ✦
              </span>
              <p className="home-eyebrow">A THOUGHTFUL START</p>
              <h2>Bring the thought. Leave the identifying details.</h2>
              <p>
                Anonymous does not mean technically untraceable. Share with care and keep people
                safe.
              </p>
              <Link className="home-text-link" href="/privacy">
                Read our privacy approach <span aria-hidden="true">↗</span>
              </Link>
            </div>
            <div className="home-hero__stat">
              <strong>01</strong>
              <span>
                campus space
                <br />
                for many ways to connect
              </span>
            </div>
          </div>
        </section>

        <section
          className="home-section home-services"
          id="services"
          aria-labelledby="services-title"
        >
          <div className="home-section-heading">
            <div>
              <p className="home-eyebrow">FIND YOUR NEXT THING</p>
              <h2 id="services-title">
                Everything your campus needs. <span>In one place.</span>
              </h2>
            </div>
            <p>One platform, a few good ways to participate. Start where it feels natural.</p>
          </div>
          <div className="service-grid">
            {services.map((service) => (
              <article
                className={`service-card service-card--${service.accent}`}
                key={service.title}
              >
                <div className="service-card__icon" aria-hidden="true">
                  {service.icon}
                </div>
                <div>
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                </div>
                {service.href ? (
                  <Link className="service-card__action" href={service.href}>
                    {service.action} <span aria-hidden="true">↗</span>
                  </Link>
                ) : (
                  <span
                    className="service-card__action service-card__action--disabled"
                    aria-label={`${service.title}, coming soon`}
                  >
                    {service.action}
                  </span>
                )}
              </article>
            ))}
          </div>
        </section>

        <CommunityPreview />

        <section className="home-section home-how" aria-labelledby="how-title">
          <div className="home-section-heading home-section-heading--compact">
            <div>
              <p className="home-eyebrow">HOW IT WORKS</p>
              <h2 id="how-title">
                Simple by design.
                <br />
                <span>Thoughtful by default.</span>
              </h2>
            </div>
            <p>
              Take what you need from the platform, then leave it a little kinder than you found it.
            </p>
          </div>
          <div className="steps-grid">
            {steps.map(([number, title, description]) => (
              <div className="step-card" key={number}>
                <span className="step-card__number">{number}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="home-safety" aria-labelledby="safety-title">
          <div>
            <p className="home-eyebrow">TRUST &amp; SAFETY</p>
            <h2 id="safety-title">A community works when people feel considered.</h2>
          </div>
          <div className="safety-grid">
            <div>
              <span aria-hidden="true">◎</span>
              <h3>Anonymous submissions</h3>
              <p>
                No public profile is required to send a confession. Keep identifying clues out of
                your post.
              </p>
            </div>
            <div>
              <span aria-hidden="true">◒</span>
              <h3>Human moderation</h3>
              <p>
                Posts are reviewed before publication, and reports return to the moderation team.
              </p>
            </div>
            <div>
              <span aria-hidden="true">↗</span>
              <h3>Clear ways to report</h3>
              <p>
                Use the report flow for content that crosses a line or makes the space less safe.
              </p>
            </div>
          </div>
          <div className="safety-links">
            <Link href="/community-guidelines">Community guidelines</Link>
            <Link href="/safety">Safety &amp; moderation</Link>
            <Link href="/report">Report content</Link>
            <Link href="/privacy">Privacy policy</Link>
          </div>
        </section>

        <section className="home-final-cta" aria-labelledby="final-cta-title">
          <p className="home-eyebrow">MAKE YOURSELF AT HOME</p>
          <h2 id="final-cta-title">
            There’s room for
            <br />
            <span>your point of view.</span>
          </h2>
          <div className="home-actions">
            <Link className="home-button" href="/send">
              Send a confession <span aria-hidden="true">↗</span>
            </Link>
            <Link className="home-text-link" href="/confessions">
              Read the community wall <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
