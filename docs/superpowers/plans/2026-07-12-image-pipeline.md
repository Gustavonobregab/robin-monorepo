# Image Compression Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the image compression pipeline (the third modality) end to end — upload, credits, queue/worker, sync fast-path, /v1 + dashboard surfaces, docs — mirroring the audio module's architecture.

**Architecture:** `sharp` (libvips) runs in-process in the existing Bun worker; small non-AVIF images (≤5MB) are processed synchronously in the API and returned as jobs born `completed` (the unified contract); everything else goes through a dedicated `IMAGE_QUEUE`. WebP is the default output; AVIF is the opt-in premium tier (always queued).

**Tech Stack:** Bun, Elysia, sharp (NEW dependency — the only one), BullMQ, Mongoose, R2 via AWS SDK.

## Global Constraints

- Follow `api/CLAUDE.md` and `dashboard/CLAUDE.md` conventions exactly (module pattern `<module>.<layer>.ts`, ApiError with UPPER_SNAKE codes, `{ success, data }` envelope, unified job contract, color tokens/Skeleton in the dashboard).
- Comments: single-line only, and only the "why".
- Every processing route returns the unified job view via `jobResponse(set, ...)` from `modules/jobs/job.http.ts`.
- Credits: reserve BEFORE work via `reserveCredits(userId, 'image', inputBytes)` (weights already seeded: 1 credit / started 2MB); rollback on failure; store `creditCost` on the payload.
- Usage: `usageService.recordSafe` only, with `image: { width, height, format, megapixels }`.
- Webhooks: `webhooksService.enqueueJobWebhook` only (never inline delivery).
- Deployment gotchas (from verified research): run the worker with `bun run` (NOT `bun build --compile`); glibc base image (not Alpine); ensure optionalDependencies resolve in CI/Docker.
- Run from `api/`: `bunx tsc --noEmit` and `bun test` must be green after every task. Dashboard tasks: `cd dashboard && bunx tsc --noEmit && bun run test`.
- Commits on branch `staging`, conventional messages, no Co-Authored-By.

---

### Task 0: Install sharp and benchmark AVIF/WebP on this machine

**Files:**
- Modify: `api/package.json` (dependency added by bun)
- Create: `api/src/scripts/bench-image.ts`

**Interfaces:**
- Produces: measured encode wall-clock + output sizes that decide the AVIF preset (`effort`, `quality`) used in Task 2, and confirms sharp loads under Bun.

- [ ] **Step 1: Install sharp**

```bash
cd api && bun add sharp
```

Expected: `installed sharp@0.3x` with `@img/sharp-*` optional packages. If install fails on postinstall, run `bun pm trust sharp` and retry.

- [ ] **Step 2: Write the benchmark script**

```ts
// api/src/scripts/bench-image.ts
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
```

- [ ] **Step 3: Run it and record the numbers**

Run: `bun run src/scripts/bench-image.ts`
Expected: a table per sample. Decision rules: if `avif q50 e4` ≤ ~3s for photo-12MP keep `effort: 4` as the AVIF preset; if slower, drop to `effort: 2`. WebP must be well under 1s (it will be). Synthetic noise is directional only — re-run with a real photo before pricing SLAs (drop a `.jpg` in `/tmp` and add it manually if available).

- [ ] **Step 4: Commit**

```bash
git add package.json bun.lock ../bun.lock src/scripts/bench-image.ts 2>/dev/null; git add -A ../bun.lock; git commit -m "feat(api): add sharp and image encode benchmark"
```

---

### Task 1: Accept image formats in uploads

**Files:**
- Modify: `api/src/modules/upload/upload.types.ts`
- Modify: `api/src/modules/upload/upload.service.ts` (MIME_MAP only)
- Create: `api/src/modules/upload/upload.types.test.ts`

**Interfaces:**
- Produces: `validateMagicBytes(buffer): 'mp3' | 'wav' | 'pdf' | 'jpeg' | 'png' | 'webp' | null`; `ALLOWED_EXTENSIONS` including `.jpg .jpeg .png .webp`; `MIME_MAP` entries `'.jpg' | '.jpeg' → 'image/jpeg'`, `'.png' → 'image/png'`, `'.webp' → 'image/webp'`.

- [ ] **Step 1: Write the failing test**

```ts
// api/src/modules/upload/upload.types.test.ts
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
    for (const ext of ['.jpg', '.jpeg', '.png', '.webp']) {
      expect(ALLOWED_EXTENSIONS).toContain(ext);
    }
  });

  test('WAV is still detected, not misread as WebP', () => {
    const wav = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45]);
    expect(validateMagicBytes(wav)).toBe('wav');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/modules/upload/upload.types.test.ts`
Expected: FAIL (`'jpeg'` not returned; extensions missing).

- [ ] **Step 3: Implement in upload.types.ts**

In `ALLOWED_EXTENSIONS`, replace the array with:

```ts
export const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.pdf', '.txt', '.jpg', '.jpeg', '.png', '.webp'] as const;
```

Change `validateMagicBytes` signature/return and add the checks (keep existing MP3/WAV/PDF logic):

```ts
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const WEBP_MARK = [0x57, 0x45, 0x42, 0x50]; // "WEBP" at offset 8, after RIFF

export function validateMagicBytes(buffer: Uint8Array): 'mp3' | 'wav' | 'pdf' | 'jpeg' | 'png' | 'webp' | null {
  // ...existing mp3 check...
  const isRiff = WAV_RIFF.every((byte, i) => buffer[i] === byte);
  if (isRiff && buffer.length >= 12) {
    if (WAV_WAVE.every((byte, i) => buffer[8 + i] === byte)) return 'wav';
    if (WEBP_MARK.every((byte, i) => buffer[8 + i] === byte)) return 'webp';
  }
  // ...existing pdf check...
  if (JPEG_SIGNATURE.every((byte, i) => buffer[i] === byte)) return 'jpeg';
  if (PNG_SIGNATURE.every((byte, i) => buffer[i] === byte)) return 'png';
  return null;
}
```

(Adapt the existing body: fold the old separate `isRiff && isWave` branch into the new RIFF block above.)

In `upload.service.ts`, extend `MIME_MAP`:

```ts
const MIME_MAP: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};
```

Note: `finalizeUpload` compares `MIME_MAP['.' + detected] !== doc.mimeType`. For a `.jpg` upload doc.mimeType is `image/jpeg` and detected `jpeg` maps via `'.jpeg'` to `image/jpeg` — matches. No change needed there.

- [ ] **Step 4: Run tests**

Run: `bun test src/modules/upload/upload.types.test.ts && bunx tsc --noEmit`
Expected: PASS, tsc clean.

- [ ] **Step 5: Commit**

```bash
git add src/modules/upload && git commit -m "feat(api): accept jpeg/png/webp uploads with magic-byte validation"
```

---

### Task 2: Image module types — operations, presets, schemas

**Files:**
- Create: `api/src/modules/image/image.types.ts`
- Modify: `api/src/worker/operations-registry.test.ts`

**Interfaces:**
- Produces: `IMAGE_OPERATIONS`, `IMAGE_PRESETS`, `ImageOperationSchema`, `ImagePresetSchema`, `ImageOperation`, `ImagePreset`, `ProcessImageInput { imageId: string; preset?; operations?; webhookUrl?; idempotencyKey? }`, `ImageEncodeFormat = 'webp' | 'avif' | 'jpeg' | 'png'`.
- AVIF preset values: use the effort chosen in Task 0 (plan default: `effort: 4`; adjust if the bench said otherwise).

- [ ] **Step 1: Write the failing registry test**

Append to `api/src/worker/operations-registry.test.ts`:

```ts
import { IMAGE_PRESETS, IMAGE_OPERATIONS } from '../modules/image/image.types';

describe('image operations registry', () => {
  test('every preset operation is an exposed operation', () => {
    for (const [name, preset] of Object.entries(IMAGE_PRESETS)) {
      for (const op of preset.operations) {
        expect(IMAGE_OPERATIONS[op.type as keyof typeof IMAGE_OPERATIONS], `${name} → ${op.type}`).toBeDefined();
      }
    }
  });

  test('when a preset has an encode step it is the last one', () => {
    for (const [name, preset] of Object.entries(IMAGE_PRESETS)) {
      const encodeIndex = preset.operations.findIndex((op) => op.type === 'encode');
      if (encodeIndex !== -1) {
        expect(encodeIndex, `${name}: encode must be last`).toBe(preset.operations.length - 1);
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/worker/operations-registry.test.ts`
Expected: FAIL — module `../modules/image/image.types` not found.

- [ ] **Step 3: Create image.types.ts**

```ts
// api/src/modules/image/image.types.ts
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
    description: 'Output encoding — WebP by default (universal support), AVIF for maximum compression (slower, always queued)',
    params: {
      format: { type: 'string', default: 'webp' },
      quality: { type: 'number', min: 1, max: 100, default: 80 },
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
      { type: 'encode', params: { format: 'avif', quality: 50, effort: 4 } },
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
```

- [ ] **Step 4: Run tests**

Run: `bun test src/worker/operations-registry.test.ts && bunx tsc --noEmit`
Expected: PASS, tsc clean.

- [ ] **Step 5: Commit**

```bash
git add src/modules/image src/worker/operations-registry.test.ts && git commit -m "feat(api): image operations, presets and schemas"
```

---

### Task 3: Sharp pipeline

**Files:**
- Create: `api/src/worker/image/pipeline.ts`
- Create: `api/src/worker/image/pipeline.test.ts`

**Interfaces:**
- Consumes: `ImageOperation` from Task 2.
- Produces: `processImage(input: Buffer, operations: ImageOperation[]): Promise<ProcessedImage>` where `ProcessedImage = { data: Buffer; format: string; width: number; height: number }`, and `probeImage(input: Buffer): Promise<{ width: number; height: number; format: string; megapixels: number }>`.

- [ ] **Step 1: Write the failing tests (real sharp, tiny images, no DB)**

```ts
// api/src/worker/image/pipeline.test.ts
import { describe, test, expect } from 'bun:test';
import sharp from 'sharp';
import { processImage, probeImage } from './pipeline';

const makePng = (width = 320, height = 240) =>
  sharp({ create: { width, height, channels: 3, noise: { type: 'gaussian', mean: 128, sigma: 30 } } })
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test src/worker/image/pipeline.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement pipeline.ts**

```ts
// api/src/worker/image/pipeline.ts
import sharp from 'sharp';
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

function applyResize(chain: sharp.Sharp, params: ResizeParams): sharp.Sharp {
  if (!params.width && !params.height) return chain;

  // Strategies (attention/entropy) only apply to cover crops
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

function applyEncode(chain: sharp.Sharp, params: EncodeParams): sharp.Sharp {
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
```

- [ ] **Step 4: Run tests**

Run: `bun test src/worker/image/pipeline.test.ts && bunx tsc --noEmit`
Expected: PASS (note: sharp reports AVIF as `heif` in output info — the test asserts that).

- [ ] **Step 5: Commit**

```bash
git add src/worker/image && git commit -m "feat(api): sharp image pipeline with resize, smart-crop and encode"
```

---

### Task 4: Queue, worker processor and storage helpers

**Files:**
- Create: `api/src/queues/image.queue.ts`
- Modify: `api/src/queues/queue.ts`
- Create: `api/src/worker/image.processor.ts`
- Modify: `api/src/worker/index.ts`
- Modify: `api/src/config/storage.ts`

**Interfaces:**
- Consumes: `processImage`/`probeImage` (Task 3).
- Produces: `IMAGE_QUEUE`, `ImageQueueJob = { jobId: string }`, `queues.image`; storage helpers `getObjectBuffer(key): Promise<Buffer>` and `putObject(key, body: Uint8Array, contentType): Promise<void>`; `IMAGE_OUTPUT` map `{ webp: { ext: 'webp', contentType: 'image/webp' }, avif: {...'image/avif'}, jpeg: { ext: 'jpg', ... }, png: {...} }` exported from the processor's module scope is NOT needed elsewhere — keep it local.

- [ ] **Step 1: Queue contract and instance**

```ts
// api/src/queues/image.queue.ts
export type ImageQueueJob = { jobId: string };

export const IMAGE_QUEUE = 'IMAGE_QUEUE';
```

In `api/src/queues/queue.ts` add (mirroring text/audio):

```ts
import { IMAGE_QUEUE, type ImageQueueJob } from './image.queue';

const imageQueue = new Queue<ImageQueueJob>(IMAGE_QUEUE, {
  connection: redisConnection,
  defaultJobOptions,
});
```

and export it: `export const queues = { text: textQueue, audio: audioQueue, image: imageQueue, webhook: webhookQueue };`

- [ ] **Step 2: Storage helpers in config/storage.ts**

```ts
export async function getObjectBuffer(key: string): Promise<Buffer> {
  const response = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }));
  if (!response.Body) throw new Error(`Empty response from S3 for ${key}`);
  return Buffer.from(await response.Body.transformToByteArray());
}

export async function putObject(key: string, body: Uint8Array, contentType: string): Promise<void> {
  await s3.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, Body: body, ContentType: contentType }));
}
```

(Add `PutObjectCommand` to the existing `@aws-sdk/client-s3` import.)

- [ ] **Step 3: Processor**

```ts
// api/src/worker/image.processor.ts
import type { Job } from 'bullmq';
import type { ImageQueueJob } from '../queues/image.queue';
import type { ImageJobPayload } from '../modules/jobs/job.types';
import { JobModel } from '../modules/jobs/job.model';
import { processImage, probeImage } from './image/pipeline';
import { getObjectBuffer, putObject } from '../config/storage';
import { usageService } from '../modules/usage/usage.service';
import { rollbackCredits } from '../middlewares/credits';
import { webhooksService } from '../modules/webhooks/webhooks.service';
import type { ImageOperation, ImageEncodeFormat } from '../modules/image/image.types';

const OUTPUT: Record<ImageEncodeFormat, { ext: string; contentType: string }> = {
  webp: { ext: 'webp', contentType: 'image/webp' },
  avif: { ext: 'avif', contentType: 'image/avif' },
  jpeg: { ext: 'jpg', contentType: 'image/jpeg' },
  png: { ext: 'png', contentType: 'image/png' },
};

const log = (jobId: string, msg: string) => console.log(`[IMAGE:${jobId}] ${msg}`);

export function outputTarget(operations: ImageOperation[]) {
  const encodeOp = operations.find((op) => op.type === 'encode');
  const format = ((encodeOp && 'params' in encodeOp && encodeOp.params?.format) || 'webp') as ImageEncodeFormat;
  return OUTPUT[format] ?? OUTPUT.webp;
}

export default async function (job: Job<ImageQueueJob>) {
  const id = job.data.jobId;
  log(id, 'Starting');

  const jobDoc = await JobModel.findById(id);
  if (!jobDoc) throw new Error(`Job ${id} not found`);

  const payload = jobDoc.payload as unknown as ImageJobPayload;
  log(id, `Operations: ${payload.operations.map((op) => op.type).join(' -> ')}`);

  await JobModel.findByIdAndUpdate(id, { status: 'processing' });

  try {
    const start = Date.now();

    const input = await getObjectBuffer(payload.source.ref);
    const inputSize = input.byteLength;
    const probe = await probeImage(input);
    log(id, `Input ${(inputSize / 1024).toFixed(0)}KB ${probe.width}x${probe.height} ${probe.format}`);

    const operations = payload.operations as ImageOperation[];
    const output = await processImage(input, operations);

    const outputSize = output.data.byteLength;
    const ratio = +(inputSize / outputSize).toFixed(2);
    log(id, `Done: ${(inputSize / 1024).toFixed(0)}KB to ${(outputSize / 1024).toFixed(0)}KB (ratio: ${ratio}x)`);

    const target = outputTarget(operations);
    const outputKey = `outputs/${id}/result.${target.ext}`;
    await putObject(outputKey, output.data, target.contentType);

    await JobModel.findByIdAndUpdate(id, {
      status: 'completed',
      completedAt: new Date(),
      result: {
        outputKey,
        metrics: {
          inputSize,
          outputSize,
          compressionRatio: ratio,
          operationsApplied: operations.map((op) => op.type),
        },
      },
    });

    await usageService.recordSafe({
      idempotencyKey: `job:${id}`,
      userId: jobDoc.userId,
      jobId: id,
      pipelineType: 'image',
      operations: operations.map((op) => op.type),
      inputBytes: inputSize,
      outputBytes: outputSize,
      processingMs: Date.now() - start,
      image: { width: probe.width, height: probe.height, format: probe.format, megapixels: probe.megapixels },
      creditsConsumed: payload.creditCost || 0,
    });

    await webhooksService.enqueueJobWebhook(id, 'job.completed');
  } catch (err) {
    log(id, `Failed: ${err instanceof Error ? err.message : err}`);

    // BullMQ will retry until the last attempt; only then the failure is final
    const isFinalAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);

    if (!isFinalAttempt) {
      await JobModel.findByIdAndUpdate(id, { status: 'pending' });
      throw err;
    }

    await JobModel.findByIdAndUpdate(id, {
      status: 'failed',
      error: err instanceof Error ? err.message : 'Unknown error',
    });

    if (payload.creditCost) {
      await rollbackCredits(jobDoc.userId, payload.creditCost);
      log(id, `Rolled back ${payload.creditCost} credits`);
    }

    await webhooksService.enqueueJobWebhook(id, 'job.failed');
    throw err;
  }
}
```

Note: `ImageJobPayload` in `job.types.ts` already exists (typed ahead) with `source: { kind: 'storage'; ref: string }`, `creditCost?`, `webhookUrl?` — no change needed. `jobService.enqueue` gains `'image'`: change its signature to `type: 'text' | 'audio' | 'image'` and the queue pick to `const queue = queues[type];` (works because keys match).

- [ ] **Step 4: Register the worker**

In `api/src/worker/index.ts` add (mirroring the others):

```ts
import { IMAGE_QUEUE, type ImageQueueJob } from '../queues/image.queue';
import imageProcessor from './image.processor';

const imageWorker = new Worker<ImageQueueJob>(IMAGE_QUEUE, imageProcessor, {
  connection: redisConnection,
  concurrency: Number(process.env.IMAGE_WORKER_CONCURRENCY ?? 4),
});
```

and include `imageWorker` in the `workers` array.

- [ ] **Step 5: Verify and commit**

Run: `bunx tsc --noEmit && bun test`
Expected: clean, all tests pass.

```bash
git add src/queues src/worker src/config/storage.ts src/modules/jobs/job.service.ts && git commit -m "feat(api): image queue, worker processor and storage helpers"
```

---

### Task 5: Image service with sync fast-path

**Files:**
- Create: `api/src/modules/image/image.service.ts`
- Create: `api/src/modules/image/image.service.test.ts`

**Interfaces:**
- Consumes: `jobService.createAndEnqueue/createCompleted/findByIdempotencyKey/getStatus`, `reserveCredits/rollbackCredits`, `uploadService.getUpload`, `processImage`/`probeImage`, `getObjectBuffer`/`putObject`, `usageService.recordSafe`, `usersService.assertWebhookAccess`, `isDuplicateKeyError`, `outputTarget` (Task 4).
- Produces: `imageService.processImage(userId, input: ProcessImageInput): Promise<JobStatusView>`, `imageService.listPresets()`, `imageService.listOperations()`.

- [ ] **Step 1: Write the failing defaults test**

```ts
// api/src/modules/image/image.service.test.ts
import { describe, test, expect } from 'bun:test';
import { IMAGE_OPERATIONS } from './image.types';
import { imageService } from './image.service';

const resolve = (ops: unknown): { type: string; params?: Record<string, unknown> }[] =>
  (imageService as unknown as {
    resolveOperations: (p?: string, o?: unknown) => { type: string; params?: Record<string, unknown> }[];
  }).resolveOperations(undefined, ops);

describe('image operation resolution', () => {
  test('fills defaults when params are omitted', () => {
    const ops = resolve([{ type: 'encode' }]);
    expect(ops[ops.length - 1].params?.format).toBe(IMAGE_OPERATIONS.encode.params.format.default);
    expect(ops[ops.length - 1].params?.quality).toBe(80);
  });

  test('appends a default webp encode when none is given', () => {
    const ops = resolve([{ type: 'resize', params: { width: 100 } }]);
    const last = ops[ops.length - 1];
    expect(last.type).toBe('encode');
    expect(last.params?.format).toBe('webp');
  });

  test('encode always ends up last, last one wins', () => {
    const ops = resolve([
      { type: 'encode', params: { format: 'jpeg' } },
      { type: 'resize', params: { width: 100 } },
      { type: 'encode', params: { format: 'avif' } },
    ]);
    expect(ops[ops.length - 1].type).toBe('encode');
    expect(ops[ops.length - 1].params?.format).toBe('avif');
    expect(ops.filter((op) => op.type === 'encode').length).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/modules/image/image.service.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement image.service.ts**

```ts
// api/src/modules/image/image.service.ts
import {
  IMAGE_PRESETS,
  IMAGE_OPERATIONS,
  type ProcessImageInput,
  type ImagePreset,
  type ImageOperation,
} from './image.types';
import { ApiError } from '../../utils/api-error';
import { jobService } from '../jobs/job.service';
import type { JobStatusView } from '../jobs/job.types';
import { uploadService } from '../upload/upload.service';
import { reserveCredits, rollbackCredits } from '../../middlewares/credits';
import { usersService } from '../users/users.service';
import { usageService } from '../usage/usage.service';
import { isDuplicateKeyError } from '../../utils/mongo';
import { getObjectBuffer, putObject } from '../../config/storage';
import { processImage, probeImage } from '../../worker/image/pipeline';
import { outputTarget } from '../../worker/image.processor';

// Small non-AVIF images finish in tens of ms — worth answering in the request
const SYNC_SIZE_LIMIT = 5 * 1024 * 1024;

export class ImageService {
  async processImage(userId: string, input: ProcessImageInput): Promise<JobStatusView> {
    const { preset, operations: customOps, imageId } = input;

    if (!preset && (!customOps || customOps.length === 0)) {
      throw new ApiError('IMAGE_INVALID_INPUT', 'Either preset or operations must be provided', 400);
    }

    if (input.idempotencyKey) {
      const existing = await jobService.findByIdempotencyKey(userId, input.idempotencyKey);
      if (existing) return (await jobService.getStatus(userId, existing.id))!;
    }

    const upload = await uploadService.getUpload(imageId, userId);

    if (!upload.mimeType.startsWith('image/')) {
      throw new ApiError('IMAGE_INVALID_INPUT', 'Uploaded file is not an image', 422);
    }

    const operations = this.resolveOperations(preset, customOps);

    if (input.webhookUrl) {
      await usersService.assertWebhookAccess(userId);
    }

    const creditCost = await reserveCredits(userId, 'image', upload.size);

    try {
      if (this.isSyncEligible(upload.size, operations, input)) {
        return await this.processSync(userId, upload.s3Key, operations, creditCost, preset);
      }

      return await jobService.createAndEnqueue({
        userId,
        payload: {
          type: 'image',
          preset,
          operations,
          source: { kind: 'storage', ref: upload.s3Key },
          name: upload.originalName,
          creditCost,
          webhookUrl: input.webhookUrl,
        },
        idempotencyKey: input.idempotencyKey,
      });
    } catch (err) {
      await rollbackCredits(userId, creditCost);

      // Concurrent request with the same idempotency key won the race
      if (input.idempotencyKey && isDuplicateKeyError(err)) {
        const existing = await jobService.findByIdempotencyKey(userId, input.idempotencyKey);
        if (existing) return (await jobService.getStatus(userId, existing.id))!;
      }

      throw err;
    }
  }

  private isSyncEligible(size: number, operations: ImageOperation[], input: ProcessImageInput): boolean {
    // webhookUrl implies the caller wants the async contract; AVIF is too slow for a request
    return (
      !input.webhookUrl &&
      size <= SYNC_SIZE_LIMIT &&
      outputTarget(operations).ext !== 'avif'
    );
  }

  private async processSync(
    userId: string,
    s3Key: string,
    operations: ImageOperation[],
    creditCost: number,
    preset?: ImagePreset,
  ): Promise<JobStatusView> {
    const start = performance.now();

    const inputBuffer = await getObjectBuffer(s3Key);
    const probe = await probeImage(inputBuffer);
    const output = await processImage(inputBuffer, operations);
    const processingMs = Math.round(performance.now() - start);

    const metrics = {
      inputSize: inputBuffer.byteLength,
      outputSize: output.data.byteLength,
      compressionRatio: +(inputBuffer.byteLength / output.data.byteLength).toFixed(2),
      processingMs,
      operationsApplied: operations.map((op) => op.type),
    };

    const job = await jobService.createCompleted({
      userId,
      payload: { type: 'image', preset, operations, source: { kind: 'storage', ref: s3Key }, creditCost },
      result: { metrics },
    });

    const target = outputTarget(operations);
    const outputKey = `outputs/${job.id}/result.${target.ext}`;
    await putObject(outputKey, output.data, target.contentType);
    await jobService.attachOutputKey(job.id, outputKey);

    await usageService.recordSafe({
      idempotencyKey: `job:${job.id}`,
      userId,
      jobId: job.id,
      sync: true,
      pipelineType: 'image',
      operations: operations.map((op) => op.type),
      inputBytes: inputBuffer.byteLength,
      outputBytes: output.data.byteLength,
      processingMs,
      image: { width: probe.width, height: probe.height, format: probe.format, megapixels: probe.megapixels },
      creditsConsumed: creditCost,
    });

    return (await jobService.getStatus(userId, job.id))!;
  }

  private resolveOperations(preset?: ImagePreset, customOps?: ImageOperation[]): ImageOperation[] {
    let ops: ImageOperation[];

    if (preset) {
      const presetConfig = IMAGE_PRESETS[preset];
      if (!presetConfig) {
        throw new ApiError('IMAGE_INVALID_PRESET', `Unknown preset: ${preset}`, 400);
      }
      ops = presetConfig.operations as unknown as ImageOperation[];
    } else {
      ops = customOps!;
    }

    if (!ops.some((op) => op.type === 'encode')) {
      ops = [...ops, { type: 'encode' } as ImageOperation];
    }

    const merged = ops.map((op) => {
      const definition = IMAGE_OPERATIONS[op.type as keyof typeof IMAGE_OPERATIONS];
      if (!definition) return op;

      const defaults = Object.fromEntries(
        Object.entries(definition.params).map(([key, param]) => [key, param.default]),
      );

      return { ...op, params: { ...defaults, ...('params' in op ? op.params : {}) } };
    });

    // Encoding always runs last; if several were sent, the last one wins
    const encodeOp = merged.filter((op) => op.type === 'encode').pop()!;
    return [...merged.filter((op) => op.type !== 'encode'), encodeOp];
  }

  listPresets() {
    return Object.entries(IMAGE_PRESETS).map(([id, preset]) => ({
      id,
      name: preset.name,
      description: preset.description,
      operations: preset.operations.map((op) => op.type),
    }));
  }

  listOperations() {
    return Object.entries(IMAGE_OPERATIONS).map(([id, op]) => ({
      id,
      name: op.name,
      description: op.description,
      params: op.params,
    }));
  }
}

export const imageService = new ImageService();
```

Add the tiny method to `api/src/modules/jobs/job.service.ts` (sync images upload the result after the doc exists, so the key is attached in a second write):

```ts
async attachOutputKey(jobId: string, outputKey: string): Promise<void> {
  await JobModel.updateOne({ _id: jobId }, { $set: { 'result.outputKey': outputKey } });
}
```

- [ ] **Step 4: Run tests**

Run: `bun test src/modules/image && bunx tsc --noEmit`
Expected: PASS, tsc clean.

- [ ] **Step 5: Commit**

```bash
git add src/modules/image src/modules/jobs/job.service.ts && git commit -m "feat(api): image service with sync fast-path for small non-avif images"
```

---

### Task 6: Routes — dashboard surface, /v1 and swagger

**Files:**
- Create: `api/src/modules/image/image.routes.ts`
- Modify: `api/src/server.ts`
- Modify: `api/src/v1/api.routes.ts`

**Interfaces:**
- Consumes: `imageService`, `jobResponse`, `validateAuth`, `ImageOperationSchema`/`ImagePresetSchema`.

- [ ] **Step 1: Module routes (mirror audio.routes.ts exactly)**

```ts
// api/src/modules/image/image.routes.ts
import { Elysia, t } from 'elysia';
import { validateAuth } from '../../middlewares/auth';
import { imageService } from './image.service';
import { ImageOperationSchema, ImagePresetSchema } from './image.types';
import { jobResponse } from '../jobs/job.http';

export const imageRoutes = new Elysia({ prefix: '/image' })
  .use(validateAuth)

  .post(
    '/',
    async ({ body, userId, headers, set }) =>
      jobResponse(set, await imageService.processImage(userId, {
        ...body,
        idempotencyKey: headers['idempotency-key'],
      })),
    {
      body: t.Object({
        imageId: t.String(),
        preset: t.Optional(ImagePresetSchema),
        operations: t.Optional(t.Array(ImageOperationSchema, { minItems: 1, maxItems: 10 })),
        webhookUrl: t.Optional(t.String({ format: 'uri' })),
      }),
      headers: t.Object({
        'idempotency-key': t.Optional(t.String({ minLength: 1, maxLength: 255 })),
      }),
      detail: { summary: 'Create image compression job', tags: ['Image'] },
    },
  )

  .get('/presets', () => imageService.listPresets(), {
    detail: { summary: 'List image presets', tags: ['Image'] },
  })

  .get('/operations', () => imageService.listOperations(), {
    detail: { summary: 'List image operations', tags: ['Image'] },
  });
```

- [ ] **Step 2: Register in server.ts**

Add `const { imageRoutes } = await import('./modules/image/image.routes');` with the other imports, `.use(imageRoutes)` after `audioRoutes`, and `{ name: 'Image', description: 'Image compression jobs' }` to the swagger `tags` array.

- [ ] **Step 3: /v1 routes**

In `api/src/v1/api.routes.ts` add after the Text block (same shape as audio, tags `['Image']`):

```ts
  // ─── Image ─────────────────────────────────────────
  .post(
    '/image',
    async ({ body, userId, headers, set }) =>
      jobResponse(set, await imageService.processImage(userId, {
        ...body,
        idempotencyKey: headers['idempotency-key'],
      })),
    {
      body: t.Object({
        imageId: t.String(),
        preset: t.Optional(ImagePresetSchema),
        operations: t.Optional(t.Array(ImageOperationSchema, { minItems: 1, maxItems: 10 })),
        webhookUrl: t.Optional(t.String({ format: 'uri' })),
      }),
      headers: t.Object({
        'idempotency-key': t.Optional(t.String({ minLength: 1, maxLength: 255 })),
      }),
      detail: {
        summary: 'Create image compression job',
        description: 'Small non-AVIF images return completed immediately (200); larger or AVIF jobs are queued (202). Supports Idempotency-Key.',
        tags: ['Image'],
      },
    },
  )

  .get('/image/presets', () => imageService.listPresets(), {
    detail: { summary: 'List image presets', tags: ['Image'] },
  })

  .get('/image/operations', () => imageService.listOperations(), {
    detail: { summary: 'List image operations', tags: ['Image'] },
  })
```

with imports `imageService`, `ImageOperationSchema`, `ImagePresetSchema`.

- [ ] **Step 4: Verify live**

Run: `bunx tsc --noEmit && bun test`, then restart the API (`lsof -ti :3002 | xargs kill -9; bun run start &`) and:

```bash
curl -s http://localhost:3002/v1/docs/json | python3 -c "import json,sys; print([p for p in json.load(sys.stdin)['paths'] if 'image' in p])"
```

Expected: `['/v1/image', '/v1/image/operations', '/v1/image/presets']`.

- [ ] **Step 5: Commit**

```bash
git add src/modules/image src/server.ts src/v1 && git commit -m "feat(api): image routes on dashboard surface and /v1"
```

---

### Task 7: Dashboard — enable the Image tool (presets only)

**Files:**
- Create: `dashboard/app/http/image.ts`
- Modify: `dashboard/types/index.ts`
- Rewrite: `dashboard/app/(app)/dashboard/image/page.tsx`
- Modify: `dashboard/app/components/layout/Sidebar.tsx` (remove `disabled: true, badge: 'Soon'` from the Image entry)
- Modify: `dashboard/app/components/dashboard/QuickActions.tsx` (remove `disabled: true`, description `'WebP and AVIF compression'`)
- Modify: `dashboard/app/(app)/dashboard/home/page.tsx` (Image tool card: remove disabled/'Coming soon', subtitle `'Compress to WebP & AVIF'`)
- Modify: `dashboard/app/(app)/dashboard/jobs/page.tsx` (add `{ label: 'Image', value: 'image' }` to `TYPE_FILTERS`)

**Interfaces:**
- Consumes: `uploadFile` from `app/http/upload.ts`, `JobView`, `useJobPoll`, `getJobStatus`, error funnel, `randomKey`.
- Produces: `submitImageJob(input: { imageId: string; preset?: string }, idempotencyKey?): Promise<JobView>`, `getImagePresets()`.

- [ ] **Step 1: Types and http module**

Add to `dashboard/types/index.ts` (near the audio defs):

```ts
export interface ImagePresetDef {
  id: string
  name: string
  description: string
  operations: string[]
}

export interface SubmitImageJobInput {
  imageId: string
  preset?: string
}
```

```ts
// dashboard/app/http/image.ts
import { clientApi } from './api'
import type { ApiResponse, JobView, SubmitImageJobInput, ImagePresetDef } from '@/types'

export const submitImageJob = (input: SubmitImageJobInput, idempotencyKey?: string) =>
  clientApi
    .post('image', {
      json: input,
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    })
    .json<ApiResponse<JobView>>()
    .then((res) => res.data)

export const getImagePresets = () =>
  clientApi.get('image/presets').json<ApiResponse<ImagePresetDef[]>>()
```

- [ ] **Step 2: The page (preset picker + upload + unified job handling + result preview)**

```tsx
// dashboard/app/(app)/dashboard/image/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { toast } from 'sonner'
import { Button } from '@/app/components/ui/button'
import { Skeleton } from '@/app/components/ui/skeleton'
import { ToolLayout } from '@/app/components/tools/ToolLayout'
import { ToolHistoryPanel } from '@/app/components/tools/ToolHistoryPanel'
import { useJobPoll } from '@/app/hooks/use-job-poll'
import { uploadFile } from '@/app/http/upload'
import { submitImageJob, getImagePresets } from '@/app/http/image'
import { getJobStatus } from '@/app/http/jobs'
import { parseApiError, toastApiError, ERROR_MESSAGES } from '@/app/http/errors'
import { cn, formatBytes, randomKey, triggerDownload } from '@/app/lib/utils'
import type { JobMetrics, JobView } from '@/types'

export default function ImagePage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [preset, setPreset] = useState('medium')
  const [jobId, setJobId] = useState<string | null>(null)
  const [result, setResult] = useState<JobView | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { data: presetsData } = useSWR('image-presets', getImagePresets)
  const presets = presetsData?.data ?? []

  const { job, isPolling, isFailed, timedOut } = useJobPoll({ jobId, fetcher: getJobStatus })

  useEffect(() => {
    if (job?.status === 'completed') setResult(job)
  }, [job])

  useEffect(() => {
    if (isFailed) toast.error(job?.error ?? 'Job failed')
  }, [isFailed]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit() {
    if (!file) return toast.error('Please select an image')

    setJobId(null)
    setResult(null)
    setSubmitting(true)
    try {
      const { id: imageId } = await uploadFile(file)
      const submitted = await submitImageJob({ imageId, preset }, randomKey())

      if (submitted.status === 'completed') setResult(submitted)
      else setJobId(submitted.id)
    } catch (err) {
      const { code } = await parseApiError(err)
      if (code === 'INSUFFICIENT_CREDITS') {
        toast.error(ERROR_MESSAGES.INSUFFICIENT_CREDITS, {
          action: { label: 'View plan', onClick: () => router.push('/dashboard/billing') },
        })
      } else {
        await toastApiError(err, 'Failed to compress the image. Check the file and try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const metrics = result?.result?.metrics as JobMetrics | undefined

  return (
    <ToolLayout
      title="Image compression"
      mainPanel={
        <div className="space-y-4">
          <label className="block cursor-pointer rounded-xl border border-dashed border-border bg-background p-10 text-center hover:border-accent-strong transition-colors">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <span className="text-sm">{file.name} · {formatBytes(file.size)}</span>
            ) : (
              <span className="text-sm text-muted">Drop or select a JPEG, PNG or WebP</span>
            )}
          </label>

          {(isPolling || submitting) && <Skeleton className="h-40 rounded-xl" />}

          {result?.result && (
            <div className="rounded-xl border border-border bg-background p-4 space-y-3">
              {result.result.outputUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={result.result.outputUrl} alt="Compressed result" className="max-h-72 rounded-lg mx-auto" />
              )}
              {metrics && (
                <p className="text-sm text-muted text-center">
                  {formatBytes(metrics.inputSize)} → {formatBytes(metrics.outputSize)} ({metrics.compressionRatio}×)
                </p>
              )}
              {result.result.outputUrl && (
                <Button
                  variant="outline"
                  className="w-full rounded-full"
                  onClick={() => triggerDownload(result.result!.outputUrl!)}
                >
                  Download
                </Button>
              )}
            </div>
          )}

          {timedOut && <p className="text-sm text-danger">Timed out waiting for the job. Check the jobs page.</p>}
        </div>
      }
      settingsPanel={
        <div className="grid gap-2">
          {presets.length === 0
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)
            : presets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPreset(p.id)}
                  className={cn(
                    'text-left px-3 py-2 rounded-xl border text-sm transition-colors',
                    preset === p.id ? 'border-accent-strong bg-accent-light' : 'border-border hover:border-accent-light',
                  )}
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="text-muted ml-2">{p.description}</span>
                </button>
              ))}
        </div>
      }
      historyPanel={
        <ToolHistoryPanel
          pipelineType="image"
          emptyIcon={
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted mb-4">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          }
          emptyLabel="Your compressed images will appear here"
        />
      }
      action={
        <Button
          onClick={handleSubmit}
          disabled={submitting || isPolling || !file}
          className="rounded-full bg-accent-strong text-foreground hover:bg-accent-light"
        >
          {submitting ? 'Uploading…' : isPolling ? 'Processing…' : 'Compress image'}
        </Button>
      }
    />
  )
}
```

Check `ToolLayout` prop names against `dashboard/app/components/tools/ToolLayout.tsx` before writing (audio page uses `mainPanel`; text page uses `inputPanel`/`outputPanel` — use whichever variant audio uses, adapting if `mainPanel` is not accepted).

- [ ] **Step 3: Unhide navigation entries**

Sidebar `toolNav`: `{ href: '/dashboard/image', icon: ImageIcon, label: 'Image' }` (drop disabled/badge). QuickActions: drop `disabled: true`, description `'WebP and AVIF compression'`. Home tool card: remove disabled/'Coming soon', subtitle `'Compress to WebP & AVIF'`. Jobs page `TYPE_FILTERS`: add `{ label: 'Image', value: 'image' }`.

- [ ] **Step 4: Verify**

Run: `cd dashboard && bunx tsc --noEmit && bun run test`
Expected: clean, 18 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app types && git commit -m "feat(dashboard): enable the image compression tool"
```

---

### Task 8: Docs and conventions

**Files:**
- Create: `docs-site/api-reference/image.mdx`
- Modify: `docs-site/docs.json` (add `api-reference/image` to the API Reference group)
- Modify: `docs-site/concepts/credits.mdx` (image rate: 1 credit per started 2MB)
- Modify: `docs-site/concepts/uploads.mdx` (accepted formats now include .jpg/.jpeg/.png/.webp)
- Modify: `api/CLAUDE.md`

**Interfaces:** none (documentation).

- [ ] **Step 1: image.mdx**

Write `docs-site/api-reference/image.mdx` following the exact structure of `audio.mdx` (read it first), covering: `POST /v1/image` with `imageId`, presets table (chill/medium/aggressive/thumbnail with their operations), the two custom operations with param ranges, the sync behavior ("images ≤5MB targeting WebP/JPEG/PNG return `200` with `status: completed` and the result inline; AVIF and larger files return `202`"), output formats (`result.webp|avif|jpg|png`, fresh signed URL per read, 7-day retention), and a curl example: upload → PUT → POST /v1/image preset thumbnail → completed response with metrics.

- [ ] **Step 2: api/CLAUDE.md**

Append one paragraph under "Jobs, queues, workers":

```markdown
- Image pipeline: sharp (libvips) runs in-process — deploy with `bun run`
  (never `bun build --compile`), glibc base images, and resolvable
  optionalDependencies so `@img/sharp-linux-*` installs in CI. WebP is the
  default encode; AVIF is opt-in and always queued (never sync).
```

- [ ] **Step 3: Verify and commit**

Run: `bunx mintlify broken-links 2>/dev/null || true` (best-effort), then both workspace typechecks + full `bun test`.

```bash
git add docs-site api/CLAUDE.md && git commit -m "docs: image endpoint reference and pipeline conventions"
```

---

### Task 9: Final verification sweep

**Files:** none new.

- [ ] **Step 1: Full test + typecheck matrix**

```bash
cd api && bunx tsc --noEmit && bun test
cd ../dashboard && bunx tsc --noEmit && bun run test
```

Expected: everything green (API suite grows to ~55+ tests).

- [ ] **Step 2: Live smoke of the surfaces**

Restart the API and check: `/health` ok, `/v1/docs/json` includes the 3 image paths, `GET /v1/image/presets` returns 401 (wrapped envelope) without a key — proving the route is mounted behind auth.

- [ ] **Step 3: Push**

```bash
git push origin staging
```

**Deferred (explicitly out of this plan):** direct-bytes single-call upload (Tinify-style multipart on POST /image), content-type-aware presets (screenshot vs photo), perceptual-metric auto-tuning, JPEG XL. Real-photo AVIF calibration on the production worker before pricing/SLA claims.
