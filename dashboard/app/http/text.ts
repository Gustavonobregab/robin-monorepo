// dashboard/app/http/text.ts
import { clientApi } from './api'
import type { ApiResponse, SubmitTextJobInput, TextPresetDef, TextOperationDef, TextProcessResult } from '@/types'

export const submitTextJob = (input: SubmitTextJobInput, idempotencyKey?: string) =>
  clientApi
    .post('text', {
      json: input,
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    })
    .json<ApiResponse<TextProcessResult>>()

export const getTextPresets = () =>
  clientApi.get('text/presets').json<ApiResponse<TextPresetDef[]>>()

export const getTextOperations = () =>
  clientApi.get('text/operations').json<ApiResponse<TextOperationDef[]>>()
