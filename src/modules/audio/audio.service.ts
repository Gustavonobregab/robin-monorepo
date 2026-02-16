import {
  AUDIO_PRESETS,
  AUDIO_OPERATIONS,
  type ProcessAudioInput,
  type AudioPreset,
  type AudioOperation,
} from './audio.types';
import { ApiError } from '../../utils/api-error';
import type { Job } from '../jobs/job.types';

export class AudioService {

  async processAudio(
    userId: string,
    input: ProcessAudioInput
  ): Promise<{ job: Job }> {
    const { preset, operations: customOps, audioUrl } = input;

    if (!preset && (!customOps || customOps.length === 0)) {
      throw new ApiError(
        'AUDIO_INVALID_INPUT',
        'Either preset or operations must be provided',
        400
      );
    }

    const operations = this.resolveOperations(preset, customOps);

    //TODO: ENQUEUE JOB HERE
    const job = { id: '123', userId, status: 'pending', payload: { type: 'audio', operations, audioUrl }, createdAt: new Date() } as unknown as Job;
    return { job };
  }

  private resolveOperations(
    preset?: AudioPreset,
    customOps?: AudioOperation[]
  ): AudioOperation[] {
    if (preset) {
      const presetConfig = AUDIO_PRESETS[preset];

      if (!presetConfig) {
        throw new ApiError('AUDIO_INVALID_PRESET', `Unknown preset: ${preset}`, 400);
      }
      return presetConfig.operations as unknown as AudioOperation[];
    }

    return customOps!;
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
