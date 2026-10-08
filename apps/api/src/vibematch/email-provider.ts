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

/** Explicit production placeholder; a real provider must be injected before production starts. */
export class UnconfiguredEmailProvider implements EmailProvider {
  async sendMagicLink() {
    throw new Error('VibeMatch production EmailProvider is not configured.');
  }
}

export function createEmailProvider(
  env: NodeJS.ProcessEnv = process.env,
  configuredProvider?: EmailProvider,
): EmailProvider {
  if (env.NODE_ENV !== 'production') return new DevelopmentEmailProvider();
  return configuredProvider ?? new UnconfiguredEmailProvider();
}
