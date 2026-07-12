import { describe, test, expect } from 'bun:test';
import sharp from 'sharp';
import { processImage, probeImage } from './pipeline';

const makePng = (width = 320, height = 240) =>
  sharp({ create: { width, height, channels: 3, background: '#808080', noise: { type: 'gaussian', mean: 128, sigma: 30 } } })
    .png()
    .toBuffer();

describe('processImage', () => {
  test('encodes to webp and shrinks a noisy png', async () => {
    const input = await makePng();
    const out = await processImage(input, [
      { type: 'encode', params: { format: 'webp', quality: 80, effort: 4 } },
    ] as never);

    expect(out.format).toBe('webp');
    expect(out.data.byteLength).toBeLessThan(input.byteLength);
    expect(out.width).toBe(320);
  });

  test('resize inside caps the longest side without enlarging', async () => {
    const input = await makePng(400, 200);
    const out = await processImage(input, [
      { type: 'resize', params: { width: 100, height: 100, fit: 'inside', position: 'centre' } },
      { type: 'encode', params: { format: 'webp', quality: 80, effort: 4 } },
    ] as never);

    expect(out.width).toBe(100);
    expect(out.height).toBe(50);
  });

  test('cover with attention produces the exact requested dimensions', async () => {
    const input = await makePng(400, 200);
    const out = await processImage(input, [
      { type: 'resize', params: { width: 64, height: 64, fit: 'cover', position: 'attention' } },
      { type: 'encode', params: { format: 'webp', quality: 80, effort: 4 } },
    ] as never);

    expect(out.width).toBe(64);
    expect(out.height).toBe(64);
  });

  test('encodes avif', async () => {
    const input = await makePng(64, 64);
    const out = await processImage(input, [
      { type: 'encode', params: { format: 'avif', quality: 50, effort: 2 } },
    ] as never);

    expect(out.format).toBe('heif');
  });

  test('probeImage reports dimensions and megapixels', async () => {
    const probe = await probeImage(await makePng(1000, 500));
    expect(probe.width).toBe(1000);
    expect(probe.format).toBe('png');
    expect(probe.megapixels).toBe(0.5);
  });
});
