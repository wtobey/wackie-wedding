import type { CSSProperties } from 'react';
export type PhotoCrop = { x: number; y: number; zoom: number };
export const defaultCrop: PhotoCrop = { x: 50, y: 50, zoom: 1 };
export function validCrop(value: unknown): value is PhotoCrop {
  if (!value || typeof value !== 'object') return false;
  const crop = value as PhotoCrop;
  return Number.isFinite(crop.x) && crop.x >= 0 && crop.x <= 100 && Number.isFinite(crop.y) && crop.y >= 0 && crop.y <= 100 && Number.isFinite(crop.zoom) && crop.zoom >= 1 && crop.zoom <= 3;
}
export function cropStyle(crop?: PhotoCrop): CSSProperties {
  const { x, y, zoom } = crop ?? defaultCrop;
  return { objectFit: 'cover', objectPosition: `${x}% ${y}%`, transform: `scale(${zoom})`, transformOrigin: `${x}% ${y}%` };
}
