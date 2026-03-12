import { t, type Static } from 'elysia';

export const AUDIO_OPERATIONS = {
  'trim-silence': {
    name: 'Trim Silence',
    description: 'Remove silent parts from audio',
    params: {
      aggressiveness: { type: 'number', min: 0, max: 1, default: 0.5 },
      minSilenceDuration: { type: 'number', min: 100, max: 5000, default: 500 },
    },
  },
  'normalize': {
    name: 'Normalize',
    description: 'Normalize audio volume levels',
    params: {
      targetLevel: { type: 'number', min: -70, max: 0, default: -14 },
      peakNormalize: { type: 'boolean', default: false },
    },
  },
  'compress': {
    name: 'Compress',
    description: 'Apply dynamic range compression',
    params: {
      ratio: { type: 'number', min: 1, max: 20, default: 4 },
      threshold: { type: 'number', min: -60, max: 0, default: -20 },
      attack: { type: 'number', min: 0, max: 100, default: 10 },
      release: { type: 'number', min: 0, max: 1000, default: 100 },
    },
  },
  'speedup': {
    name: 'Speed Up',
    description: 'Change audio speed without changing pitch',
    params: {
      rate: { type: 'number', min: 0.5, max: 5.0, default: 1.25 },
    },
  },
  'transcribe': {
    name: 'Transcribe',
    description: 'AI-powered audio transcription using Claude',
    params: {
      lang: { type: 'string', default: 'EN' },
    },
  },
} as const;

export type AudioOperationType = keyof typeof AUDIO_OPERATIONS;

export const AUDIO_PRESETS = {
  chill: {
    name: 'Chill',
    description: 'Light processing, preserves original dynamics',
    operations: [
      { type: 'trim-silence', params: { aggressiveness: 0.2 } },
      { type: 'normalize', params: { targetLevel: -16 } },
    ],
  },
  medium: {
    name: 'Medium',
    description: 'Balanced processing for general use',
    operations: [
      { type: 'trim-silence', params: { aggressiveness: 0.5 } },
      { type: 'normalize', params: { targetLevel: -14 } },
      { type: 'compress', params: { ratio: 3, threshold: -24 } },
    ],
  },
  aggressive: {
    name: 'Aggressive',
    description: 'Heavy processing, maximizes loudness',
    operations: [
      { type: 'trim-silence', params: { aggressiveness: 0.8 } },
      { type: 'normalize', params: { targetLevel: -10 } },
      { type: 'compress', params: { ratio: 8, threshold: -18 } },
    ],
  },
  podcast: {
    name: 'Podcast',
    description: 'Optimized for voice content',
    operations: [
      { type: 'trim-silence', params: { aggressiveness: 0.6, minSilenceDuration: 800 } },
      { type: 'normalize', params: { targetLevel: -16, peakNormalize: false } },
      { type: 'compress', params: { ratio: 4, threshold: -20, attack: 5, release: 150 } },
    ],
  },
  lecture: {
    name: 'Lecture Mode',
    description: 'Trim silence + 1.5x Speed + Normalize',
    operations: [
      { type: 'trim-silence', params: { aggressiveness: 0.4, minSilenceDuration: 500 } },
      { type: 'speedup', params: { rate: 1.5 } },
      { type: 'normalize', params: { targetLevel: -14 } },
    ],
  },
} as const;

export type AudioPreset = keyof typeof AUDIO_PRESETS;


export const AudioOperationSchema = t.Union([
  t.Object({
    type: t.Literal('trim-silence'),
    params: t.Optional(t.Object({
      aggressiveness: t.Optional(t.Number({ minimum: 0, maximum: 1 })),
      minSilenceDuration: t.Optional(t.Number({ minimum: 100, maximum: 5000 })),
    })),
  }),
  t.Object({
    type: t.Literal('normalize'),
    params: t.Optional(t.Object({
      targetLevel: t.Optional(t.Number({ minimum: -70, maximum: 0 })),
      peakNormalize: t.Optional(t.Boolean()),
    })),
  }),
  t.Object({
    type: t.Literal('compress'),
    params: t.Optional(t.Object({
      ratio: t.Optional(t.Number({ minimum: 1, maximum: 20 })),
      threshold: t.Optional(t.Number({ minimum: -60, maximum: 0 })),
      attack: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
      release: t.Optional(t.Number({ minimum: 0, maximum: 1000 })),
    })),
  }),
  t.Object({
    type: t.Literal('speedup'),
    params: t.Optional(t.Object({
      rate: t.Optional(t.Number({ minimum: 0.5, maximum: 5.0 })),
    })),
  }),
  t.Object({
    type: t.Literal('transcribe'),
    params: t.Optional(t.Object({
      lang: t.Optional(t.Union([t.Literal('EN'), t.Literal('PT')])),
    })),
  }),
]);

export type AudioOperation = Static<typeof AudioOperationSchema>;

export const AudioPresetSchema = t.Union([
  t.Literal('chill'),
  t.Literal('medium'),
  t.Literal('aggressive'),
  t.Literal('podcast'),
  t.Literal('lecture'),
]);

export interface ProcessAudioInput {
  audioUrl: string;
  preset?: AudioPreset;
  operations?: AudioOperation[];
}
