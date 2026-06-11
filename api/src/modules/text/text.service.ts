import {
  TEXT_PRESETS,
  TEXT_OPERATIONS,
  type ProcessTextInput,
  type TextPreset,
  type TextOperation,
} from './text.types';
import { ApiError } from '../../utils/api-error';
import { jobService } from '../jobs/job.service';
import { uploadService } from '../upload/upload.service';
import { processText } from '../../worker/text/pipeline';
import type { Job } from '../jobs/job.types';
import { reserveCredits, rollbackCredits } from '../../middlewares/credits';
import { usersService } from '../users/users.service';
import { usageService } from '../usage/usage.service';
import { isDuplicateKeyError } from '../../utils/mongo';
import { ulid } from 'ulidx';

const SYNC_SIZE_LIMIT = 50 * 1024; // 50 KB

export class TextService {

  async processText(
    userId: string,
    input: ProcessTextInput
  ): Promise<{ sync: true; output: string; metrics: Record<string, unknown> } | { sync: false; job: Job }> {

    if (!input.text && !input.fileId) {
      throw new ApiError('TEXT_INVALID_INPUT', 'Either text or fileId must be provided', 400);
    }

    if (input.text && input.fileId) {
      throw new ApiError('TEXT_INVALID_INPUT', 'Provide either text or fileId, not both', 400);
    }

    if (this.isSyncEligible(input)) {
      const result = await this.processTextSync(userId, input);
      return { sync: true, ...result };
    }

    const { job } = await this.processTextAsync(userId, input);
    return { sync: false, job };
  }

  private isSyncEligible(input: ProcessTextInput): boolean {
    // webhookUrl implies the caller wants the async contract (job + callback)
    return (
      !input.webhookUrl &&
      !!input.text &&
      !input.fileId &&
      Buffer.byteLength(input.text, 'utf8') <= SYNC_SIZE_LIMIT
    );
  }

  async processTextSync(
    userId: string,
    input: ProcessTextInput
  ): Promise<{ output: string; metrics: Record<string, unknown> }> {
    const { preset, operations: customOps, text } = input;

    if (!preset && (!customOps || customOps.length === 0)) {
      throw new ApiError(
        'TEXT_INVALID_INPUT',
        'Either preset or operations must be provided',
        400
      );
    }

    const operations = this.resolveOperations(preset, customOps);

    // Reserve credits before processing
    const creditCost = await reserveCredits(userId, 'text');

    try {
      const inputText = text!;
      const inputSize = Buffer.byteLength(inputText, 'utf8');
      const start = performance.now();
      const output = await processText(inputText, operations);
      const processingMs = Math.round(performance.now() - start);
      const outputSize = Buffer.byteLength(output, 'utf8');

      await this.recordSyncUsage(userId, {
        inputText,
        inputSize,
        outputSize,
        processingMs,
        operations,
        creditCost,
      });

      return {
        output,
        metrics: {
          inputSize,
          outputSize,
          compressionRatio: inputSize > 0 ? +(outputSize / inputSize).toFixed(4) : 0,
          processingMs,
          operationsApplied: operations.map((op) => op.type),
        },
      };
    } catch (err) {
      // Rollback credits on sync processing failure
      await rollbackCredits(userId, creditCost);
      throw err;
    }
  }

  // Usage is telemetry: a failed write must never fail a request that processed
  private async recordSyncUsage(
    userId: string,
    data: {
      inputText: string;
      inputSize: number;
      outputSize: number;
      processingMs: number;
      operations: TextOperation[];
      creditCost: number;
    },
  ) {
    try {
      await usageService.record({
        idempotencyKey: `sync:${ulid()}`,
        userId,
        sync: true,
        pipelineType: 'text',
        operations: data.operations.map((op) => op.type),
        inputBytes: data.inputSize,
        outputBytes: data.outputSize,
        processingMs: data.processingMs,
        text: {
          characterCount: data.inputText.length,
          wordCount: data.inputText.split(/\s+/).filter(Boolean).length,
          encoding: 'utf-8',
        },
        creditsConsumed: data.creditCost,
      });
    } catch (err) {
      console.error(`[TEXT:sync] Failed to record usage: ${err instanceof Error ? err.message : err}`);
    }
  }

  async processTextAsync(
    userId: string,
    input: ProcessTextInput
  ): Promise<{ job: Job }> {
    const { preset, operations: customOps, text, fileId } = input;

    if (!preset && (!customOps || customOps.length === 0)) {
      throw new ApiError(
        'TEXT_INVALID_INPUT',
        'Either preset or operations must be provided',
        400
      );
    }

    const operations = this.resolveOperations(preset, customOps);

    if (input.idempotencyKey) {
      const existing = await jobService.findByIdempotencyKey(userId, input.idempotencyKey);
      if (existing) return { job: existing };
    }

    if (input.webhookUrl) {
      await usersService.assertWebhookAccess(userId);
    }

    // Reserve credits before enqueueing
    const creditCost = await reserveCredits(userId, 'text');

    try {
      let source: { kind: 'storage'; ref: string } | { kind: 'inline'; text: string };

      if (fileId) {
        const upload = await uploadService.getUpload(fileId, userId);

        if (upload.mimeType !== 'application/pdf' && upload.mimeType !== 'text/plain') {
          throw new ApiError('TEXT_INVALID_INPUT', 'Uploaded file is not a text document', 422);
        }

        source = { kind: 'storage', ref: upload.s3Key };
      } else {
        source = { kind: 'inline', text: text! };
      }

      const job = await jobService.create({
        userId,
        payload: {
          type: 'text',
          preset,
          operations,
          source,
          creditCost,
          webhookUrl: input.webhookUrl,
        },
        idempotencyKey: input.idempotencyKey,
      });

      await jobService.enqueue(job.id, 'text');

      return { job };
    } catch (err) {
      await rollbackCredits(userId, creditCost);

      // Concurrent request with the same idempotency key won the race
      if (input.idempotencyKey && isDuplicateKeyError(err)) {
        const existing = await jobService.findByIdempotencyKey(userId, input.idempotencyKey);
        if (existing) return { job: existing };
      }

      throw err;
    }
  }

  private resolveOperations(
    preset?: TextPreset,
    customOps?: TextOperation[]
  ): TextOperation[] {
    if (preset) {
      const presetConfig = TEXT_PRESETS[preset];

      if (!presetConfig) {
        throw new ApiError('TEXT_INVALID_PRESET', `Unknown preset: ${preset}`, 400);
      }
      return presetConfig.operations as unknown as TextOperation[];
    }

    return customOps!;
  }

  listPresets() {
    return Object.entries(TEXT_PRESETS).map(([id, preset]) => ({
      id,
      name: preset.name,
      description: preset.description,
      operations: preset.operations.map((op) => op.type),
    }));
  }

  listOperations() {
    return Object.entries(TEXT_OPERATIONS).map(([id, op]) => ({
      id,
      name: op.name,
      description: op.description,
      params: op.params,
    }));
  }
}

export const textService = new TextService();
