import Link from 'next/link';
import { ReportForm } from '../components/ReportForm';
import { LegalPage, LegalSection, LegalParagraph, LegalList } from '../components/SiteFooter';

export function AboutPage() {
  return (
    <LegalPage
      eyebrow="ABOUT THE WALL"
      title="A safer place to say the quiet part out loud."
      intro="College Confession is an anonymous community space built around honest campus stories, thoughtful conversation, and accountable moderation."
    >
      <LegalSection title="How it works">
        <LegalParagraph>
          Anyone can submit a confession without creating an account. Submissions are held for
          review and are never published automatically. Moderators may edit for safety, reject
          harmful material, or remove published content when needed.
        </LegalParagraph>
      </LegalSection>
      <LegalSection title="A community, not a loophole">
        <LegalParagraph>
          Anonymous does not mean consequence-free. Please protect other people&apos;s privacy,
          avoid targeted abuse, and report content that crosses the line.
        </LegalParagraph>
      </LegalSection>
    </LegalPage>
  );
}

export function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="YOUR PRIVACY"
      title="Privacy Policy"
      intro="This plain-language policy explains what College Confession collects and how it is used."
    >
      <LegalSection title="Information we receive">
        <LegalParagraph>
          We receive the confession text, selected category, selected theme, and technical request
          information needed to operate, secure, and rate-limit the service. We do not ask public
          submitters for a name, email address, or account.
        </LegalParagraph>
      </LegalSection>
      <LegalSection title="How we use information">
        <LegalParagraph>
          Submissions are used to operate the moderated feed. Technical information may be used for
          abuse prevention, troubleshooting, security logs, and aggregate analytics. Published
          confessions are public; pending and rejected material is not.
        </LegalParagraph>
      </LegalSection>
      <LegalSection title="Cookies and services">
        <LegalParagraph>
          The public site may use essential browser storage and Vercel Analytics for aggregate usage
          insights. The admin workspace uses secure authentication cookies. If advertising is
          introduced later, this policy will be updated before it is enabled.
        </LegalParagraph>
      </LegalSection>
      <LegalSection title="Your choices">
        <LegalParagraph>
          For privacy questions, removal requests, or concerns about personal information, contact{' '}
          <a href="mailto:hello@confessions.live">hello@confessions.live</a>.
        </LegalParagraph>
      </LegalSection>
    </LegalPage>
  );
}

export function TermsPage() {
  return (
    <LegalPage
      eyebrow="THE RULES"
      title="Terms of Service"
      intro="By using College Confession, you agree to use the service responsibly and follow these rules."
    >
      <LegalSection title="Acceptable use">
        <LegalParagraph>
          Use the service for genuine community expression. You must not submit content that is
          unlawful, threatening, hateful, harassing, sexually exploitative, defamatory, deceptive,
          or intended to expose someone&apos;s private information.
        </LegalParagraph>
      </LegalSection>
      <LegalSection title="Moderation and removal">
        <LegalParagraph>
          Every submission may be reviewed. We may edit, reject, archive, or remove content and
          restrict access when necessary to protect people or the service. Publication is not
          guaranteed.
        </LegalParagraph>
      </LegalSection>
      <LegalSection title="Your responsibility">
        <LegalParagraph>
          Only submit material you have the right to share. Do not impersonate others, coordinate
          abuse, evade rate limits, or attempt to access private systems. The service is provided
          as-is and may change or be unavailable.
        </LegalParagraph>
      </LegalSection>
    </LegalPage>
  );
}

export function GuidelinesPage() {
  return (
    <LegalPage
      eyebrow="COMMUNITY CARE"
      title="Community Guidelines"
      intro="Anonymous spaces work when people treat one another like people."
    >
      <LegalSection title="Do">
        <LegalList>
          <li>Share your own experiences and opinions.</li>
          <li>Be specific without identifying private individuals.</li>
          <li>Use disagreement, humor, and criticism without targeting or threatening someone.</li>
          <li>Report content that feels unsafe or violates these guidelines.</li>
        </LegalList>
      </LegalSection>
      <LegalSection title="Do not">
        <LegalList>
          <li>
            Post harassment, hate, threats, targeted abuse, or sexual content involving minors.
          </li>
          <li>
            Share doxxing, phone numbers, addresses, passwords, or other personal information.
          </li>
          <li>Spam, scam, impersonate, manipulate engagement, or submit illegal content.</li>
          <li>Try to bypass moderation or encourage others to attack a person.</li>
        </LegalList>
      </LegalSection>
      <LegalSection title="Enforcement">
        <LegalParagraph>
          Moderators review reports and may resolve, dismiss, edit, reject, or remove content.
          Serious safety concerns may be escalated to appropriate authorities.
        </LegalParagraph>
      </LegalSection>
    </LegalPage>
  );
}

export function ContactPage() {
  return (
    <LegalPage
      eyebrow="GET IN TOUCH"
      title="Contact the community team"
      intro="For moderation concerns, privacy requests, partnership questions, or accessibility feedback, email us."
    >
      <LegalSection title="Contact">
        <LegalParagraph>
          <a href="mailto:hello@confessions.live">hello@confessions.live</a>
        </LegalParagraph>
        <LegalParagraph>
          When reporting a public confession, include its link and explain the concern. Do not
          include passwords or other sensitive credentials.
        </LegalParagraph>
      </LegalSection>
    </LegalPage>
  );
}

export function ReportPage() {
  return (
    <LegalPage
      eyebrow="KEEP THE WALL SAFE"
      title="Report a confession"
      intro="If a published confession violates our guidelines, send its public link and reason to the moderation team."
    >
      <ReportForm />
      <LegalSection title="Prefer email?">
        <LegalParagraph>
          Use the <Link href="/contact">contact address</Link> if you need to include context.
          Reports are reviewed by authorized moderators and may result in resolution or dismissal.
        </LegalParagraph>
      </LegalSection>
      <LegalSection title="Need immediate help?">
        <LegalParagraph>
          If someone is in immediate danger, contact local emergency services first. College
          Confession is not an emergency response service.
        </LegalParagraph>
      </LegalSection>
    </LegalPage>
  );
}
