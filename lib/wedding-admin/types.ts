export type PhotoCollection = 'gallery' | 'venue';
export type ManagedPhoto = {
  id: string; collection: PhotoCollection; imageUrl: string;
  caption: string; alt: string; photoDate: string | null; included: boolean;
};
export type PhotoLibrary = { revision: number; photos: ManagedPhoto[] };
