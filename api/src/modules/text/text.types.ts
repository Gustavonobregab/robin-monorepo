import { t, type Static } from 'elysia';


export const TEXT_OPERATIONS = {
  'trim': {
    name: 'Trim',
    description: 'Whitespace, punctuation and unicode cleanup — lossless for meaning',
    params: {
      intensity: { type: 'number', min: 0, max: 100, default: 50 },
    },
  },
  'json-to-toon': {
    name: 'JSON to TOON',
    description: 'Convert large JSON blocks to TOON tabular notation (skips blocks too small to benefit)',
    params: {},
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
    description: 'Full cleanup: whitespace, punctuation and unicode normalization',
    operations: [
      { type: 'trim', params: { intensity: 70 } },
    ],
  },
  aggressive: {
    name: 'Aggressive',
    description: 'Full cleanup + JSON blocks converted to TOON',
    operations: [
      { type: 'trim', params: { intensity: 80 } },
      { type: 'json-to-toon' },
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
    type: t.Literal('json-to-toon'),
  }),
]);

export type TextOperation = Static<typeof TextOperationSchema>;

export const TextPresetSchema = t.Union([
  t.Literal('chill'),
  t.Literal('medium'),
  t.Literal('aggressive'),
]);

export interface ProcessTextInput {
  text?: string;
  fileId?: string;
  preset?: TextPreset;
  operations?: TextOperation[];
  webhookUrl?: string;
  idempotencyKey?: string;
}
