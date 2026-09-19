import ConfessionsFeed from './ConfessionsFeed';

type ConfessionsPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function ConfessionsPage({ searchParams }: ConfessionsPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  return <ConfessionsFeed page={page} />;
}
