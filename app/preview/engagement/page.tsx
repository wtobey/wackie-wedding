import { notFound } from 'next/navigation';
import Link from 'next/link';
import EngagementHero from '@/components/wedding_v1/EngagementHero';
import { engagementPhotos } from '@/data/engagement-photos';
import styles from '@/app/wedding_v1/wedding.module.css';

export const metadata = {
  title: 'Engagement collage preview',
  robots: { index: false, follow: false },
};

export default async function EngagementPreview({ searchParams }: { searchParams: Promise<{ layout?: string; reveal?: string }> }) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const params = await searchParams;
  const layout = params.layout === 'paired' ? 'paired' : 'asymmetric';
  const reveal = params.reveal === 'recede' || params.reveal === 'dissolve' ? params.reveal : 'unveil';

  return <div className={styles.site} data-unlocking="false">
    <div style={{ padding: '16px 20px', textAlign: 'center', fontSize: 13 }}>
      <Link href={`/preview/engagement/review?layout=${layout}`} style={{ display: 'inline-block', padding: '8px 16px', marginBottom: 12, border: '1px solid currentColor', borderRadius: 4 }}>Open clean review</Link>
      <br />Full-width desktop collage · Eleven engagement photos
      <br />The invitation fades into the collage once the images load. Use Replay reveal to watch it again.
      <nav aria-label="Compare collage layouts" style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 8 }}>
        <Link href="?layout=paired" aria-current={layout === 'paired' ? 'page' : undefined} style={{ padding: '12px 0', textDecoration: layout === 'paired' ? 'underline' : 'none' }}>Option 1</Link>
        <Link href="?layout=asymmetric" aria-current={layout === 'asymmetric' ? 'page' : undefined} style={{ padding: '12px 0', textDecoration: layout === 'asymmetric' ? 'underline' : 'none' }}>Option 2</Link>
      </nav>
      <nav aria-label="Desktop reveal options" style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 20, marginTop: 4 }}>
        {([['dissolve', 'Soft dissolve'], ['recede', 'Pull back'], ['unveil', 'Open outward']] as const).map(([value, label]) =>
          <Link key={value} href={`?layout=${layout}&reveal=${value}`} aria-current={reveal === value ? 'page' : undefined} style={{ padding: '12px 0', textDecoration: reveal === value ? 'underline' : 'none' }}>{label}</Link>)}
      </nav>
      <p style={{ margin: '4px auto', maxWidth: 600 }}>{reveal === 'dissolve' ? 'The card slowly dissolves as the whole collage appears.' : reveal === 'recede' ? 'The card gently shrinks and fades as the photos settle into place.' : 'The card first grows to the full collage height. Then it fades as the photos open outward.'}</p>
    </div>
    <EngagementHero editable key={`${layout}-${reveal}`} layout={layout} reveal={reveal} photos={engagementPhotos} />
  </div>;
}
