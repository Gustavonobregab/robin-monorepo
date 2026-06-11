// dashboard/app/http/upload.ts
import { clientApi } from './api'
import type { ApiResponse, CreateUploadResponse } from '@/types'

export const uploadFile = async (file: File): Promise<{ id: string }> => {
  const { data } = await clientApi
    .post('upload', { json: { filename: file.name, size: file.size } })
    .json<ApiResponse<CreateUploadResponse>>()

  const res = await fetch(data.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': data.contentType },
    body: file,
  })

  if (!res.ok) throw new Error(`Upload failed with status ${res.status}`)

  return { id: data.id }
}
