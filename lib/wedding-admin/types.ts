import type { PhotoCrop } from './crop';
export type PhotoCollection = 'gallery' | 'venue';
export type ManagedPhoto = {
  id: string; collection: PhotoCollection; imageUrl: string;
  thumbnailUrl?: string; smallUrl?: string;
  crop?: PhotoCrop;
  caption: string; alt: string; photoDate: string | null; included: boolean;
};
export type PhotoLibrary = { revision: number; photos: ManagedPhoto[] };
