import type { Metadata } from "next";
import { Parisienne } from "next/font/google";
import WeddingGallery from "@/components/wedding_v1/WeddingGallery";
import timeline from "@/components/wedding_v1/photo-timeline.module.css";

export const metadata: Metadata = { title: "Gallery" };
const storyScript = Parisienne({ weight: "400", subsets: ["latin"], variable: "--font-wedding-story", display: "swap" });
export default function Gallery() {
  return <div className={`${timeline.galleryPage} ${storyScript.variable}`}><h1 className={timeline.srOnly}>Gallery</h1><WeddingGallery/></div>;
}
