import type { Metadata, Viewport } from "next";
import { Fraunces } from "next/font/google";
import "./globals.css";

// Fraunces is a variable font — omit `weight` to load the full axis and expose it
// as a CSS variable. next/font hashes the real family name, so everything downstream
// must reference `var(--font-fraunces)` rather than the literal "Fraunces".
const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://wackie.wedding"),
  title: "Wackie Wedding",
  description: "Coming Soon",
  openGraph: {
    type: "website",
    title: "Wackie Wedding",
    description: "Coming Soon",
    url: "https://wackie.wedding",
    images: ["/og_image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Wackie Wedding",
    description: "Coming Soon",
    images: ["/og_image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#FAF7F2",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={fraunces.variable}>
      <body>
        <link rel="stylesheet" href="https://use.typekit.net/fhe5uug.css?v=postea" precedence="wedding-fonts" />
        {children}
      </body>
    </html>
  );
}
