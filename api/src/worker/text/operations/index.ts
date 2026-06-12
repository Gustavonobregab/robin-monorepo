import type { TextOperationHandler } from '../types';
import type { TextOperationType } from '../../../modules/text/text.types';
import { trim } from './trim';
import { jsonToToon } from './json-to-toon';

const handlers = new Map<string, TextOperationHandler<TextOperationType>>();

function register(handler: TextOperationHandler<TextOperationType>) {
  handlers.set(handler.type, handler);
}

register(trim);
register(jsonToToon);

export function getHandler(type: string): TextOperationHandler<TextOperationType> {
  const handler = handlers.get(type);

  if (!handler) {
    throw new Error(`No handler registered for text operation: ${type}`);
  }

  return handler;
}
