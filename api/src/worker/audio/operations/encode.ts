import type { AudioOperationHandler } from '../types';
import { runFFmpeg } from '../ffmpeg';

export const encode: AudioOperationHandler<'encode'> = {
  type: 'encode',

  async process(inputPath, outputPath, params) {
    const isMp3 = params.format === 'mp3';

    const options = [
      '-c:a', isMp3 ? 'libmp3lame' : 'libopus',
      '-b:a', `${params.bitrate}k`,
      '-ac', String(params.channels),
    ];

    if (!isMp3) {
      options.push('-vbr', 'on');
    }

    await runFFmpeg(inputPath, outputPath, [], options);
  },
};
