import type { Metadata } from 'next';
import RsvpForm from '@/components/rsvp/RsvpForm';
export const metadata: Metadata = {
  title: 'RSVP',
  robots: { index: false, follow: false },
};
export default function RsvpPage() {
  return <RsvpForm />;
}
