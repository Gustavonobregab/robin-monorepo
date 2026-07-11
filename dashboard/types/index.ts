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
  id: string
  userId: string
  status: JobStatus
  payload: {
    type: 'audio' | 'text'
    operations: object[]
    preset?: string
  }
  result?: {
    outputUrl?: string
    outputText?: string
    metrics?: JobMetrics
  }
  error?: string
  completedAt?: string
  createdAt: string
}

export type JobPipeline = 'audio' | 'text' | 'image' | 'video'

export interface JobListItem {
  id: string
  type: JobPipeline
  status: JobStatus
  name?: string
  error?: string
  metrics?: JobMetrics
  createdAt: string
  completedAt?: string
}

export interface JobListResponse {
  items: JobListItem[]
  nextCursor: string | null
}

// ─── Usage ───────────────────────────────────────────────────
export interface UsageChartPoint {
  date: string
  requests: number
}

export interface UsageEvent {
  _id: string
  idempotencyKey: string
  userId: string
  jobId: string
  pipelineType: 'audio' | 'text' | 'image' | 'video'
  operations: string[]
  inputBytes: number
  outputBytes: number
  processingMs: number
  timestamp: string
  audio?: {
    durationMs: number
    format: string
    sampleRate: number
    channels: number
  }
  text?: {
    characterCount: number
    wordCount: number
    encoding: string
  }
  image?: {
    width: number
    height: number
    format: string
    megapixels: number
  }
  video?: {
    durationMs: number
    width: number
    height: number
    format: string
    fps: number
    codec: string
  }
}

export interface PipelineUsageSummary {
  requests: number
  totalInputBytes: number
  totalOutputBytes: number
}

export interface UsageAnalytics {
  summary: {
    totalRequests: number
    totalInputBytes: number
    totalOutputBytes: number
    byPipeline: {
      audio?: PipelineUsageSummary & { totalMinutes: number }
      text?: PipelineUsageSummary & { totalCharacters: number; totalWords: number }
      image?: PipelineUsageSummary & { totalMegapixels: number }
      video?: PipelineUsageSummary & { totalMinutes: number }
    }
  }
  chart: UsageChartPoint[]
  recent: UsageEvent[]
}

export interface CurrentUsage {
  period: { start: string; end: string }
  audio: { requests: number; minutes: number; inputBytes: number }
  text: { requests: number; characters: number; inputBytes: number }
  image: { requests: number; megapixels: number; inputBytes: number }
  video: { requests: number; minutes: number; inputBytes: number }
}

// ─── Plans ───────────────────────────────────────────────────
export interface CreditWeight {
  credits: number
  perUnitBytes: number
}

export interface PublicPlan {
  _id: string
  name: string
  slug: string
  description?: string
  credits: number
  creditWeights: {
    text: CreditWeight
    audio: CreditWeight
    image: CreditWeight
    video: CreditWeight
  }
  prices: { brl?: number; usd?: number }
  features: {
    maxFileSize: number
    maxApiKeys: number
    webhooks: boolean
  }
}

// ─── API Keys ────────────────────────────────────────────────
export type KeyStatus = 'active' | 'revoked'

export interface ApiKey {
  _id: string
  name: string
  keyPrefix: string
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
  text?: string
  fileId?: string
  preset?: TextPreset
  operations?: TextOperationInput[]
}

export interface TextSyncResult {
  sync: true
  output: string
  metrics: JobMetrics
}

export interface TextAsyncResult {
  sync: false
  job: Job
}

export type TextProcessResult = TextSyncResult | TextAsyncResult

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

export interface CreateUploadResponse {
  id: string
  uploadUrl: string
  contentType: string
  uploadUrlExpiresIn: number
  expiresAt: string
}

export interface SubmitAudioJobInput {
  audioId: string
  preset?: AudioPreset
  operations?: AudioOperationInput[]
}

// ─── Billing ─────────────────────────────────────────────────
export interface PlanSummary {
  name: string
  slug: string
  credits: number
}

export interface SubscriptionSummary {
  status: 'active' | 'canceled'
  credits: { limit: number; used: number }
  currentPeriodStart: string
  currentPeriodEnd: string
}

export interface UserProfile {
  name: string
  email: string
  image?: string
  createdAt: string
  totalRequests: number
  webhookUrl: string | null
  webhooksEnabled: boolean
  plan: PlanSummary | null
  subscription: SubscriptionSummary | null
  currentUsage: CurrentUsage
}

// ─── Auth ─────────────────────────────────────────────────────
export interface User {
  id: string
  name: string
  email: string
}
