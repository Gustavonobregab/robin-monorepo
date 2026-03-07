import { join } from 'path';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import type { Job } from 'bullmq';
import type { AudioQueueJob } from '../queues/audio.queue';
import type { AudioJobPayload } from '../modules/jobs/job.types';
import { JobModel } from '../modules/jobs/job.model';
import { processAudioFile } from './audio/pipeline';

const log = (jobId: string, msg: string) => console.log(`[AUDIO:${jobId}] ${msg}`);

export default async function (job: Job<AudioQueueJob>) {
  const { data } = job.data;
  const id = data.jobId;

  log(id, 'Starting');

  const jobDoc = await JobModel.findById(id);

  if (!jobDoc) {
    throw new Error(`Job ${id} not found`);
  }

  const payload = jobDoc.payload as unknown as AudioJobPayload;

  log(id, `Operations: ${payload.operations.map((op) => op.type).join(' → ')}`);

  await JobModel.findByIdAndUpdate(id, { status: 'processing' });

  const workDir = await mkdtemp(join(tmpdir(), 'rw-audio-'));
  const inputPath = join(workDir, 'input');
  const outputPath = join(workDir, 'output.mp3');

  try {
    const source = payload.source;
    const url = source.kind === 'url' ? source.url : source.ref;

    log(id, `Downloading from ${url}`);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    await Bun.write(inputPath, buffer);
    const inputSize = buffer.byteLength;
    log(id, `Downloaded ${(inputSize / 1024 / 1024).toFixed(2)}MB`);

    log(id, 'Processing pipeline...');
    await processAudioFile(inputPath, outputPath, payload.operations);

    const outputFile = Bun.file(outputPath);
    const outputSize = outputFile.size;

    const ratio = (inputSize / outputSize).toFixed(2);
    log(id, `Done — ${(inputSize / 1024 / 1024).toFixed(2)}MB → ${(outputSize / 1024 / 1024).toFixed(2)}MB (ratio: ${ratio}x)`);

    // TODO: upload outputPath to storage and get outputUrl

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
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
