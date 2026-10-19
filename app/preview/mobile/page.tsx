import { notFound } from 'next/navigation';

export const metadata = { title: 'Mobile homepage preview', robots: { index: false, follow: false } };

export default async function MobilePreview({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  if (process.env.NODE_ENV !== 'development') notFound();
  return <main style={{ minHeight: '100vh', padding: '24px 16px', boxSizing: 'border-box', background: '#e8e3dd', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
    <p style={{ margin: 0, font: '14px system-ui', color: '#544436' }}>Mobile preview · 390 × 844</p>
    <a href={edit === 'mobile' ? '/preview/mobile' : '/preview/mobile?edit=mobile'} style={{ font: '12px system-ui', color: '#544436' }}>{edit === 'mobile' ? 'Clean preview' : 'Edit mobile layout'}</a>
    <iframe title="Mobile wedding homepage" src={edit === 'mobile' ? '/preview/engagement/review?edit=mobile' : '/preview/engagement/review'} style={{ display: 'block', width: 390, height: 844, flexShrink: 0, border: '8px solid #332a25', borderRadius: 28, boxSizing: 'content-box', background: '#faf7f2', boxShadow: '0 12px 40px #332a2526' }} />
  </main>;
}
