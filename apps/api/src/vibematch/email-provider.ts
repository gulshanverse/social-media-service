import { Resend } from 'resend';

export type MagicLinkMessage = { email: string; token: string; expiresAt: Date };

export interface EmailProvider {
  sendMagicLink(message: MagicLinkMessage): Promise<void>;
}

/** Development/test adapter. It never sends external mail. */
export class DevelopmentEmailProvider implements EmailProvider {
  public readonly delivered: MagicLinkMessage[] = [];

  async sendMagicLink(message: MagicLinkMessage) {
    this.delivered.push(message);
  }
}

export type ResendEmailConfiguration = {
  apiKey: string;
  from: string;
  appUrl: string;
  webOrigin?: string;
};

export type ResendEmailPayload = Parameters<Resend['emails']['send']>[0];
export type ResendEmailSender = (payload: ResendEmailPayload) => Promise<{ error: unknown | null }>;

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const replacements: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return replacements[character];
  });
}

function parseApplicationOrigin(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('VIBEMATCH_APP_URL must be an HTTPS application origin.');
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('VIBEMATCH_APP_URL must be an HTTPS application origin.');
  }
  return url.origin;
}

function validateConfiguration(configuration: ResendEmailConfiguration) {
  const missing = [
    ['RESEND_API_KEY', configuration.apiKey],
    ['VIBEMATCH_EMAIL_FROM', configuration.from],
    ['VIBEMATCH_APP_URL', configuration.appUrl],
  ]
    .filter(([, value]) => !value?.trim())
    .map(([name]) => name);
  if (missing.length) {
    throw new Error(`VibeMatch production email configuration is missing: ${missing.join(', ')}.`);
  }

  const appOrigin = parseApplicationOrigin(configuration.appUrl.trim());
  if (configuration.webOrigin?.trim()) {
    let webOrigin: URL;
    try {
      webOrigin = new URL(configuration.webOrigin.trim());
    } catch {
      throw new Error('WEB_ORIGIN must be a valid application origin for VibeMatch email.');
    }
    if (
      (webOrigin.protocol !== 'http:' && webOrigin.protocol !== 'https:') ||
      webOrigin.username ||
      webOrigin.password ||
      webOrigin.pathname !== '/' ||
      webOrigin.search ||
      webOrigin.hash
    ) {
      throw new Error('WEB_ORIGIN must be a valid application origin for VibeMatch email.');
    }
    if (webOrigin.origin !== appOrigin) {
      throw new Error('VIBEMATCH_APP_URL must match WEB_ORIGIN.');
    }
  }

  return {
    apiKey: configuration.apiKey.trim(),
    from: configuration.from.trim(),
    appOrigin,
  };
}

/** Production adapter for sending one-time VibeMatch sign-in links through Resend. */
export class ResendEmailProvider implements EmailProvider {
  private readonly from: string;
  private readonly appOrigin: string;
  private readonly sendEmail: ResendEmailSender;

  constructor(configuration: ResendEmailConfiguration, sendEmail?: ResendEmailSender) {
    const validated = validateConfiguration(configuration);
    this.from = validated.from;
    this.appOrigin = validated.appOrigin;

    if (sendEmail) {
      this.sendEmail = sendEmail;
    } else {
      const resend = new Resend(validated.apiKey);
      this.sendEmail = (payload) => resend.emails.send(payload);
    }
  }

  async sendMagicLink(message: MagicLinkMessage) {
    const verificationUrl = new URL('/vibematch/verify', this.appOrigin);
    // A fragment is not sent to the web server in the initial request, so the token
    // does not appear in reverse-proxy or application access logs.
    verificationUrl.hash = new URLSearchParams({ token: message.token }).toString();
    const magicLink = verificationUrl.toString();
    const escapedLink = escapeHtml(magicLink);
    const expiry = message.expiresAt.toISOString();
    const escapedExpiry = escapeHtml(`${expiry} (UTC)`);
    const text = [
      'VibeMatch',
      '',
      'Use the link below to sign in to VibeMatch:',
      magicLink,
      '',
      `This sign-in link expires at ${expiry} (UTC).`,
      'For your security, do not share this link with anyone.',
    ].join('\n');
    const html = [
      '<!doctype html>',
      '<html><body style="margin:0;background:#f5f2ff;font-family:Arial,sans-serif;color:#211b35">',
      '<main style="max-width:560px;margin:32px auto;padding:32px;background:#fff;border-radius:20px">',
      '<p style="margin:0 0 12px;color:#6c4de6;font-weight:700;letter-spacing:.08em">VIBEMATCH</p>',
      '<h1 style="margin:0 0 16px;font-size:28px">Your sign-in link is ready</h1>',
      '<p style="margin:0 0 24px;line-height:1.6">Use this private link to continue to VibeMatch.</p>',
      `<p style="margin:0 0 24px"><a href="${escapedLink}" style="display:inline-block;padding:14px 22px;background:#6c4de6;color:#fff;text-decoration:none;border-radius:12px;font-weight:700">Sign in to VibeMatch</a></p>`,
      `<p style="margin:0 0 16px;line-height:1.6">This link expires at <strong>${escapedExpiry}</strong>.</p>`,
      '<p style="margin:0;color:#645f70;line-height:1.6">For your security, do not share this link with anyone. If you did not request it, you can ignore this email.</p>',
      '</main></body></html>',
    ].join('');

    try {
      const result = await this.sendEmail({
        from: this.from,
        to: [message.email],
        subject: 'Your VibeMatch sign-in link',
        html,
        text,
      });
      if (result.error) throw new Error('Resend rejected the email request.');
    } catch {
      // Provider errors can contain credentials or the request body; never forward them.
      throw new Error('Unable to send VibeMatch sign-in email.');
    }
  }
}

/** Select the non-delivering development adapter only outside production. */
export function createEmailProvider(env: NodeJS.ProcessEnv = process.env): EmailProvider {
  if (env.NODE_ENV !== 'production') return new DevelopmentEmailProvider();
  return new ResendEmailProvider({
    apiKey: env.RESEND_API_KEY ?? '',
    from: env.VIBEMATCH_EMAIL_FROM ?? '',
    appUrl: env.VIBEMATCH_APP_URL ?? '',
    webOrigin: env.WEB_ORIGIN,
  });
}
