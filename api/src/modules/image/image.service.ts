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
    // webhookUrl implies the caller wants the async contract; AVIF is memory-heavy under concurrency
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
