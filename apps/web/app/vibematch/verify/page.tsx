import { MagicLinkVerification } from '../../../components/vibematch/MagicLinkVerification';
import { privatePageMetadata } from '../../../lib/metadata';

export const metadata = privatePageMetadata({
  title: 'Verify your VibeMatch sign-in',
  description: 'Verify access to a private VibeMatch session.',
  path: '/vibematch/verify',
});

export default function VibeMatchVerifyPage() {
  return <MagicLinkVerification />;
}
