import sharp from 'sharp';

const SAMPLES = [
  { name: 'photo-12MP', width: 4000, height: 3000 },
  { name: 'screenshot-4K', width: 3840, height: 2160 },
  { name: 'product-1500', width: 1500, height: 1500 },
];

const CONFIGS = [
  { label: 'webp q80 e4', encode: (c: sharp.Sharp) => c.webp({ quality: 80, effort: 4 }) },
  { label: 'avif q50 e2', encode: (c: sharp.Sharp) => c.avif({ quality: 50, effort: 2 }) },
  { label: 'avif q50 e4', encode: (c: sharp.Sharp) => c.avif({ quality: 50, effort: 4 }) },
  { label: 'avif q50 e6', encode: (c: sharp.Sharp) => c.avif({ quality: 50, effort: 6 }) },
  { label: 'jpeg q80 moz', encode: (c: sharp.Sharp) => c.jpeg({ quality: 80, mozjpeg: true }) },
];

// Deterministic noisy gradient: rough stand-in for photographic entropy
async function makeSample(width: number, height: number): Promise<Buffer> {
  const raw = Buffer.alloc(width * height * 3);
  for (let i = 0; i < raw.length; i++) {
    raw[i] = (i * 7 + Math.floor(i / width) * 13 + Math.floor(Math.sin(i / 997) * 127 + 128)) & 0xff;
  }
  return sharp(raw, { raw: { width, height, channels: 3 } }).jpeg({ quality: 90 }).toBuffer();
}

for (const sample of SAMPLES) {
  const input = await makeSample(sample.width, sample.height);
  console.log(`\n=== ${sample.name} (input ${(input.byteLength / 1024).toFixed(0)}KB) ===`);

  for (const config of CONFIGS) {
    const start = performance.now();
    const out = await config.encode(sharp(input)).toBuffer();
    const ms = Math.round(performance.now() - start);
    const saved = (100 - (out.byteLength / input.byteLength) * 100).toFixed(0);
    console.log(`${config.label.padEnd(14)} ${String(ms).padStart(6)}ms  ${(out.byteLength / 1024).toFixed(0).padStart(6)}KB  (-${saved}%)  rss ${(process.memoryUsage().rss / 1024 / 1024).toFixed(0)}MB`);
  }
}
process.exit(0);
