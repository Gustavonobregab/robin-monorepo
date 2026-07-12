export type UploadDocument = {
  id: string;
  userId: string;
  originalName: string;
  mimeType: string;
  size: number;
  s3Key: string;
  status: 'pending' | 'ready';
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateUploadResponse = {
  id: string;
  uploadUrl: string;
  contentType: string;
  uploadUrlExpiresIn: number;
  expiresAt: string;
};

const MP3_SIGNATURES = [
  [0xff, 0xfb], // MPEG1 Layer 3
  [0xff, 0xf3], // MPEG2 Layer 3
  [0xff, 0xf2], // MPEG2.5 Layer 3
  [0xff, 0xfa], // MPEG1 Layer 3 with CRC
  [0x49, 0x44, 0x33], // ID3v2 tag
] as const;

const WAV_RIFF = [0x52, 0x49, 0x46, 0x46]; // "RIFF"
const WAV_WAVE = [0x57, 0x41, 0x56, 0x45]; // "WAVE" at offset 8
const WEBP_MARK = [0x57, 0x45, 0x42, 0x50]; // "WEBP" at offset 8

const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46]; // "%PDF"
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.pdf', '.txt', '.jpg', '.jpeg', '.png', '.webp'] as const;
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export type DetectedFormat = 'mp3' | 'wav' | 'pdf' | 'jpeg' | 'png' | 'webp';

export function validateMagicBytes(buffer: Uint8Array): DetectedFormat | null {
  for (const sig of MP3_SIGNATURES) {
    if (sig.every((byte, i) => buffer[i] === byte)) {
      return 'mp3';
    }
  }

  // RIFF containers share the header; bytes 8-11 tell WAV from WebP apart
  if (WAV_RIFF.every((byte, i) => buffer[i] === byte) && buffer.length >= 12) {
    if (WAV_WAVE.every((byte, i) => buffer[8 + i] === byte)) return 'wav';
    if (WEBP_MARK.every((byte, i) => buffer[8 + i] === byte)) return 'webp';
  }

  if (PDF_SIGNATURE.every((byte, i) => buffer[i] === byte)) {
    return 'pdf';
  }

  if (JPEG_SIGNATURE.every((byte, i) => buffer[i] === byte)) {
    return 'jpeg';
  }

  if (PNG_SIGNATURE.every((byte, i) => buffer[i] === byte)) {
    return 'png';
  }

  return null;
}
