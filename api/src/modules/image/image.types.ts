import { t, type Static } from 'elysia';

export type ImageEncodeFormat = 'webp' | 'avif' | 'jpeg' | 'png';

export const IMAGE_OPERATIONS = {
  'resize': {
    name: 'Resize',
    description: 'Fit within width/height, or smart-crop with fit=cover',
    params: {
      width: { type: 'number', min: 16, max: 8192, default: 0 },
      height: { type: 'number', min: 16, max: 8192, default: 0 },
      fit: { type: 'string', default: 'inside' },
      position: { type: 'string', default: 'centre' },
    },
  },
  'encode': {
    name: 'Encode',
    description: 'Output encoding — WebP by default (universal support), AVIF for maximum compression (queued)',
    params: {
      format: { type: 'string', default: 'webp' },
      quality: { type: 'number', min: 1, max: 100, default: 80 },
      // Benchmarked on the worker: AVIF effort 2 matches WebP speed at ~2x the savings
      effort: { type: 'number', min: 0, max: 9, default: 4 },
    },
  },
} as const;

export type ImageOperationType = keyof typeof IMAGE_OPERATIONS;

export const IMAGE_PRESETS = {
  chill: {
    name: 'Chill',
    description: 'Original dimensions, near-lossless WebP',
    operations: [
      { type: 'encode', params: { format: 'webp', quality: 85 } },
    ],
  },
  medium: {
    name: 'Medium',
    description: 'Capped at 2560px, balanced WebP',
    operations: [
      { type: 'resize', params: { width: 2560, height: 2560, fit: 'inside' } },
      { type: 'encode', params: { format: 'webp', quality: 80 } },
    ],
  },
  aggressive: {
    name: 'Aggressive',
    description: 'Capped at 2048px, AVIF for maximum savings (queued)',
    operations: [
      { type: 'resize', params: { width: 2048, height: 2048, fit: 'inside' } },
      { type: 'encode', params: { format: 'avif', quality: 50, effort: 2 } },
    ],
  },
  thumbnail: {
    name: 'Thumbnail',
    description: '512px smart-cropped WebP',
    operations: [
      { type: 'resize', params: { width: 512, height: 512, fit: 'cover', position: 'attention' } },
      { type: 'encode', params: { format: 'webp', quality: 75 } },
    ],
  },
} as const;

export type ImagePreset = keyof typeof IMAGE_PRESETS;

export const ImageOperationSchema = t.Union([
  t.Object({
    type: t.Literal('resize'),
    params: t.Optional(t.Object({
      width: t.Optional(t.Number({ minimum: 16, maximum: 8192 })),
      height: t.Optional(t.Number({ minimum: 16, maximum: 8192 })),
      fit: t.Optional(t.Union([t.Literal('inside'), t.Literal('cover'), t.Literal('contain')])),
      position: t.Optional(t.Union([t.Literal('centre'), t.Literal('attention'), t.Literal('entropy')])),
    })),
  }),
  t.Object({
    type: t.Literal('encode'),
    params: t.Optional(t.Object({
      format: t.Optional(t.Union([t.Literal('webp'), t.Literal('avif'), t.Literal('jpeg'), t.Literal('png')])),
      quality: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
      effort: t.Optional(t.Number({ minimum: 0, maximum: 9 })),
    })),
  }),
]);

export type ImageOperation = Static<typeof ImageOperationSchema>;

export const ImagePresetSchema = t.Union([
  t.Literal('chill'),
  t.Literal('medium'),
  t.Literal('aggressive'),
  t.Literal('thumbnail'),
]);

export interface ProcessImageInput {
  imageId: string;
  preset?: ImagePreset;
  operations?: ImageOperation[];
  webhookUrl?: string;
  idempotencyKey?: string;
}
