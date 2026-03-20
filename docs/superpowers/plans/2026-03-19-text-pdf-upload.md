# Text PDF/Direct Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace URL-based text input with direct text (textarea) and file upload (PDF/TXT), with sync processing for small text and async for large text/files.

**Architecture:** Two input paths converge into the same text pipeline. Small direct text (<= 50KB) bypasses the job queue entirely and returns inline. Large text and file uploads go through BullMQ async processing. PDF files are extracted to plain text before pipeline processing.

**Tech Stack:** pdf-parse (PDF extraction), existing Elysia/BullMQ/S3 stack

---

### Task 1: Install pdf-parse dependency

**Files:**
- Modify: `api/package.json`

- [ ] **Step 1: Install pdf-parse**

```bash
cd api && bun add pdf-parse
```

- [ ] **Step 2: Verify it installed**

```bash
cd api && bun run -e "const pdf = require('pdf-parse'); console.log('ok')"
```

---

### Task 2: Extend upload system to accept PDF and TXT

**Files:**
- Modify: `api/src/modules/upload/upload.types.ts`
- Modify: `api/src/modules/upload/upload.service.ts`
- Modify: `api/src/modules/upload/upload.routes.ts`

- [ ] **Step 1: Add PDF magic bytes and extend allowed extensions in upload.types.ts**

Add PDF signature and extend `validateMagicBytes` to return `'pdf' | 'txt'` as well:

```typescript
// Add after WAV_WAVE constant
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46]; // "%PDF"

// Replace ALLOWED_EXTENSIONS
export const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.pdf', '.txt'] as const;

// Replace validateMagicBytes return type and add PDF check
export function validateMagicBytes(buffer: Uint8Array): 'mp3' | 'wav' | 'pdf' | null {
  // Check MP3 signatures
  for (const sig of MP3_SIGNATURES) {
    if (sig.every((byte, i) => buffer[i] === byte)) {
      return 'mp3';
    }
  }

  // Check WAV
  const isRiff = WAV_RIFF.every((byte, i) => buffer[i] === byte);
  const isWave = buffer.length >= 12 && WAV_WAVE.every((byte, i) => buffer[8 + i] === byte);
  if (isRiff && isWave) return 'wav';

  // Check PDF
  if (PDF_SIGNATURE.every((byte, i) => buffer[i] === byte)) return 'pdf';

  return null;
}
```

Note: TXT has no magic bytes — it will be validated by MIME type only, not by this function.

- [ ] **Step 2: Add uploadFile method to upload.service.ts**

Add `'pdf'` and `'txt'` to `MIME_MAP`. Add a new `uploadFile` method that handles both audio and document uploads. TXT files skip magic byte validation:

```typescript
const MIME_MAP: Record<string, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  pdf: 'application/pdf',
  txt: 'text/plain',
};

async uploadFile(userId: string, file: File): Promise<UploadResponse> {
  if (!file) {
    throw new ApiError('MISSING_FILE', 'File is required', 400);
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new ApiError('FILE_TOO_LARGE', `File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`, 413);
  }

  const ext = this.getExtension(file.name);
  if (!ALLOWED_EXTENSIONS.includes(ext as any)) {
    throw new ApiError('INVALID_FORMAT', `Only ${ALLOWED_EXTENSIONS.join(', ')} files are accepted`, 422);
  }

  const buffer = new Uint8Array(await file.arrayBuffer());

  // TXT files have no magic bytes — use extension directly
  let detectedFormat: string;
  if (ext === '.txt') {
    detectedFormat = 'txt';
  } else {
    const detected = validateMagicBytes(buffer);
    if (!detected) {
      throw new ApiError('INVALID_FORMAT', 'File content does not match a valid format', 422);
    }
    detectedFormat = detected;
  }

  const { ulid } = await import('ulidx');
  const uploadId = ulid();
  const s3Key = `uploads/${userId}/${uploadId}.${detectedFormat}`;

  await s3.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: s3Key,
    Body: buffer,
    ContentType: MIME_MAP[detectedFormat],
  }));

  const expiresAt = addHours(new Date(), 24);
  const doc = await UploadModel.create({
    userId,
    originalName: file.name,
    mimeType: MIME_MAP[detectedFormat],
    size: file.size,
    s3Key,
    status: 'ready',
    expiresAt,
  });

  return {
    id: doc._id.toString(),
    originalName: doc.originalName,
    size: doc.size,
    expiresAt: expiresAt.toISOString(),
  };
}
```

Update `uploadAudio` to delegate to `uploadFile` so existing audio upload still works.

- [ ] **Step 3: Add document upload route in upload.routes.ts**

Add a new `POST /upload/document` route for PDF/TXT uploads:

```typescript
.post(
  '/document',
  async ({ body, userId }) => {
    const { file } = body;
    return uploadService.uploadFile(userId, file);
  },
  {
    body: t.Object({
      file: t.File({
        maxSize: '100m',
        type: ['application/pdf', 'text/plain'],
      }),
    }),
    detail: {
      summary: 'Upload document file (PDF/TXT)',
      tags: ['Upload'],
    },
  }
)
```

- [ ] **Step 4: Verify upload routes compile**

```bash
cd api && bun run src/server.ts &
sleep 2 && kill %1
```

---

### Task 3: Update text types and service for new input modes

**Files:**
- Modify: `api/src/modules/text/text.types.ts` — update `ProcessTextInput`
- Modify: `api/src/modules/text/text.service.ts` — add sync processing path
- Modify: `api/src/modules/text/text.routes.ts` — new body schema
- Modify: `api/src/modules/jobs/job.types.ts` — add `inline` source kind

- [ ] **Step 1: Add inline source kind to job.types.ts**

Update `JobSource` union and `TextJobPayload`:

```typescript
export type JobSource =
  | { kind: "url"; url: string }
  | { kind: "storage"; ref: string }
  | { kind: "inline"; text: string };
```

- [ ] **Step 2: Update ProcessTextInput in text.types.ts**

Replace URL-based input with text/fileId:

```typescript
export interface ProcessTextInput {
  text?: string;
  fileId?: string;
  preset?: TextPreset;
  operations?: TextOperation[];
}
```

- [ ] **Step 3: Rewrite text.service.ts to handle sync and async paths**

The sync threshold is 50KB. The service needs two code paths:

```typescript
import { processText } from '../../worker/text/pipeline';
import { uploadService } from '../upload/upload.service';

const SYNC_LIMIT = 50 * 1024; // 50KB

export class TextService {

  async processTextSync(
    userId: string,
    input: ProcessTextInput
  ): Promise<{ output: string; metrics: Record<string, unknown> }> {
    const text = input.text!;
    const operations = this.resolveOperations(input.preset, input.operations);

    const inputSize = new TextEncoder().encode(text).byteLength;
    const start = Date.now();

    const output = await processText(text, operations);

    const outputSize = new TextEncoder().encode(output).byteLength;
    const ratio = (inputSize / outputSize).toFixed(2);

    return {
      output,
      metrics: {
        inputSize,
        outputSize,
        compressionRatio: +ratio,
        processingMs: Date.now() - start,
        operationsApplied: operations.map((op) => op.type),
      },
    };
  }

  async processTextAsync(
    userId: string,
    input: ProcessTextInput
  ): Promise<{ job: Job }> {
    const operations = this.resolveOperations(input.preset, input.operations);

    let source: JobSource;
    if (input.fileId) {
      const upload = await uploadService.getUpload(input.fileId, userId);
      source = { kind: 'storage', ref: upload.s3Key };
    } else {
      source = { kind: 'inline', text: input.text! };
    }

    const job = await jobService.create({
      userId,
      payload: { type: 'text', preset: input.preset, operations, source },
    });

    await jobService.enqueue(job);
    return { job };
  }

  isSyncEligible(input: ProcessTextInput): boolean {
    if (input.fileId) return false;
    if (!input.text) return false;
    return new TextEncoder().encode(input.text).byteLength <= SYNC_LIMIT;
  }

  // ... resolveOperations, listPresets, listOperations unchanged
}
```

- [ ] **Step 4: Rewrite text.routes.ts with new body schema**

Replace `textUrl` with `text` / `fileId`, mutually exclusive. Route handler checks sync eligibility:

```typescript
.post(
  '/',
  async ({ body, userId }) => {
    if (textService.isSyncEligible(body)) {
      const result = await textService.processTextSync(userId, body);
      return { sync: true, ...result };
    }
    const { job } = await textService.processTextAsync(userId, body);
    return { sync: false, job };
  },
  {
    body: t.Object({
      text: t.Optional(t.String({ maxLength: 5_000_000 })),
      fileId: t.Optional(t.String()),
      preset: t.Optional(TextPresetSchema),
      operations: t.Optional(
        t.Array(TextOperationSchema, { minItems: 1, maxItems: 10 })
      ),
    }),
    detail: {
      summary: 'Process text (sync for small text, async for files/large text)',
      tags: ['Text'],
    },
  }
)
```

- [ ] **Step 5: Verify API compiles**

```bash
cd api && bun run src/server.ts &
sleep 2 && kill %1
```

---

### Task 4: Update text worker to handle inline and storage/PDF sources

**Files:**
- Modify: `api/src/worker/text.processor.ts`

- [ ] **Step 1: Rewrite text.processor.ts to handle all source kinds**

Replace URL fetch with S3 download + PDF extraction logic:

```typescript
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3, S3_BUCKET } from '../config/storage';
import pdf from 'pdf-parse';

// Inside the processor, replace the source fetching block:

const source = payload.source;
let input: string;

if (source.kind === 'inline') {
  input = source.text;
  log(id, `Inline text — ${(new TextEncoder().encode(input).byteLength / 1024).toFixed(1)}KB`);
} else if (source.kind === 'storage') {
  log(id, `Downloading from S3: ${source.ref}`);
  const response = await s3.send(new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: source.ref,
  }));

  if (!response.Body) throw new Error('Empty response from S3');

  const buffer = await response.Body.transformToByteArray();

  if (source.ref.endsWith('.pdf')) {
    log(id, 'Extracting text from PDF...');
    const pdfData = await pdf(Buffer.from(buffer));
    input = pdfData.text;
    log(id, `Extracted ${input.length} chars from PDF`);
  } else {
    input = new TextDecoder().decode(buffer);
  }
} else {
  // Legacy URL support (can be removed later)
  const url = (source as any).url;
  log(id, `Fetching from URL: ${url}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download: ${response.status}`);
  input = await response.text();
}
```

Rest of the processor stays the same (pipeline processing, metrics, usage recording).

- [ ] **Step 2: Verify worker compiles**

```bash
cd api && bun run src/worker/index.ts &
sleep 2 && kill %1
```

---

### Task 5: Update dashboard types

**Files:**
- Modify: `dashboard/types/index.ts`

- [ ] **Step 1: Update SubmitTextJobInput type**

Replace `textUrl` with `text` / `fileId`:

```typescript
export interface SubmitTextJobInput {
  text?: string
  fileId?: string
  preset?: TextPreset
  operations?: TextOperationInput[]
}
```

- [ ] **Step 2: Add sync response type**

```typescript
export interface TextSyncResult {
  sync: true
  output: string
  metrics: JobMetrics
}

export interface TextAsyncResult {
  sync: false
  job: Job
}

export type TextProcessResult = TextSyncResult | TextAsyncResult
```

---

### Task 6: Update dashboard HTTP layer

**Files:**
- Modify: `dashboard/app/http/text.ts`

- [ ] **Step 1: Update submitTextJob and add uploadDocument**

```typescript
import { clientApi } from './api'
import type { ApiResponse, SubmitTextJobInput, TextPresetDef, TextOperationDef, TextProcessResult, UploadAudioResponse } from '@/types'

export const submitTextJob = (input: SubmitTextJobInput) =>
  clientApi.post('text', { json: input }).json<ApiResponse<TextProcessResult>>()

export const uploadDocument = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return clientApi.post('upload/document', { body: form }).json<ApiResponse<UploadAudioResponse>>()
}

export const getTextPresets = () =>
  clientApi.get('text/presets').json<ApiResponse<TextPresetDef[]>>()

export const getTextOperations = () =>
  clientApi.get('text/operations').json<ApiResponse<TextOperationDef[]>>()
```

---

### Task 7: Create TextInput component (textarea + file upload)

**Files:**
- Create: `dashboard/app/components/tools/TextInput.tsx`

- [ ] **Step 1: Build the TextInput component**

Two-tab component: "Paste text" tab with textarea, "Upload file" tab with drag-and-drop for PDF/TXT. Reuse the visual style from `AudioFileInput`.

```typescript
'use client'

import { useRef, useState } from 'react'
import { Label } from '@/app/components/ui/label'

type InputMode = 'text' | 'file'

interface TextInputProps {
  text: string
  onTextChange: (text: string) => void
  file: File | null
  onFileChange: (file: File | null) => void
  mode: InputMode
  onModeChange: (mode: InputMode) => void
}

const ACCEPTED = '.pdf,.txt'
const MAX_SIZE_MB = 100

export function TextInput({ text, onTextChange, file, onFileChange, mode, onModeChange }: TextInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  function handleFile(f: File | undefined) {
    if (!f) return
    if (f.size > MAX_SIZE_MB * 1024 * 1024) return
    onFileChange(f)
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onModeChange('text')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            mode === 'text'
              ? 'bg-accent-strong/15 text-foreground'
              : 'text-muted hover:text-foreground'
          }`}
        >
          Paste text
        </button>
        <button
          type="button"
          onClick={() => onModeChange('file')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            mode === 'file'
              ? 'bg-accent-strong/15 text-foreground'
              : 'text-muted hover:text-foreground'
          }`}
        >
          Upload file
        </button>
      </div>

      {mode === 'text' ? (
        <div className="space-y-1.5">
          <Label>Your text</Label>
          <textarea
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="Paste your text here..."
            rows={8}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-accent-strong/40"
          />
          {text && (
            <p className="text-xs text-muted">
              {text.length.toLocaleString()} characters
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label>Document file</Label>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              handleFile(e.dataTransfer.files[0])
            }}
            className={`
              flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed
              px-4 py-8 text-sm transition-colors cursor-pointer
              ${dragOver
                ? 'border-accent-strong bg-accent-strong/5'
                : file
                  ? 'border-accent-strong/40 bg-accent-strong/5'
                  : 'border-border hover:border-muted-foreground/40'
              }
            `}
          >
            {file ? (
              <>
                <span className="font-medium text-foreground">{file.name}</span>
                <span className="text-xs text-muted">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" x2="12" y1="3" y2="15" />
                </svg>
                <span className="text-muted">Drop a file here or click to browse</span>
                <span className="text-xs text-muted">.pdf or .txt, up to {MAX_SIZE_MB}MB</span>
              </>
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
      )}
    </div>
  )
}
```

---

### Task 8: Rewrite text page to use new input and sync/async flow

**Files:**
- Modify: `dashboard/app/(app)/dashboard/text/page.tsx`

- [ ] **Step 1: Rewrite TextPage**

Replace `UrlInput` with `TextInput`. Handle sync (show result immediately) and async (poll job) responses:

```typescript
'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/app/components/ui/button'
import { ToolLayout } from '@/app/components/tools/ToolLayout'
import { TextInput } from '@/app/components/tools/TextInput'
import { MetricsPanel } from '@/app/components/tools/MetricsPanel'
import { TextSettingsPanel, type TextSettings } from '@/app/components/tools/TextSettingsPanel'
import { useJobPoll } from '@/app/hooks/use-job-poll'
import { submitTextJob, uploadDocument } from '@/app/http/text'
import { getTextJobStatus } from '@/app/http/jobs'

export default function TextPage() {
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [inputMode, setInputMode] = useState<'text' | 'file'>('text')
  const [settings, setSettings] = useState<TextSettings>({ mode: 'custom', operations: [] })
  const [jobId, setJobId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [syncResult, setSyncResult] = useState<{ output: string; metrics: Record<string, unknown> } | null>(null)

  const { job, isPolling, isFailed, timedOut } = useJobPoll({
    jobId,
    fetcher: getTextJobStatus,
  })

  const canSubmit =
    settings.mode === 'preset' ||
    (settings.mode === 'custom' && settings.operations.length > 0)

  const hasInput = inputMode === 'text' ? text.trim().length > 0 : file !== null

  async function handleSubmit() {
    if (!hasInput) return toast.error(inputMode === 'text' ? 'Please enter some text' : 'Please select a file')
    if (!canSubmit) return toast.error('Enable at least one operation')

    setJobId(null)
    setSyncResult(null)
    setSubmitting(true)

    try {
      let input: Record<string, unknown>

      if (inputMode === 'file' && file) {
        const uploadRes = await uploadDocument(file)
        input = settings.mode === 'preset'
          ? { fileId: uploadRes.data.id, preset: settings.preset }
          : { fileId: uploadRes.data.id, operations: settings.operations }
      } else {
        input = settings.mode === 'preset'
          ? { text, preset: settings.preset }
          : { text, operations: settings.operations }
      }

      const res = await submitTextJob(input as any)
      const data = res.data as any

      if (data.sync) {
        setSyncResult({ output: data.output, metrics: data.metrics })
      } else {
        setJobId(data.job.id)
      }
    } catch {
      toast.error('Failed to submit job.')
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (isFailed) toast.error(job?.error ?? 'Job failed')
  }, [isFailed]) // eslint-disable-line react-hooks/exhaustive-deps

  // Determine what to show in output panel
  const displayStatus = syncResult ? 'completed' : job?.status
  const displayMetrics = syncResult?.metrics ?? job?.result?.metrics
  const displayOutput = syncResult?.output

  return (
    <ToolLayout
      title="Text compression"
      description="Compress text using a preset or custom operations."
      inputPanel={
        <TextInput
          text={text}
          onTextChange={setText}
          file={file}
          onFileChange={setFile}
          mode={inputMode}
          onModeChange={setInputMode}
        />
      }
      settingsPanel={<TextSettingsPanel value={settings} onChange={setSettings} />}
      historyPanel={/* existing placeholder */}
      outputPanel={
        <>
          <MetricsPanel
            status={displayStatus}
            metrics={displayMetrics}
            error={job?.error}
            timedOut={timedOut}
          />
          {displayOutput && (
            <div className="mt-4 p-4 bg-background-section rounded-lg">
              <p className="text-xs font-medium text-muted mb-2">Output</p>
              <pre className="text-sm whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
                {displayOutput}
              </pre>
            </div>
          )}
        </>
      }
      action={
        <Button
          onClick={handleSubmit}
          disabled={submitting || isPolling || !canSubmit || !hasInput}
          className="rounded-full bg-accent-strong text-foreground hover:bg-accent-light"
        >
          {submitting ? 'Processing…' : isPolling ? 'Processing…' : 'Compress'}
        </Button>
      }
    />
  )
}
```

---

### Task 9: End-to-end verification

- [ ] **Step 1: Test sync path — paste small text in dashboard, verify instant result**
- [ ] **Step 2: Test async path — upload a PDF, verify job polling and result**
- [ ] **Step 3: Test async path — paste large text (> 50KB), verify job polling**
- [ ] **Step 4: Verify audio upload still works (no regression on /upload)**
