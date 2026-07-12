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
