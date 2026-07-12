import { describe, test, expect } from 'bun:test';
import { TEXT_PRESETS, TEXT_OPERATIONS } from '../modules/text/text.types';
import { AUDIO_PRESETS, AUDIO_OPERATIONS } from '../modules/audio/audio.types';
import { getHandler as getTextHandler } from './text/operations';
import { getHandler as getAudioHandler } from './audio/operations';

// A preset referencing a removed op, or an exposed op with no handler, would only fail at runtime

describe('text operations registry', () => {
  test('every preset operation is an exposed operation', () => {
    for (const [name, preset] of Object.entries(TEXT_PRESETS)) {
      for (const op of preset.operations) {
        expect(TEXT_OPERATIONS[op.type as keyof typeof TEXT_OPERATIONS], `${name} → ${op.type}`).toBeDefined();
      }
    }
  });

  test('every exposed operation has a worker handler', () => {
    for (const type of Object.keys(TEXT_OPERATIONS)) {
      expect(() => getTextHandler(type)).not.toThrow();
    }
  });
});

describe('audio operations registry', () => {
  test('every preset operation is an exposed operation', () => {
    for (const [name, preset] of Object.entries(AUDIO_PRESETS)) {
      for (const op of preset.operations) {
        expect(AUDIO_OPERATIONS[op.type as keyof typeof AUDIO_OPERATIONS], `${name} → ${op.type}`).toBeDefined();
      }
    }
  });

  test('every exposed operation has a worker handler', () => {
    for (const type of Object.keys(AUDIO_OPERATIONS)) {
      expect(() => getAudioHandler(type)).not.toThrow();
    }
  });

  test('every preset ends with an encode step or relies on the service default', () => {
    for (const [name, preset] of Object.entries(AUDIO_PRESETS)) {
      const encodeIndex = preset.operations.findIndex((op) => op.type === 'encode');
      if (encodeIndex !== -1) {
        expect(encodeIndex, `${name}: encode must be last`).toBe(preset.operations.length - 1);
      }
    }
  });
});
