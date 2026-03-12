import type { AudioOperationHandler } from '../types';
import type { AudioOperationType } from '../../../modules/audio/audio.types';
import { trimSilence } from './trim-silence';
import { normalize } from './normalize';
import { compress } from './compress';
import { speedup } from './speedup';
import { transcribe } from './transcribe';

const handlers = new Map<string, AudioOperationHandler<AudioOperationType>>();

function register(handler: AudioOperationHandler<AudioOperationType>) {
  handlers.set(handler.type, handler);
}

register(trimSilence);
register(normalize);
register(compress);
register(speedup);
register(transcribe);

export function getHandler(type: string): AudioOperationHandler<AudioOperationType> {
  const handler = handlers.get(type);

  if (!handler) {
    throw new Error(`No handler registered for operation: ${type}`);
  }

  return handler;
}
