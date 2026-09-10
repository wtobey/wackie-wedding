import type { Metadata } from 'next';
import PhotoManager from '@/components/wedding_v1/PhotoManager';
export const metadata: Metadata = { title: 'Photo manager', robots: { index: false, follow: false } };
export default function AdminPage() { return <PhotoManager/>; }
