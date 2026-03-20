// dashboard/app/http/text.ts
import { clientApi } from './api'
import type { ApiResponse, SubmitTextJobInput, TextPresetDef, TextOperationDef, TextProcessResult, UploadAudioResponse } from '@/types'

export const submitTextJob = (input: SubmitTextJobInput) =>
  clientApi.post('text', { json: input }).json<ApiResponse<TextProcessResult>>()

export const uploadDocument = (file: File) => {
  const form = new FormData()

  form.append('file', file)
  
  return clientApi.post('upload/document', { body: form }).json<ApiResponse<UploadAudioResponse>>()
}

export const getTextPresets = () =>
  clientApi.get('text/presets').json<ApiResponse<TextPresetDef[]>>()

export const getTextOperations = () =>
  clientApi.get('text/operations').json<ApiResponse<TextOperationDef[]>>()
