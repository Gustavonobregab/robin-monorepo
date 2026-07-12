// dashboard/app/http/text.ts
import { clientApi } from './api'
import type { ApiResponse, SubmitTextJobInput, TextPresetDef, TextOperationDef, JobView } from '@/types'

export const submitTextJob = (input: SubmitTextJobInput, idempotencyKey?: string) =>
  clientApi
    .post('text', {
      json: input,
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    })
    .json<ApiResponse<JobView>>()
    .then((res) => res.data)

export const getTextPresets = () =>
  clientApi.get('text/presets').json<ApiResponse<TextPresetDef[]>>()

export const getTextOperations = () =>
  clientApi.get('text/operations').json<ApiResponse<TextOperationDef[]>>()
