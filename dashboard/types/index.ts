// dashboard/types/index.ts

// ─── Generic API wrapper ──────────────────────────────────────
export type ApiResponse<T> = { data: T }

// ─── Jobs ────────────────────────────────────────────────────
export type JobStatus = 'created' | 'pending' | 'processing' | 'completed' | 'failed'

export interface JobMetrics {
  inputSize: number
  outputSize: number
  compressionRatio: number
  operationsApplied: string[]
}

export interface Job {
  _id: string
  userId: string
  status: JobStatus
  payload: {
    type: 'audio' | 'text'
    operations: object[]
    preset?: string
  }
  result?: {
    outputUrl?: string
    metrics?: JobMetrics
  }
  error?: string
  completedAt?: string
  createdAt: string
}

// ─── Usage ───────────────────────────────────────────────────
export interface UsageStats {
  totalRequests: number
  tokensSaved: number
  tokensUsed: number
}

export interface UsageChartPoint {
  date: string
  requests: number
}

export interface UsageBreakdownItem {
  type: string
  count: number
  percentage: number
}

export interface RecentActivity {
  id: string
  type: string
  status: string
  size: string
  latency: string
  timestamp: string
}

export interface UsageAnalytics {
  stats: UsageStats
  chart: UsageChartPoint[]
  breakdown: UsageBreakdownItem[]
  recent: RecentActivity[]
}

export interface CurrentUsage {
  tokensLimit: number
  tokensUsed: number
  tokensRemaining: number
}

// ─── API Keys ────────────────────────────────────────────────
export type KeyStatus = 'active' | 'revoked'

export interface ApiKey {
  _id: string
  name: string
  key: string
  status: KeyStatus
  createdAt: string
  lastUsedAt?: string
}

// ─── Text ────────────────────────────────────────────────────
export type TextPreset = 'chill' | 'medium' | 'aggressive'

export interface TextPresetDef {
  id: string
  name: string
  description: string
  operations: string[]
}

export interface TextOperationParamDef {
  type: 'number' | 'string'
  min?: number
  max?: number
  default: number | string
}

export interface TextOperationDef {
  id: string
  name: string
  description: string
  params: Record<string, TextOperationParamDef>
}

export interface TextOperationInput {
  type: string
  params?: Record<string, number | string>
}

export interface SubmitTextJobInput {
  textUrl: string
  preset?: TextPreset
  operations?: TextOperationInput[]
}

// ─── Audio ───────────────────────────────────────────────────
export type AudioPreset = 'chill' | 'medium' | 'aggressive' | 'podcast' | 'lecture'

export interface AudioPresetDef {
  id: string
  name: string
  description: string
  operations: string[]
}

export interface AudioOperationParamDef {
  type: 'number' | 'string' | 'boolean'
  min?: number
  max?: number
  default: number | string | boolean
}

export interface AudioOperationDef {
  id: string
  name: string
  description: string
  params: Record<string, AudioOperationParamDef>
}

export interface AudioOperationInput {
  type: string
  params?: Record<string, number | string | boolean>
}

export interface UploadAudioResponse {
  id: string
  originalName: string
  size: number
  expiresAt: string
}

export interface SubmitAudioJobInput {
  audioId: string
  preset?: AudioPreset
  operations?: AudioOperationInput[]
}

// ─── Auth ─────────────────────────────────────────────────────
export interface User {
  id: string
  name: string
  email: string
}
