export type MagicLinkMessage = { email: string; token: string; expiresAt: Date };

export interface EmailProvider {
  sendMagicLink(message: MagicLinkMessage): Promise<void>;
}

/** Development/test adapter. It never sends external mail and is not selected in production. */
export class DevelopmentEmailProvider implements EmailProvider {
  public readonly delivered: MagicLinkMessage[] = [];
  async sendMagicLink(message: MagicLinkMessage) {
    this.delivered.push(message);
  }
}

export class UnconfiguredEmailProvider implements EmailProvider {
  async sendMagicLink() {
    throw new Error('VIBEMATCH_EMAIL_PROVIDER is not configured.');
  }
}

export function createEmailProvider(): EmailProvider {
  if (process.env.NODE_ENV === 'production') return new UnconfiguredEmailProvider();
  return new DevelopmentEmailProvider();
}
