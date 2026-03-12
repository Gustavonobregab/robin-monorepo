import Anthropic from '@anthropic-ai/sdk';
import type { TextOperationHandler } from '../types';

const client = new Anthropic();

export const summarize: TextOperationHandler<'summarize'> = {
  type: 'summarize',

  async process(input, params) {
    const maxTokens = params.intensity > 70 ? 256 : params.intensity > 40 ? 512 : 1024;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      messages: [
        {
          role: 'user',
          content: `Summarize the following text concisely. Keep the key points and main ideas. Respond only with the summary, no preamble.\n\n${input}`,
        },
      ],
    });

    const block = message.content[0];
    
    if (block.type !== 'text') {
      throw new Error('Unexpected response from AI model');
    }

    return block.text;
  },
};
