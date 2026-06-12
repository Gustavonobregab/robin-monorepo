import type { AudioOperationHandler } from '../types';
import { runFFmpeg } from '../ffmpeg';

export const trimSilence: AudioOperationHandler<'trim-silence'> = {
  type: 'trim-silence',

  async process(inputPath, outputPath, params) {
    const threshold = Math.round(-50 + params.aggressiveness * 30);
    const duration = params.minSilenceDuration / 1000;

    await runFFmpeg(inputPath, outputPath, [
      `silenceremove=start_periods=1:start_duration=0:start_threshold=${threshold}dB:stop_periods=-1:stop_duration=${duration}:stop_threshold=${threshold}dB:stop_silence=0.2`,
    ]);
  },
};
