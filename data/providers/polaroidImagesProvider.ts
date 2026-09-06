import { supabase, STORAGE_BUCKET } from '@/lib/supabase';

export interface PolaroidImage {
  id: number;
  imageUrl: string;
  caption: string | null;
  photoDate: string | null;
}

export interface PolaroidImagesProvider {
  name: string;
  loadImages(): Promise<PolaroidImage[]>;
}

export class SupabasePolaroidImagesProvider implements PolaroidImagesProvider {
  name = 'supabase';

  async loadImages(): Promise<PolaroidImage[]> {
    if (!supabase) {
      throw new Error('Supabase client not configured');
    }

    const { data, error } = await supabase
      .from('polaroids')
      .select('*');

    if (error) {
      throw new Error(`Failed to load polaroid images: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('No polaroid images found in database');
    }

    const images = data.map(row => {
      const { data: urlData } = supabase!.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(row.image_path);

      return {
        id: row.id,
        imageUrl: urlData.publicUrl,
        caption: row.caption,
        photoDate: row.photo_date,
      };
    });

    // Preload images into browser cache
    for (const image of images) {
      const img = new Image();
      img.src = image.imageUrl;
    }

    return images;
  }
}

export class GeneratedPolaroidImagesProvider implements PolaroidImagesProvider {
  name = 'generated';
  private count: number;

  constructor(count: number = 20) {
    this.count = count;
  }

  async loadImages(): Promise<PolaroidImage[]> {
    const images: PolaroidImage[] = [];
    for (let i = 0; i < this.count; i++) {
      images.push({
        id: i,
        imageUrl: this.generateRandomImage(),
        caption: null,
        photoDate: null,
      });
    }
    return images;
  }

  private generateRandomImage(): string {
    const colors: string[][] = [
      ['#FF6B6B', '#4ECDC4', '#45B7D1'],
      ['#96CEB4', '#FFEAA7', '#DDA0DD'],
      ['#6C5CE7', '#A29BFE', '#FD79A8'],
      ['#00B894', '#00CEC9', '#81ECEC'],
      ['#E17055', '#FDCB6E', '#F8B500'],
      ['#2D3436', '#636E72', '#B2BEC3'],
      ['#D63031', '#E84393', '#FD79A8'],
      ['#0984E3', '#74B9FF', '#A29BFE'],
    ];

    const palette = colors[Math.floor(Math.random() * colors.length)];
    const shapes: string[] = [];

    for (let i = 0; i < 5; i++) {
      const color = palette[Math.floor(Math.random() * palette.length)];
      const opacity = 0.6 + Math.random() * 0.4;

      if (Math.random() > 0.5) {
        const cx = Math.random() * 300;
        const cy = Math.random() * 300;
        const r = 30 + Math.random() * 80;
        shapes.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="${opacity}"/>`);
      } else {
        const x = Math.random() * 200;
        const y = Math.random() * 200;
        const w = 50 + Math.random() * 100;
        const h = 50 + Math.random() * 100;
        const rotate = Math.random() * 360;
        shapes.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" opacity="${opacity}" transform="rotate(${rotate} ${x + w/2} ${y + h/2})"/>`);
      }
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300">
      <rect width="300" height="300" fill="${palette[0]}22"/>
      ${shapes.join('')}
    </svg>`;

    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }
}

export async function loadFromProviders(
  primary: PolaroidImagesProvider,
  fallback: PolaroidImagesProvider
): Promise<PolaroidImage[]> {
  try {
    return await primary.loadImages();
  } catch {
    // Primary failed, try fallback
  }

  return fallback.loadImages();
}
