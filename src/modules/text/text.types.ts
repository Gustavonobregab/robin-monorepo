import { t, type Static } from 'elysia';


export const TEXT_OPERATIONS = {
  'trim': {
    name: 'Trim',
    description: 'Advanced cleaning & punctuation fix',
    params: {
      intensity: { type: 'number', min: 0, max: 100, default: 50 },
    },
  },
  'shorten': {
    name: 'Shorten',
    description: 'Dictionary replacement (PT/EN)',
    params: {
      lang: { type: 'string', default: 'EN' },
      intensity: { type: 'number', min: 0, max: 100, default: 50 },
    },
  },
  'minify': {
    name: 'Minify',
    description: 'Aggressive compression',
    params: {
      intensity: { type: 'number', min: 0, max: 100, default: 50 },
    },
  },
  'compress': {
    name: 'Compress',
    description: 'Simulate Gzip/Brotli',
    params: {
      algo: { type: 'string', default: 'gzip' },
      intensity: { type: 'number', min: 0, max: 100, default: 50 },
    },
  },
  'json-to-toon': {
    name: 'JSON to Toon',
    description: 'Convert JSON blocks to TOON',
    params: {
      intensity: { type: 'number', min: 0, max: 100, default: 50 },
    },
  },
  'summarize': {
    name: 'Summarize',
    description: 'AI-powered text summarization using Claude',
    params: {
      intensity: { type: 'number', min: 0, max: 100, default: 50 },
    },
  },
} as const;

export type TextOperationType = keyof typeof TEXT_OPERATIONS;

export const TEXT_PRESETS = {
  chill: {
    name: 'Chill',
    description: 'Light cleanup, just trim whitespace',
    operations: [
      { type: 'trim', params: { intensity: 30 } },
    ],
  },
  medium: {
    name: 'Medium',
    description: 'Trim + Shorten for balanced compression',
    operations: [
      { type: 'trim', params: { intensity: 50 } },
      { type: 'shorten', params: { lang: 'EN', intensity: 50 } },
    ],
  },
  aggressive: {
    name: 'Aggressive',
    description: 'Shorten + Minify for maximum compression',
    operations: [
      { type: 'shorten', params: { lang: 'PT', intensity: 80 } },
      { type: 'minify', params: { intensity: 80 } },
    ],
  },
} as const;

export type TextPreset = keyof typeof TEXT_PRESETS;


export const TextOperationSchema = t.Union([
  t.Object({
    type: t.Literal('trim'),
    params: t.Optional(t.Object({
      intensity: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
    })),
  }),
  t.Object({
    type: t.Literal('shorten'),
    params: t.Optional(t.Object({
      lang: t.Optional(t.Union([t.Literal('EN'), t.Literal('PT')])),
      intensity: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
    })),
  }),
  t.Object({
    type: t.Literal('minify'),
    params: t.Optional(t.Object({
      intensity: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
    })),
  }),
  t.Object({
    type: t.Literal('compress'),
    params: t.Optional(t.Object({
      algo: t.Optional(t.Union([t.Literal('gzip'), t.Literal('brotli')])),
      intensity: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
    })),
  }),
  t.Object({
    type: t.Literal('json-to-toon'),
    params: t.Optional(t.Object({
      intensity: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
    })),
  }),
  t.Object({
    type: t.Literal('summarize'),
    params: t.Optional(t.Object({
      intensity: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
    })),
  }),
]);

export type TextOperation = Static<typeof TextOperationSchema>;

export const TextPresetSchema = t.Union([
  t.Literal('chill'),
  t.Literal('medium'),
  t.Literal('aggressive'),
]);

export interface ProcessTextInput {
  textUrl: string;
  preset?: TextPreset;
  operations?: TextOperation[];
}
