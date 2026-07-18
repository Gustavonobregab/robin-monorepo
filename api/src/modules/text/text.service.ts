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
import type { JobStatusView } from '../jobs/job.types';
import { reserveCredits, rollbackCredits } from '../../middlewares/credits';
import { usageService } from '../usage/usage.service';
import { isDuplicateKeyError } from '../../utils/mongo';
import { ulid } from 'ulidx';

const SYNC_SIZE_LIMIT = 50 * 1024; // 50 KB

export class TextService {

  // Everything returns a job view; small inputs come back already completed
  async processText(userId: string, input: ProcessTextInput): Promise<JobStatusView> {
    if (!input.text && !input.fileId) {
      throw new ApiError('TEXT_INVALID_INPUT', 'Either text or fileId must be provided', 400);
    }

    if (input.text && input.fileId) {
      throw new ApiError('TEXT_INVALID_INPUT', 'Provide either text or fileId, not both', 400);
    }

    if (this.isSyncEligible(input)) {
      return this.processTextSync(userId, input);
    }

    return this.processTextAsync(userId, input);
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

  async processTextSync(userId: string, input: ProcessTextInput): Promise<JobStatusView> {
    const { preset, operations: customOps, text } = input;

    if (!preset && (!customOps || customOps.length === 0)) {
      throw new ApiError(
        'TEXT_INVALID_INPUT',
        'Either preset or operations must be provided',
        400
      );
    }

    const operations = this.resolveOperations(preset, customOps);

    const inputText = text!;
    const inputSize = Buffer.byteLength(inputText, 'utf8');

    const creditCost = await reserveCredits(userId, 'text', inputSize);

    try {
      const start = performance.now();
      const output = await processText(inputText, operations);
      const processingMs = Math.round(performance.now() - start);
      const outputSize = Buffer.byteLength(output, 'utf8');

      const metrics = {
        inputSize,
        outputSize,
        compressionRatio: inputSize > 0 ? +(outputSize / inputSize).toFixed(4) : 0,
        processingMs,
        operationsApplied: operations.map((op) => op.type),
      };

      const job = await jobService.createCompleted({
        userId,
        payload: { type: 'text', preset, operations, source: { kind: 'inline', text: '' }, creditCost },
        result: { outputText: output, metrics },
      });

      await this.recordSyncUsage(userId, {
        jobId: job.id,
        inputText,
        inputSize,
        outputSize,
        processingMs,
        operations,
        creditCost,
      });

      return job;
    } catch (err) {
      await rollbackCredits(userId, creditCost);
      throw err;
    }
  }

  private async recordSyncUsage(
    userId: string,
    data: {
      jobId: string;
      inputText: string;
      inputSize: number;
      outputSize: number;
      processingMs: number;
      operations: TextOperation[];
      creditCost: number;
    },
  ) {
    await usageService.recordSafe({
      idempotencyKey: `job:${data.jobId}`,
      userId,
      jobId: data.jobId,
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
  }

  async processTextAsync(userId: string, input: ProcessTextInput): Promise<JobStatusView> {
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
      if (existing) return (await jobService.getStatus(userId, existing.id))!;
    }

    let source: { kind: 'storage'; ref: string } | { kind: 'inline'; text: string };
    let inputBytes: number;

    if (fileId) {
      const upload = await uploadService.getUpload(fileId, userId);

      if (upload.mimeType !== 'application/pdf' && upload.mimeType !== 'text/plain') {
        throw new ApiError('TEXT_INVALID_INPUT', 'Uploaded file is not a text document', 422);
      }

      source = { kind: 'storage', ref: upload.s3Key };
      inputBytes = upload.size;
    } else {
      source = { kind: 'inline', text: text! };
      inputBytes = Buffer.byteLength(text!, 'utf8');
    }

    const creditCost = await reserveCredits(userId, 'text', inputBytes);

    try {
      const job = await jobService.createAndEnqueue({
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

      return job;
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

  private resolveOperations(
    preset?: TextPreset,
    customOps?: TextOperation[]
  ): TextOperation[] {
    let ops: TextOperation[];

    if (preset) {
      const presetConfig = TEXT_PRESETS[preset];

      if (!presetConfig) {
        throw new ApiError('TEXT_INVALID_PRESET', `Unknown preset: ${preset}`, 400);
      }
      ops = presetConfig.operations as unknown as TextOperation[];
    } else {
      ops = customOps!;
    }

    // params is optional in the schema; handlers would otherwise read undefined
    return ops.map((op) => {
      const definition = TEXT_OPERATIONS[op.type as keyof typeof TEXT_OPERATIONS];
      if (!definition) return op;

      const defaults = Object.fromEntries(
        Object.entries(definition.params).map(([key, param]) => [key, param.default]),
      );

      return { ...op, params: { ...defaults, ...('params' in op ? op.params : {}) } };
    });
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
