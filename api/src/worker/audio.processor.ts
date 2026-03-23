import { join } from 'path';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import type { Job } from 'bullmq';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { AudioQueueJob } from '../queues/audio.queue';
import type { AudioJobPayload } from '../modules/jobs/job.types';
import { JobModel } from '../modules/jobs/job.model';
import { processAudioFile } from './audio/pipeline';
import { s3, S3_BUCKET } from '../config/storage';
import { probeAudio } from './audio/probe';
import { usageService } from '../modules/usage/usage.service';
import { rollbackCredits } from '../middlewares/credits';

const HOURS_72 = 72 * 60 * 60; // seconds

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

  log(id, `Operations: ${payload.operations.map((op) => op.type).join(' -> ')}`);

  await JobModel.findByIdAndUpdate(id, { status: 'processing' });

  const workDir = await mkdtemp(join(tmpdir(), 'rw-audio-'));
  const inputPath = join(workDir, 'input');
  const outputPath = join(workDir, 'output.mp3');

  try {
    const start = Date.now();
    // Download from S3
    const s3Key = payload.source.ref;
    log(id, `Downloading from S3: ${s3Key}`);

    const response = await s3.send(new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
    }));

    if (!response.Body) {
      throw new Error('Empty response from S3');
    }

    const buffer = await response.Body.transformToByteArray();
    await Bun.write(inputPath, buffer);
    const inputSize = buffer.byteLength;
    log(id, `Downloaded ${(inputSize / 1024 / 1024).toFixed(2)}MB`);

    // Extract audio metadata before processing
    const probeResult = await probeAudio(inputPath);
    log(id, `Probed: ${(probeResult.durationMs / 1000).toFixed(1)}s, ${probeResult.sampleRate}Hz, ${probeResult.channels}ch`);

    // Process
    log(id, 'Processing pipeline...');
    await processAudioFile(inputPath, outputPath, payload.operations);

    const outputFile = Bun.file(outputPath);
    const outputSize = outputFile.size;

    const ratio = (inputSize / outputSize).toFixed(2);
    log(id, `Done: ${(inputSize / 1024 / 1024).toFixed(2)}MB to ${(outputSize / 1024 / 1024).toFixed(2)}MB (ratio: ${ratio}x)`);

    // Upload output to S3
    const outputKey = `outputs/${id}/result.mp3`;

    const outputBuffer = await outputFile.arrayBuffer();

    await s3.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: outputKey,
      Body: new Uint8Array(outputBuffer),
      ContentType: 'audio/mpeg',
    }));

    log(id, `Uploaded output to S3: ${outputKey}`);

    // Generate presigned URL (72h; aligned with S3 lifecycle since PutObject runs first)
    const outputUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: S3_BUCKET, Key: outputKey }),
      { expiresIn: HOURS_72 }
    );

    await JobModel.findByIdAndUpdate(id, {
      status: 'completed',
      completedAt: new Date(),
      result: {
        outputUrl,
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
      pipelineType: 'audio',
      operations: payload.operations.map((op) => op.type),
      inputBytes: inputSize,
      outputBytes: outputSize,
      processingMs,
      audio: {
        durationMs: probeResult.durationMs,
        format: probeResult.format,
        sampleRate: probeResult.sampleRate,
        channels: probeResult.channels,
      },
      creditsConsumed: payload.creditCost || 0,
    });

    log(id, 'Usage recorded');
  } catch (err) {
    log(id, `Failed: ${err instanceof Error ? err.message : err}`);
    await JobModel.findByIdAndUpdate(id, {
      status: 'failed',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    // Rollback reserved credits on failure
    const creditCost = payload.creditCost;
    if (creditCost) {
      await rollbackCredits(jobDoc.userId, creditCost);
      log(id, `Rolled back ${creditCost} credits`);
    }
    throw err;
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
