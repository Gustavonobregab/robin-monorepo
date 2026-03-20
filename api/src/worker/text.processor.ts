import type { Job } from 'bullmq';
import type { TextQueueJob } from '../queues/text.queue';
import type { TextJobPayload } from '../modules/jobs/job.types';
import { JobModel } from '../modules/jobs/job.model';
import { processText } from './text/pipeline';
import { usageService } from '../modules/usage/usage.service';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3, S3_BUCKET } from '../config/storage';
import { PDFParse } from 'pdf-parse';

const log = (jobId: string, msg: string) => console.log(`[TEXT:${jobId}] ${msg}`);

export default async function (job: Job<TextQueueJob>) {
  const { data } = job.data;
  const id = data.jobId;

  log(id, 'Starting');

  const jobDoc = await JobModel.findById(id);

  if (!jobDoc) {
    throw new Error(`Job ${id} not found`);
  }

  const payload = jobDoc.payload as unknown as TextJobPayload;

  log(id, `Operations: ${payload.operations.map((op) => op.type).join(' -> ')}`);

  await JobModel.findByIdAndUpdate(id, { status: 'processing' });

  try {
    const start = Date.now();
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
        const parser = new PDFParse({ data: Buffer.from(buffer) });
        const pdfData = await parser.getText();
        input = pdfData.text;
        log(id, `Extracted ${input.length} chars from PDF`);
      } else {
        input = new TextDecoder().decode(buffer);
      }
      
    } else {
      // Legacy URL source
      const url = (source as { kind: 'url'; url: string }).url;
      log(id, `Fetching from URL: ${url}`);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to download text: ${response.status}`);
      input = await response.text();
    }

    const inputSize = new TextEncoder().encode(input).byteLength;
    log(id, `Input ready — ${(inputSize / 1024).toFixed(1)}KB`);

    log(id, 'Processing pipeline...');
    const output = await processText(input, payload.operations);
    const outputSize = new TextEncoder().encode(output).byteLength;

    const ratio = (inputSize / outputSize).toFixed(2);
    log(id, `Done — ${(inputSize / 1024).toFixed(1)}KB to ${(outputSize / 1024).toFixed(1)}KB (ratio: ${ratio}x)`);


    await JobModel.findByIdAndUpdate(id, {
      status: 'completed',
      completedAt: new Date(),
      result: {
        metrics: {
          inputSize,
          outputSize,
          compressionRatio: +ratio,
          operationsApplied: payload.operations.map((op) => op.type),
        },
      },
    });

    // Record usage event
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

    log(id, `Usage recorded — ${input.length} chars`);
  } catch (err) {
    log(id, `Failed: ${err instanceof Error ? err.message : err}`);
    await JobModel.findByIdAndUpdate(id, {
      status: 'failed',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    throw err;
  }
}
