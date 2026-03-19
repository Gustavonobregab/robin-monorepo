export type UploadDocument = {
  id: string;
  userId: string;
  originalName: string;
  mimeType: string;
  size: number;
  s3Key: string;
  status: 'ready';
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type UploadResponse = {
  id: string;
  originalName: string;
  size: number;
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

export const ALLOWED_EXTENSIONS = ['.mp3', '.wav'] as const;
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export function validateMagicBytes(buffer: Uint8Array): 'mp3' | 'wav' | null {
  // Check MP3 signatures
  for (const sig of MP3_SIGNATURES) {
    if (sig.every((byte, i) => buffer[i] === byte)) {
      return 'mp3';
    }
  }

  // Check WAV: RIFF header (bytes 0-3) + WAVE (bytes 8-11)
  const isRiff = WAV_RIFF.every((byte, i) => buffer[i] === byte);
  const isWave = buffer.length >= 12 && WAV_WAVE.every((byte, i) => buffer[8 + i] === byte);

  if (isRiff && isWave) {
    return 'wav';
  }

  return null;
}
