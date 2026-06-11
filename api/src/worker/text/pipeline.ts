import { getHandler } from './operations';
import type { TextOperation } from '../../modules/text/text.types';

export async function processText(
  input: string,
  operations: TextOperation[],
): Promise<string> {
  let current = input;

  for (const op of operations) {
    const handler = getHandler(op.type);
    const params = 'params' in op ? op.params : undefined;
    current = await handler.process(current, params as any);
  }

  return current;
}
