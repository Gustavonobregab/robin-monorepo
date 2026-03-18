// dashboard/app/http/audio.ts
import { clientApi } from './api'
import type { ApiResponse, Job, SubmitAudioJobInput, AudioPresetDef, AudioOperationDef } from '@/types'

export const submitAudioJob = (input: SubmitAudioJobInput) =>
  clientApi.post('audio', { json: input }).json<ApiResponse<Job>>()

export const getAudioPresets = () =>
  clientApi.get('audio/presets').json<ApiResponse<AudioPresetDef[]>>()

export const getAudioOperations = () =>
  clientApi.get('audio/operations').json<ApiResponse<AudioOperationDef[]>>()
