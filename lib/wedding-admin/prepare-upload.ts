'use client';

export const photoAccept = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif';
const uploadLimit = 4 * 1024 * 1024;

export function uploadDimensions(width: number, height: number, longestEdge = 2400) {
  if (width <= 0 || height <= 0) throw new Error('This photo has invalid dimensions.');
  const scale = Math.min(1, longestEdge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

async function decodePhoto(file: File): Promise<{ image: CanvasImageSource; width: number; height: number; close: () => void }> {
  // Native decoding handles orientation and supports HEIC on compatible browsers.
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    return { image: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
  } catch { /* Try the browser's image element before loading the HEIC decoder. */ }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return { image, width: image.naturalWidth, height: image.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch { URL.revokeObjectURL(url); }
  if (/\.(heic|heif)$/i.test(file.name) || /image\/hei[cf]/i.test(file.type)) {
    const { heicTo } = await import('heic-to');
    const bitmap = await heicTo({ blob: file, type: 'bitmap' });
    return { image: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
  }
  throw new Error('Could not read this photo. Choose a JPG, PNG, WebP, HEIC or HEIF image.');
}

function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not prepare this photo.')), 'image/jpeg', quality));
}

export async function preparePhotoUpload(file: File): Promise<File> {
  const decoded = await decodePhoto(file);
  const canvas = document.createElement('canvas');
  try {
    if (file.size <= uploadLimit && Math.max(decoded.width, decoded.height) <= 2400 && ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return file;
    for (const longestEdge of [2400, 1920, 1440]) {
      const size = uploadDimensions(decoded.width, decoded.height, longestEdge);
      canvas.width = size.width; canvas.height = size.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('This browser could not prepare the photo.');
      context.fillStyle = '#fff'; context.fillRect(0, 0, size.width, size.height);
      context.drawImage(decoded.image, 0, 0, size.width, size.height);
      for (const quality of [0.9, 0.8, 0.7]) {
        const blob = await encode(canvas, quality);
        if (blob.size <= uploadLimit) return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg', lastModified: file.lastModified });
      }
    }
    throw new Error('Could not make this photo small enough to upload.');
  } finally {
    decoded.close(); canvas.width = 0; canvas.height = 0;
  }
}
