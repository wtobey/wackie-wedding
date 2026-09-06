import SecurityGate from "@/components/SecurityGate";
import PolaroidFall from "@/components/PolaroidFall";

// The original wackie-wedding home: a Supabase-backed security gate wrapping the
// click-to-drop polaroid experience. Both are Client Components; this page is a
// Server Component that simply composes them. The new river lives at /river.
export default function Home() {
  return (
    <SecurityGate>
      <PolaroidFall />
    </SecurityGate>
  );
}
