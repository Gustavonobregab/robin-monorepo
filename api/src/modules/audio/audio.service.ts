import {
  AUDIO_PRESETS,
  AUDIO_OPERATIONS,
  type ProcessAudioInput,
  type AudioPreset,
  type AudioOperation,
} from './audio.types';
import { ApiError } from '../../utils/api-error';
import { jobService } from '../jobs/job.service';
import type { Job } from '../jobs/job.types';
import { uploadService } from '../upload/upload.service';

export class AudioService {

  async processAudio( userId: string, input: ProcessAudioInput): Promise<{ job: Job }> {
    const { preset, operations: customOps, audioId } = input;

    if (!preset && (!customOps || customOps.length === 0)) {
      throw new ApiError(
        'AUDIO_INVALID_INPUT',
        'Either preset or operations must be provided',
        400
      );
    }

    // Resolve audioId to upload document — validates ownership and expiry
    const upload = await uploadService.getUpload(audioId, userId);

    const operations = this.resolveOperations(preset, customOps);

    const job = await jobService.create({ userId,
     payload:
     { type: 'audio',
       preset,
       operations,
       source: { kind: 'storage', ref: upload.s3Key },
       name: upload.originalName,
     } });

    await jobService.enqueue(job);

    return { job };
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

    return ops.map((op) => {
      const definition = AUDIO_OPERATIONS[op.type as keyof typeof AUDIO_OPERATIONS];
      if (!definition) return op;

      const defaults = Object.fromEntries(
        Object.entries(definition.params).map(([key, param]) => [key, param.default])
      );

      return { ...op, params: { ...defaults, ...op.params } };
    });
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
