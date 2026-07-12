import sharp, { type Sharp } from 'sharp';
import type { ImageOperation } from '../../modules/image/image.types';

export type ProcessedImage = { data: Buffer; format: string; width: number; height: number };

type ResizeParams = { width: number; height: number; fit: 'inside' | 'cover' | 'contain'; position: 'centre' | 'attention' | 'entropy' };
type EncodeParams = { format: 'webp' | 'avif' | 'jpeg' | 'png'; quality: number; effort: number };

export async function processImage(input: Buffer, operations: ImageOperation[]): Promise<ProcessedImage> {
  // rotate() bakes in EXIF orientation, which is lost when metadata is stripped
  let chain = sharp(input).rotate();

  for (const op of operations) {
    const params = ('params' in op ? op.params : {}) as Record<string, unknown>;
    if (op.type === 'resize') chain = applyResize(chain, params as ResizeParams);
    if (op.type === 'encode') chain = applyEncode(chain, params as EncodeParams);
  }

  const { data, info } = await chain.toBuffer({ resolveWithObject: true });
  return { data, format: info.format, width: info.width, height: info.height };
}

export async function probeImage(input: Buffer) {
  const meta = await sharp(input).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  return {
    width,
    height,
    format: meta.format ?? 'unknown',
    megapixels: +((width * height) / 1_000_000).toFixed(2),
  };
}

function applyResize(chain: Sharp, params: ResizeParams): Sharp {
  if (!params.width && !params.height) return chain;

  // Crop strategies (attention/entropy) only apply to cover fits
  const position =
    params.fit === 'cover' && params.position !== 'centre'
      ? sharp.strategy[params.position]
      : 'centre';

  return chain.resize({
    width: params.width || undefined,
    height: params.height || undefined,
    fit: params.fit,
    position,
    withoutEnlargement: true,
  });
}

function applyEncode(chain: Sharp, params: EncodeParams): Sharp {
  switch (params.format) {
    case 'avif':
      return chain.avif({ quality: params.quality, effort: Math.min(params.effort, 9) });
    case 'jpeg':
      return chain.jpeg({ quality: params.quality, mozjpeg: true });
    case 'png':
      return chain.png({ quality: params.quality, effort: Math.max(1, Math.min(params.effort, 10)), palette: true });
    case 'webp':
    default:
      return chain.webp({ quality: params.quality, effort: Math.min(params.effort, 6) });
  }
}
