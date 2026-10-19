import EngagementHero from "@/components/wedding_v1/EngagementHero";
import { engagementPhotos } from "@/data/engagement-photos";

export default function WeddingHome() {
  return <EngagementHero photos={engagementPhotos} />;
}
