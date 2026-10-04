import type { Metadata } from 'next';
import { CreateVibeForm } from '../../../components/vibematch/CreateVibeForm';

export const metadata: Metadata = { title: 'Create your Vibe' };
export default function CreateVibePage() {
  return <CreateVibeForm />;
}
