import { CreateVibeForm } from '../../../components/vibematch/CreateVibeForm';
import { privatePageMetadata } from '../../../lib/metadata';

export const metadata = privatePageMetadata({
  title: 'Create your Vibe',
  description: 'Create a private VibeMatch session.',
  path: '/vibematch/create',
});
export default function CreateVibePage() {
  return <CreateVibeForm />;
}
