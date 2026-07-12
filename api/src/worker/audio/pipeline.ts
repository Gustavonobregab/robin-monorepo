import { getHandler } from './operations';
import type { AudioOperation } from '../../modules/audio/audio.types';

export async function processAudioFile(
  inputPath: string,
  outputPath: string,
  operations: AudioOperation[],
): Promise<void> {
  let currentInput = inputPath;

  for (let i = 0; i < operations.length; i++) {
    const op = operations[i];

    const handler = getHandler(op.type);

    const isLast = i === operations.length - 1;

    // Intermediates stay lossless (WAV); only the final encode is lossy, avoiding generation loss
    const stepOutput = isLast ? outputPath : `${inputPath}.step-${i}.wav`;

    await handler.process(currentInput, stepOutput, op.params as any);

    currentInput = stepOutput;
  }
}
