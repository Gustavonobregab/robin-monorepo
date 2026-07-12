import { describe, test, expect } from 'bun:test';
import { validateMagicBytes, ALLOWED_EXTENSIONS } from './upload.types';

const bytes = (...values: number[]) => new Uint8Array([...values, ...Array(12 - values.length).fill(0)]);

describe('validateMagicBytes for images', () => {
  test('detects JPEG (FF D8 FF)', () => {
    expect(validateMagicBytes(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('jpeg');
  });

  test('detects PNG (89 50 4E 47 0D 0A 1A 0A)', () => {
    expect(validateMagicBytes(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe('png');
  });

  test('detects WebP (RIFF....WEBP)', () => {
    const buffer = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    expect(validateMagicBytes(buffer)).toBe('webp');
  });

  test('image extensions are allowed', () => {
    for (const ext of ['.jpg', '.jpeg', '.png', '.webp'] as const) {
      expect(ALLOWED_EXTENSIONS).toContain(ext);
    }
  });

  test('WAV is still detected, not misread as WebP', () => {
    const wav = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45]);
    expect(validateMagicBytes(wav)).toBe('wav');
  });
});
