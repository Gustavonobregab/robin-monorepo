// dashboard/app/http/image.ts
import { clientApi } from './api'
import type { ApiResponse, JobView, SubmitImageJobInput, ImagePresetDef } from '@/types'

export const submitImageJob = (input: SubmitImageJobInput, idempotencyKey?: string) =>
  clientApi
    .post('image', {
      json: input,
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    })
    .json<ApiResponse<JobView>>()
    .then((res) => res.data)

export const getImagePresets = () =>
  clientApi.get('image/presets').json<ApiResponse<ImagePresetDef[]>>()
