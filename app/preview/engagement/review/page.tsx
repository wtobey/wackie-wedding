import { notFound } from 'next/navigation';
import EngagementHero from '@/components/wedding_v1/EngagementHero';
import { engagementPhotos } from '@/data/engagement-photos';
import WeddingShell from '@/components/wedding_v1/WeddingShell';

export const metadata = {
  title: 'Will + Jackie · Landing page review',
  robots: { index: false, follow: false },
};

export default async function EngagementReview({ searchParams }: { searchParams: Promise<{ layout?: string; edit?: string }> }) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const { layout, edit } = await searchParams;
  return <WeddingShell>
    <EngagementHero photos={engagementPhotos} layout={layout === 'paired' ? 'paired' : 'asymmetric'} reveal="unveil" editable={edit === 'mobile'} editTarget="mobile" />
  </WeddingShell>;
}
