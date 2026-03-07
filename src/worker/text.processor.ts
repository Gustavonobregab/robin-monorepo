import type { Job } from 'bullmq';
import type { TextQueueJob } from '../queues/text.queue';
import type { TextJobPayload } from '../modules/jobs/job.types';
import { JobModel } from '../modules/jobs/job.model';
import { processText } from './text/pipeline';

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

  log(id, `Operations: ${payload.operations.map((op) => op.type).join(' → ')}`);

  await JobModel.findByIdAndUpdate(id, { status: 'processing' });

  try {
    const source = payload.source;
    const url = source.kind === 'url' ? source.url : source.ref;

    log(id, `Downloading from ${url}`);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to download text: ${response.status}`);
    }

    const input = await response.text();
    const inputSize = new TextEncoder().encode(input).byteLength;
    log(id, `Downloaded ${(inputSize / 1024).toFixed(1)}KB`);

    log(id, 'Processing pipeline...');
    const output = await processText(input, payload.operations);
    const outputSize = new TextEncoder().encode(output).byteLength;

    const ratio = (inputSize / outputSize).toFixed(2);
    log(id, `Done — ${(inputSize / 1024).toFixed(1)}KB → ${(outputSize / 1024).toFixed(1)}KB (ratio: ${ratio}x)`);

    // TODO: upload output to storage and get outputUrl

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
  } catch (err) {
    log(id, `Failed: ${err instanceof Error ? err.message : err}`);
    await JobModel.findByIdAndUpdate(id, {
      status: 'failed',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    throw err;
  }
}
