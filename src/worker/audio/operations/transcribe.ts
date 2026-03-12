import Anthropic from '@anthropic-ai/sdk';
import { readFile, writeFile } from 'fs/promises';
import type { AudioOperationHandler } from '../types';

const client = new Anthropic();

export const transcribe: AudioOperationHandler<'transcribe'> = {
  type: 'transcribe',

  async process(inputPath, outputPath, params) {
    const audioBuffer = await readFile(inputPath);
    const base64Audio = audioBuffer.toString('base64');

    const ext = inputPath.split('.').pop()?.toLowerCase() ?? 'mp3';
    const mediaTypeMap: Record<string, string> = {
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      webm: 'audio/webm',
      ogg: 'audio/ogg',
      flac: 'audio/flac',
    };
    const mediaType = mediaTypeMap[ext] ?? 'audio/mpeg';

    const langPrompt = params.lang === 'PT'
      ? 'Transcribe the following audio in Portuguese. Respond only with the transcription.'
      : 'Transcribe the following audio in English. Respond only with the transcription.';

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: langPrompt,
            },
            {
              type: 'document',
              source: {
                type: 'base64',
                // @ts-expect-error
                media_type: mediaType,
                data: base64Audio,
              },
            },
          ],
        },
      ],
    });

    const block = message.content[0];

    if (block.type !== 'text') {
      throw new Error('Unexpected response from AI model');
    }

    const txtOutput = outputPath.replace(/\.[^.]+$/, '.txt');
    await writeFile(txtOutput, block.text, 'utf-8');
  },
};
