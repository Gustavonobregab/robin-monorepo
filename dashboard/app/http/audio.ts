// dashboard/app/http/audio.ts
import { clientApi } from './api'
import type { ApiResponse, JobView, SubmitAudioJobInput, AudioPresetDef, AudioOperationDef } from '@/types'

export const submitAudioJob = (input: SubmitAudioJobInput, idempotencyKey?: string) =>
  clientApi
    .post('audio', {
      json: input,
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    })
    .json<ApiResponse<JobView>>()
    .then((res) => res.data)

export const getAudioPresets = () =>
  clientApi.get('audio/presets').json<ApiResponse<AudioPresetDef[]>>()

export const getAudioOperations = () =>
  clientApi.get('audio/operations').json<ApiResponse<AudioOperationDef[]>>()
