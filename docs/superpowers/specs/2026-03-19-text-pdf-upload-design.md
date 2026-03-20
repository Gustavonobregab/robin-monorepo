# Text Processing — PDF/Direct Text Input

## Summary

Replace URL-based text input with direct text (textarea) and file upload (PDF/TXT). Small text processed synchronously, large text and files processed asynchronously via BullMQ.

## Input Methods

1. **Textarea** — paste text directly
   - <= 50KB: synchronous processing, result in response
   - > 50KB: enqueued to BullMQ, async polling
2. **File upload** (PDF, TXT) — upload to S3 via `/upload`, always async

## API Changes

### `POST /text`

**Before:** `{ textUrl: string; preset?; operations? }`

**After:**
```typescript
// Direct text input
{ text: string; preset?; operations? }

// File upload reference
{ fileId: string; preset?; operations? }
```

- `text` and `fileId` are mutually exclusive, one required
- Remove `textUrl` field entirely
- Sync response (text <= 50KB): `{ data: { output: string; metrics: {...} } }`
- Async response (text > 50KB or fileId): `{ data: { job: Job } }`

### `POST /upload`

Extend to accept PDF and TXT files:
- Add MIME types: `application/pdf`, `text/plain`
- Add magic bytes validation for PDF (`%PDF` header)
- TXT has no magic bytes — accept if MIME matches
- Keep same S3 upload flow and MongoDB document

## Worker Changes

### PDF Text Extraction
- Use `pdf-parse` library to extract text from PDF
- Input: PDF buffer from S3
- Output: plain text string fed into pipeline

### Source handling in text processor
- `source.kind === 'storage'` + PDF MIME → download from S3, extract text, run pipeline
- `source.kind === 'storage'` + TXT MIME → download from S3, read as UTF-8 string, run pipeline
- `source.kind === 'inline'` → text passed directly (for async large text), run pipeline

### Job payload update
```typescript
TextJobPayload = {
  type: 'text';
  preset?: string;
  operations: TextOperation[];
  source:
    | { kind: 'inline'; text: string }       // large text > 50KB
    | { kind: 'storage'; ref: string }        // file upload (PDF/TXT)
}
```

## Dashboard Changes

### Text page input
- Replace `UrlInput` with:
  - **Textarea** for pasting text
  - **File upload zone** (drag-and-drop or click) for PDF/TXT
- User picks one or the other (tab or toggle)

### Result handling
- **Sync** (small text): display result immediately, no polling
- **Async** (large text / file): use existing `useJobPoll` hook

## Dependencies

- `pdf-parse` (npm) — PDF text extraction in worker
