import type { Metadata } from 'next';
import { MagicLinkVerification } from '../../../components/vibematch/MagicLinkVerification';

export const metadata: Metadata = { title: 'Verify your VibeMatch sign-in' };

export default function VibeMatchVerifyPage() {
  return <MagicLinkVerification />;
}
