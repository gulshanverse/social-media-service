import Link from 'next/link';
import { ReportForm } from '../components/ReportForm';
import { LegalPage, LegalSection, LegalParagraph, LegalList } from '../components/SiteFooter';

export function AboutPage() {
  return (
    <LegalPage
      eyebrow="ABOUT COLLEGE CONFESSION"
      title="A student space for the things you want to say."
      intro="College Confession is a student-focused community for sharing campus experiences, questions, appreciation, advice, and lighthearted thoughts without creating a public profile."
    >
      <LegalSection title="What the service does">
        <LegalParagraph>
          Anyone can submit a confession without an account, name, or email address. New submissions
          are held for human moderator review before they can appear on the public wall. A moderator
          may edit a post for safety, reject it, or remove it later.
        </LegalParagraph>
      </LegalSection>
      <LegalSection title="Anonymous does not mean untraceable">
        <LegalParagraph>
          The public form does not ask for your identity, but the service processes ordinary
          technical request information to operate and limit abuse. A confession can also identify
          you or someone else through its own details. Avoid names, handles, contact information,
          class schedules, or clues about where and when a person can be found.
        </LegalParagraph>
      </LegalSection>
      <LegalSection title="A community, not an official campus service">
        <LegalParagraph>
          College Confession is an independent community platform and is not an official university
          service. Posts reflect their authors, not a university or the platform. Do not use an
          anonymous post to target, identify, or pressure another student. Use the{' '}
          <Link href="/community-guidelines">Community Guidelines</Link> and{' '}
          <Link href="/report">report content</Link> if something is unsafe.
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
      intro="This policy describes the information College Confession handles to run the public community and its moderation tools. Last updated October 1, 2026."
    >
      <LegalSection title="Information submitted to the service">
        <LegalParagraph>
          A confession includes the text you submit and its selected category and theme. A report
          includes the public confession it refers to and the reason selected. The public form does
          not require an account, name, or email address. Please do not put identifying or sensitive
          details in a confession or report that you do not want moderators to receive.
        </LegalParagraph>
      </LegalSection>
      <LegalSection title="Technical and anti-abuse information">
        <LegalParagraph>
          The API uses a request&apos;s IP address transiently as an in-memory key for rate
          limiting; it is not added to a confession record. To deduplicate repeated open reports for
          the same confession, the report service stores a SHA-256 hash of the request IP with the
          report. This is a pseudonymous identifier, not a guarantee of anonymity. Application logs
          record request IDs, routes, response status, and timing, not confession bodies or client
          IPs. Infrastructure providers may process ordinary network metadata, such as IP addresses,
          to deliver and secure the service under their own terms.
        </LegalParagraph>
      </LegalSection>
      <LegalSection title="Storage, moderation, and retention">
        <LegalParagraph>
          Confessions and reports are stored in the application database so moderators can review
          and manage them. Published confessions are public. Pending and rejected submissions are
          not shown in the public feed; archived material is not served as a published confession.
          The application does not currently publish a fixed retention schedule. For a privacy or
          removal concern about a published confession, use the{' '}
          <Link href="/report">report form</Link> and include its public link. There is no
          self-service deletion control or published fixed response time.
        </LegalParagraph>
      </LegalSection>
      <LegalSection title="Analytics and advertising">
        <LegalParagraph>
          The public site uses Vercel Analytics and Speed Insights for aggregate usage and
          performance measurement. Their providers may process browser and request signals under
          their own privacy terms. The Google AdSense account-verification meta tag is present, but
          the AdSense serving script is disabled by default. If explicitly enabled later, the code
          is restricted to designated informational pages and is not loaded on confession, feed,
          report, or submission pages. This policy must be reviewed before advertising is enabled.
        </LegalParagraph>
      </LegalSection>
      <LegalSection title="Your choices and contact">
        <LegalParagraph>
          For a privacy or removal concern about a published confession, submit a{' '}
          <Link href="/report">report</Link> with the public link and closest reason. A separate,
          verified general support inbox or contact form is not currently configured. Requests are
          reviewed in context; this page does not promise a particular outcome or response time.
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
      intro="Use College Confession responsibly. These terms describe the basic rules for submitting and reading community posts."
    >
      <LegalSection title="What you may submit">
        <LegalParagraph>
          Share your own experiences and opinions, or content you have permission to share. Do not
          include someone else&apos;s name, social handle, contact information, identifiable
          appearance-and-location clues, class schedule, or instructions for readers to identify,
          contact, follow, or find them. A partly masked name can still identify someone when other
          details are combined.
        </LegalParagraph>
      </LegalSection>
      <LegalSection title="Prohibited behavior">
        <LegalParagraph>
          Do not submit unlawful content, threats, hate, harassment, targeted bullying, sexual
          exploitation, non-consensual intimate content, dangerous instructions, scams, malicious
          links, impersonation, spam, or private information. Do not coordinate attacks or try to
          evade moderation or abuse-prevention measures.
        </LegalParagraph>
      </LegalSection>
      <LegalSection title="Moderation and removal">
        <LegalParagraph>
          New submissions remain pending until a moderator reviews them. Moderators may edit for
          safety, reject, archive, remove, or restore content and may restrict access when needed to
          protect people or the service. Publication is not guaranteed, and reports do not guarantee
          immediate removal. There is no self-service deletion control; you may request review by
          using the report form for a published post. There is currently no self-service
          cancellation or separate request channel for a pending submission.
        </LegalParagraph>
      </LegalSection>
      <LegalSection title="Service limits">
        <LegalParagraph>
          Community posts are user-submitted opinions, not verified facts, professional advice, or
          official statements from a university. The service may change or be unavailable. Nothing
          on this page promises that every harmful post will be detected or that a report will be
          resolved in a particular way.
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
      intro="Share honestly without putting another person at risk. Every new confession is held for human moderator review before publication."
    >
      <LegalSection title="What belongs here">
        <LegalList>
          <li>
            First-person campus experiences, questions, appreciation, advice, and lighthearted
            stories.
          </li>
          <li>
            Criticism or disagreement that addresses ideas or conduct without targeting a person for
            abuse.
          </li>
          <li>
            Details that explain your experience without making another student recognizable or
            findable.
          </li>
        </LegalList>
      </LegalSection>
      <LegalSection title="Do not submit">
        <LegalList>
          <li>
            Harassment, bullying, threats, hate, targeted abuse, or calls for others to confront
            someone.
          </li>
          <li>
            Requests to identify, locate, contact, follow, or reveal the social account of a person,
            including when paired with appearance, class, timetable, building, or other campus
            clues.
          </li>
          <li>
            Names, social handles, phone numbers, addresses, passwords, private messages, or other
            personal information about someone without permission. Masking part of a name does not
            make a person unidentifiable when the surrounding details point to them.
          </li>
          <li>
            Sexually explicit or exploitative content, especially anything involving minors or
            non-consent.
          </li>
          <li>
            Illegal or dangerous material, scams, spam, malicious links, impersonation, or attempts
            to evade moderation.
          </li>
        </LegalList>
      </LegalSection>
      <LegalSection title="Reporting and enforcement">
        <LegalParagraph>
          Use the <Link href="/report">Report Content page</Link> and select the closest reason.
          Authorized moderators review reports and may dismiss them, edit or reject a pending post,
          archive or remove a published post, or take other steps allowed by the service. Reports
          are not an emergency service; contact local emergency services if someone is in immediate
          danger.
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
      intro="Find the right route for a public-post concern or a question about the service."
    >
      <LegalSection title="Report a public post">
        <LegalParagraph>
          Use the <Link href="/report">Report Content form</Link> for safety, privacy, or removal
          concerns about a published confession. Include its public link and select the closest
          reason; the report is sent to the private moderation queue.
        </LegalParagraph>
      </LegalSection>
      <LegalSection title="General questions">
        <LegalParagraph>
          Read the <Link href="/faq">FAQ</Link> or the{' '}
          <Link href="/community-guidelines">Community Guidelines</Link>. A separate, verified
          general support inbox or contact form is not currently configured, so do not rely on an
          email address for support.
        </LegalParagraph>
      </LegalSection>
      <LegalSection title="More help">
        <LegalParagraph>
          Read the <Link href="/faq">FAQ</Link>, browse the{' '}
          <Link href="/community-guidelines">Community Guidelines</Link>, or use the{' '}
          <Link href="/report">report form</Link> for a public post.
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
      intro="Send a link to a published confession and choose the closest reason. Your report is placed in the private moderation queue."
    >
      <ReportForm />
      <LegalSection title="Need more help?">
        <LegalParagraph>
          See the <Link href="/contact">Contact page</Link> for other support options. Authorized
          moderators review reports, but a report does not guarantee immediate removal.
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

export function HowItWorksPage() {
  return (
    <LegalPage
      eyebrow="HOW IT WORKS"
      title="From a thought to a moderated post."
      intro="Here is what happens when you browse or send a confession on College Confession."
    >
      <LegalSection title="1. Browse the community">
        <LegalParagraph>
          Read posts in the <Link href="/confessions">public confession feed</Link>. Posts are
          user-submitted and do not represent an official university view. Treat them as community
          conversation, not verified reporting.
        </LegalParagraph>
      </LegalSection>
      <LegalSection title="2. Write a confession">
        <LegalParagraph>
          Use the <Link href="/send">submission form</Link> to send text without creating an account
          or adding a name or email. Do not include personal information, identifying campus clues,
          social handles, or details that could help someone find another person.
        </LegalParagraph>
      </LegalSection>
      <LegalSection title="3. A moderator reviews it">
        <LegalParagraph>
          A new submission is saved as pending and is not added to the public feed until an
          authorized moderator approves it. Moderators may edit for safety or reject it. This review
          is not a guarantee that every unsafe detail will be recognized.
        </LegalParagraph>
      </LegalSection>
      <LegalSection title="4. Published posts are public">
        <LegalParagraph>
          An approved confession can be read on the public site. Do not submit anything you would
          not want others to see, and remember that a post may identify someone even if their name
          is omitted.
        </LegalParagraph>
      </LegalSection>
      <LegalSection title="5. Report a concern">
        <LegalParagraph>
          If a published post appears unsafe or violates the{' '}
          <Link href="/community-guidelines">Community Guidelines</Link>, use the{' '}
          <Link href="/report">report form</Link> or contact the community team. Reports are
          reviewed by moderators but are not an emergency response service.
        </LegalParagraph>
      </LegalSection>
      <LegalSection title="6. Moderator follow-up">
        <LegalParagraph>
          A moderator reviews reports in the private queue and decides what action is appropriate.
          Depending on the context, a report may be dismissed, lead to an edit, or lead to content
          being archived or removed. A report does not guarantee a particular outcome or response
          time.
        </LegalParagraph>
      </LegalSection>
    </LegalPage>
  );
}

export function FaqPage() {
  return (
    <LegalPage
      eyebrow="HELP & ANSWERS"
      title="Frequently asked questions"
      intro="Practical answers about posting, privacy, moderation, and reporting."
    >
      <LegalSection title="What is College Confession?">
        <LegalParagraph>
          It is an independent, student-focused community site for campus experiences, questions,
          appreciation, advice, and lighthearted thoughts. It is not an official university service.
        </LegalParagraph>
      </LegalSection>
      <LegalSection title="Is posting anonymous?">
        <LegalParagraph>
          You do not need an account, public profile, name, or email to submit. That is not a
          promise of absolute technical anonymity: the service processes technical request
          information for security and abuse prevention, and details in your text can identify you
          or someone else.
        </LegalParagraph>
      </LegalSection>
      <LegalSection title="How does moderation work?">
        <LegalParagraph>
          New confessions stay pending until a moderator approves them. Moderators may edit for
          safety or reject a post. Review can miss things, so readers can also report published
          content.
        </LegalParagraph>
      </LegalSection>
      <LegalSection title="What happens after I submit?">
        <LegalParagraph>
          The submission is placed in a pending queue and is not public while it waits for review.
          An authorized moderator may approve it, edit it for safety, reject it, or take another
          moderation action. Publication is not guaranteed.
        </LegalParagraph>
      </LegalSection>
      <LegalSection title="Can a confession be rejected?">
        <LegalParagraph>
          Yes. A moderator may reject a submission when it conflicts with the{' '}
          <Link href="/community-guidelines">Community Guidelines</Link>, creates an avoidable
          safety or privacy risk, or otherwise is not suitable for the public wall.
        </LegalParagraph>
      </LegalSection>
      <LegalSection title="What should I not post?">
        <LegalParagraph>
          Do not share private identifiers or clues that could reveal, locate, or help contact
          another student; do not post harassment, threats, hate, sexual exploitation, illegal or
          dangerous material, spam, scams, malicious links, or impersonation. See the full{' '}
          <Link href="/community-guidelines">Community Guidelines</Link>.
        </LegalParagraph>
      </LegalSection>
      <LegalSection title="How do I report a post?">
        <LegalParagraph>
          Open the <Link href="/report">Report Content page</Link>, paste the confession link or ID,
          and choose a reason. Reports reach the private moderator queue; submitting one does not
          guarantee immediate removal.
        </LegalParagraph>
      </LegalSection>
      <LegalSection title="Can I delete a confession?">
        <LegalParagraph>
          There is no self-service delete feature. For a published confession, use the{' '}
          <Link href="/report">report form</Link> with its public link and the closest reason. A
          moderator will review it; removal is not automatic. There is no separate request channel
          for a pending submission.
        </LegalParagraph>
      </LegalSection>
      <LegalSection title="Are ads shown on confessions?">
        <LegalParagraph>
          The AdSense serving script is disabled by default. If explicitly enabled later, the
          current code allows it only on selected informational pages, not on the feed or individual
          confession, report, or submission pages.
        </LegalParagraph>
      </LegalSection>
      <LegalSection title="Is this an official university service?">
        <LegalParagraph>
          No. College Confession is an independent community platform. Posts are user-submitted and
          should not be treated as official university communications, verified facts, or
          professional advice.
        </LegalParagraph>
      </LegalSection>
      <LegalSection title="How can I contact the team?">
        <LegalParagraph>
          For a concern about a published confession, use the{' '}
          <Link href="/report">report form</Link>. A separate, verified general support inbox or
          contact form is not currently configured.
        </LegalParagraph>
      </LegalSection>
    </LegalPage>
  );
}
