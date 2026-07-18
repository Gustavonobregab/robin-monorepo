import {
  AUDIO_PRESETS,
  AUDIO_OPERATIONS,
  type ProcessAudioInput,
  type AudioPreset,
  type AudioOperation,
} from './audio.types';
import { ApiError } from '../../utils/api-error';
import { jobService } from '../jobs/job.service';
import type { JobStatusView } from '../jobs/job.types';
import { uploadService } from '../upload/upload.service';
import { reserveCredits, rollbackCredits } from '../../middlewares/credits';
import { isDuplicateKeyError } from '../../utils/mongo';

export class AudioService {

  async processAudio(userId: string, input: ProcessAudioInput): Promise<JobStatusView> {
    const { preset, operations: customOps, audioId } = input;

    if (!preset && (!customOps || customOps.length === 0)) {
      throw new ApiError(
        'AUDIO_INVALID_INPUT',
        'Either preset or operations must be provided',
        400
      );
    }

    if (input.idempotencyKey) {
      const existing = await jobService.findByIdempotencyKey(userId, input.idempotencyKey);
      if (existing) return (await jobService.getStatus(userId, existing.id))!;
    }

    // Resolve audioId to upload document; validates ownership and expiry
    const upload = await uploadService.getUpload(audioId, userId);

    if (!upload.mimeType.startsWith('audio/')) {
      throw new ApiError('AUDIO_INVALID_INPUT', 'Uploaded file is not an audio file', 422);
    }

    const operations = this.resolveOperations(preset, customOps);

    // Reserve credits before enqueueing; cost scales with file size
    const creditCost = await reserveCredits(userId, 'audio', upload.size);

    try {
      const job = await jobService.createAndEnqueue({
        userId,
        payload: {
          type: 'audio',
          preset,
          operations,
          source: { kind: 'storage', ref: upload.s3Key },
          name: upload.originalName,
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
    preset?: AudioPreset,
    customOps?: AudioOperation[]
  ): AudioOperation[] {
    let ops: AudioOperation[];

    if (preset) {
      const presetConfig = AUDIO_PRESETS[preset];

      if (!presetConfig) {
        throw new ApiError('AUDIO_INVALID_PRESET', `Unknown preset: ${preset}`, 400);
      }
      ops = presetConfig.operations as unknown as AudioOperation[];
    } else {
      ops = customOps!;
    }

    if (!ops.some((op) => op.type === 'encode')) {
      ops = [...ops, { type: 'encode' } as AudioOperation];
    }

    const merged = ops.map((op) => {
      const definition = AUDIO_OPERATIONS[op.type as keyof typeof AUDIO_OPERATIONS];
      if (!definition) return op;

      const defaults = Object.fromEntries(
        Object.entries(definition.params).map(([key, param]) => [key, param.default])
      );

      return { ...op, params: { ...defaults, ...op.params } };
    });

    // Encoding always runs last; if several were sent, the last one wins
    const encodeOp = merged.filter((op) => op.type === 'encode').pop()!;
    return [...merged.filter((op) => op.type !== 'encode'), encodeOp];
  }

  listPresets() {
    return Object.entries(AUDIO_PRESETS).map(([id, preset]) => ({
      id,
      name: preset.name,
      description: preset.description,
      operations: preset.operations.map((op) => op.type),
    }));
  }

  listOperations() {
    return Object.entries(AUDIO_OPERATIONS).map(([id, op]) => ({
      id,
      name: op.name,
      description: op.description,
      params: op.params,
    }));
  }
}

export const audioService = new AudioService();
