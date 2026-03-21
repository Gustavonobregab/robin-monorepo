import type { Job } from 'bullmq';
import type { TextQueueJob } from '../queues/text.queue';
import type { TextJobPayload, JobSource } from '../modules/jobs/job.types';
import { JobModel } from '../modules/jobs/job.model';
import { processText } from './text/pipeline';
import { usageService } from '../modules/usage/usage.service';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3, S3_BUCKET } from '../config/storage';

const SIGNED_URL_TTL = 72 * 60 * 60; // 72h in seconds

const log = (jobId: string, msg: string) => console.log(`[TEXT:${jobId}] ${msg}`);


async function resolveInput(id: string, source: JobSource): Promise<string> {
  switch (source.kind) {
    case 'inline':
      log(id, `Inline text: ${kb(source.text)}KB`);
      return source.text;

    case 'storage':
      return resolveStorageInput(id, source.ref);

    case 'url':
      return resolveUrlInput(id, source.url);
  }
}

async function resolveStorageInput(id: string, ref: string): Promise<string> {
  log(id, `Downloading from S3: ${ref}`);

  const response = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: ref }));
  if (!response.Body) throw new Error('Empty response from S3');

  const buffer = await response.Body.transformToByteArray();

  if (ref.endsWith('.pdf')) {
    log(id, 'Extracting text from PDF...');
    const { PDFParse } = await import('pdf-parse');
    const { text } = await new PDFParse({ data: Buffer.from(buffer) }).getText();
    log(id, `Extracted ${text.length} chars from PDF`);
    return text;
  }

  return new TextDecoder().decode(buffer);
}

async function resolveUrlInput(id: string, url: string): Promise<string> {
  log(id, `Fetching from URL: ${url}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download text: ${response.status}`);
  return response.text();
}


async function persistOutput(id: string, output: string, isFile: boolean) {
  if (!isFile) return { outputText: output };

  const outputKey = `outputs/${id}/result.txt`;

  await s3.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: outputKey,
    Body: Buffer.from(output, 'utf-8'),
    ContentType: 'text/plain; charset=utf-8',
  }));
  log(id, `Uploaded output to S3: ${outputKey}`);

  const outputUrl = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: S3_BUCKET, Key: outputKey }),
    { expiresIn: SIGNED_URL_TTL },
  );

  return { outputUrl };
}

const kb = (text: string) => (new TextEncoder().encode(text).byteLength / 1024).toFixed(1);


export default async function (job: Job<TextQueueJob>) {
  const id = job.data.data.jobId;
  log(id, 'Starting');

  const jobDoc = await JobModel.findById(id);
  if (!jobDoc) throw new Error(`Job ${id} not found`);

  const payload = jobDoc.payload as unknown as TextJobPayload;
  log(id, `Operations: ${payload.operations.map((op) => op.type).join(' -> ')}`);

  await JobModel.findByIdAndUpdate(id, { status: 'processing' });

  try {
    const start = Date.now();

    const input = await resolveInput(id, payload.source);

    const inputSize = new TextEncoder().encode(input).byteLength;
    log(id, `Input ready: ${kb(input)}KB`);

    log(id, 'Processing pipeline...');
    const output = await processText(input, payload.operations);

    const outputSize = new TextEncoder().encode(output).byteLength;

    const ratio = +(inputSize / outputSize).toFixed(2);
    
    log(id, `Done: ${kb(input)}KB to ${kb(output)}KB (ratio: ${ratio}x)`);

    const result = await persistOutput(id, output, payload.source.kind === 'storage');

    await JobModel.findByIdAndUpdate(id, {
      status: 'completed',
      completedAt: new Date(),
      result: {
        ...result,
        metrics: {
          inputSize,
          outputSize,
          compressionRatio: ratio,
          operationsApplied: payload.operations.map((op) => op.type),
        },
      },
    });

    const processingMs = Date.now() - start;
    await usageService.record({
      idempotencyKey: `job:${id}`,
      userId: jobDoc.userId,
      jobId: id,
      pipelineType: 'text',
      operations: payload.operations.map((op) => op.type),
      inputBytes: inputSize,
      outputBytes: outputSize,
      processingMs,
      text: {
        characterCount: input.length,
        wordCount: input.split(/\s+/).filter(Boolean).length,
        encoding: 'utf-8',
      },
    });
    log(id, `Usage recorded: ${input.length} chars`);
  } catch (err) {
    log(id, `Failed: ${err instanceof Error ? err.message : err}`);
    await JobModel.findByIdAndUpdate(id, {
      status: 'failed',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    throw err;
  }
}
