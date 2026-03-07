import { join } from 'path';
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

    const stepOutput = isLast ? outputPath : join(inputPath + `.step-${i}.mp3`);

    await handler.process(currentInput, stepOutput, op.params as any);

    currentInput = stepOutput;
  }
}
