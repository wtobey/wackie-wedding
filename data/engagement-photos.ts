import type { PhotoCrop } from '@/lib/wedding-admin/crop';

export type EngagementPhoto = {
  src: string;
  alt: string;
  orientation: 'portrait' | 'landscape';
  crop?: PhotoCrop;
};

// Select 5–10 images, including 1–3 landscapes. Portraits use 2:3 frames;
// landscapes use 3:2 frames. Order within each orientation is preserved.
// The beach-together portrait is cropped horizontally with the couple kept in
// frame; the coastal panorama is a native landscape. Originals are unchanged. The additional
// black-and-white-embrace.webp is retained as an alternate to the lead portrait.
export const engagementPhotos: EngagementPhoto[] = [
  { src: '/engagement/beach-embrace.webp', alt: 'Jackie and Will embracing by the ocean', orientation: 'portrait' },
  { src: '/engagement/shadows.webp', alt: 'Jackie and Will’s shadows together on a coastal path', orientation: 'portrait', crop: { x: 45, y: 60, zoom: 1 } },
  { src: '/engagement/ocean-dance.webp', alt: 'Jackie and Will laughing together in the surf', orientation: 'portrait' },
  { src: '/engagement/holding-hands.webp', alt: 'Jackie and Will holding hands as they walk along the beach', orientation: 'portrait' },
  { src: '/engagement/sunset-waves.webp', alt: 'Jackie and Will facing each other in the sunset surf', orientation: 'portrait' },
  { src: '/engagement/piggyback.webp', alt: 'Jackie smiling as Will carries her on the beach', orientation: 'portrait' },
  { src: '/engagement/coastal-panorama.webp', alt: 'Jackie and Will on a coastal path above the beach and ocean', orientation: 'landscape' },
  { src: '/engagement/beach-together.webp', alt: 'Jackie and Will standing together on the beach beside the coastal cliffs', orientation: 'landscape', crop: { x: 50, y: 66, zoom: 1 } },
];

// Additional photos fill the desktop collage while preserving the mobile selection.
export const desktopAdditionalPhotos: EngagementPhoto[] = [
  { src: '/engagement/seated-by-cliffs.webp', alt: 'Jackie and Will sitting together on the sand beneath the coastal cliffs', orientation: 'portrait' },
  { src: '/engagement/sunset-gaze.webp', alt: 'Jackie and Will looking at each other in the golden evening light', orientation: 'portrait', crop: { x: 50, y: 26, zoom: 1 } },
  { src: '/engagement/sunset-hand-in-hand.webp', alt: 'Jackie and Will holding hands in the golden sunset surf', orientation: 'portrait' },
  { src: '/engagement/beach-lift.webp', alt: 'Will lifting Jackie in an embrace on the beach', orientation: 'portrait' },
  { src: '/engagement/ocean-smiles.webp', alt: 'Jackie and Will smiling at each other by the ocean', orientation: 'portrait' },
  { src: '/engagement/cliff-embrace.webp', alt: 'Jackie and Will embracing beneath the coastal cliffs and palms', orientation: 'portrait' },
  { src: '/engagement/sunset-kiss.webp', alt: 'Will lifting Jackie for a kiss in the sunset surf', orientation: 'portrait', crop: { x: 50, y: 12, zoom: 1 } },
];
