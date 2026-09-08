import type { Metadata } from "next";
import WeddingShell from "@/components/wedding_v1/WeddingShell";

export const metadata: Metadata = {
  title: { default: "Will + Jackie · June 5, 2027", template: "%s · Will + Jackie" },
  description: "A weekend by the river. Celebrate with Will and Jackie at Dawn Ranch in Guerneville, June 5, 2027.",
  robots: { index: false, follow: false },
  openGraph: { title: "Will + Jackie · Let’s get Wackie", description: "June 5, 2027 · Dawn Ranch · Guerneville, California", url: "/wedding_v1" },
  twitter: { title: "Will + Jackie · Let’s get Wackie", description: "June 5, 2027 · Dawn Ranch · Guerneville, California" },
};

export default function WeddingLayout({ children }: { children: React.ReactNode }) {
  return <WeddingShell>{children}</WeddingShell>;
}
