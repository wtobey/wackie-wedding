import type { Metadata } from 'next';
import RsvpAdmin from '@/components/rsvp/RsvpAdmin';
export const metadata: Metadata = {
  title: 'RSVP manager',
  robots: { index: false, follow: false },
};
export default function RsvpAdminPage() {
  return <RsvpAdmin />;
}
