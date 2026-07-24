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
  keyPrefix?: string
  status: KeyStatus
  createdAt: string
  lastUsedAt?: string
}

// ─── Text ────────────────────────────────────────────────────
export type TextPreset = 'chill' | 'medium' | 'aggressive'

/* What the preset actually runs: params come back resolved, defaults included. */
export interface PresetOperation {
  type: string
  params?: Record<string, string | number | boolean>
}

export interface TextPresetDef {
  id: string
  name: string
  description: string
  operations: PresetOperation[]
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

// Unified processing contract: every compression request returns a job view;
// small inputs come back already completed (HTTP 200), queued ones as 202
export interface JobView {
  id: string
  status: JobStatus
  error?: string
  result?: {
    outputUrl?: string
    outputText?: string
    metrics?: JobMetrics
  }
}

export interface ImagePresetDef {
  id: string
  name: string
  description: string
  operations: PresetOperation[]
}

export type ImageOutputFormat = 'webp' | 'avif' | 'jpeg' | 'png'

export type ImageOperationInput =
  | { type: 'resize'; params: { width: number; height: number; fit: 'inside' } }
  | { type: 'encode'; params: { format: ImageOutputFormat; quality: number } }

export interface SubmitImageJobInput {
  imageId: string
  preset?: string
  operations?: ImageOperationInput[]
}

export type AudioPreset = 'chill' | 'medium' | 'aggressive' | 'podcast' | 'lecture'

export interface AudioPresetDef {
  id: string
  name: string
  description: string
  operations: PresetOperation[]
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

export type OnboardingRole = 'developer' | 'founder' | 'agency' | 'company'
export type OnboardingUseCase = 'text' | 'audio' | 'image'
export type OnboardingUsageMode = 'site' | 'api' | 'both'

export interface OnboardingProfile {
  role?: OnboardingRole
  useCases?: OnboardingUseCase[]
  usageMode?: OnboardingUsageMode
  onboardingCompletedAt?: string
}

export interface UserProfile {
  name: string
  email: string
  image?: string
  createdAt: string
  totalRequests: number
  webhookUrl: string | null
  profile: OnboardingProfile | null
  onboardingCompleted: boolean
  isSuperAdmin?: boolean
  plan: PlanSummary | null
  subscription: SubscriptionSummary | null
  currentUsage: CurrentUsage
}

// ─── Webhooks ────────────────────────────────────────────────
export type WebhookDeliveryStatus = 'success' | 'failed'

export interface WebhookDelivery {
  id: string
  jobId: string
  event: 'job.completed' | 'job.failed'
  url: string
  attempt: number
  status: WebhookDeliveryStatus
  httpStatus?: number
  error?: string
  durationMs: number
  createdAt: string
}

export interface WebhookDeliveryListResponse {
  items: WebhookDelivery[]
  nextCursor: string | null
}

// ─── Auth ─────────────────────────────────────────────────────
export interface User {
  id: string
  name: string
  email: string
}

// ─── Admin ───────────────────────────────────────────────────
export interface AdminOverview {
  users: { total: number; new7d: number; new30d: number }
  subscriptions: {
    byPlan: { planName: string; count: number }[]
    active: number
    pastDue: number
    canceled: number
  }
  jobs24h: { total: number; completed: number; failed: number; processing: number }
  usage7d: {
    events: number
    creditsConsumed: number
    inputBytes: number
    outputBytes: number
    byPipeline: { pipelineType: JobPipeline; events: number; creditsConsumed: number }[]
  }
  webhooks7d: { deliveries: number; failed: number }
}

export interface AdminUserListItem {
  id: string
  name: string
  email: string
  planName: string | null
  subscriptionStatus: string | null
  creditsUsed: number
  creditsLimit: number
  createdAt: string
  lastActivityAt: string | null
}

export interface AdminUserListResponse {
  items: AdminUserListItem[]
  total: number
  page: number
  limit: number
}

export interface AdminUserDetail {
  user: {
    id: string
    name: string
    email: string
    emailVerified: boolean
    image?: string
    profile: OnboardingProfile | null
    createdAt: string
  }
  subscription:
    | ({ planName: string; status: string; credits: { limit: number; used: number } } & Record<
        string,
        unknown
      >)
    | null
  keysCount: number
  usage30d: { events: number; creditsConsumed: number; inputBytes: number; outputBytes: number }
  recentJobs: {
    id: string
    type: JobPipeline
    status: JobStatus
    createdAt: string
    processingMs: number | null
  }[]
}

export interface AdminJobListItem {
  id: string
  userEmail: string
  type: JobPipeline
  status: JobStatus
  createdAt: string
  processingMs: number | null
  error?: string
}

export interface AdminJobListResponse {
  items: AdminJobListItem[]
  total: number
  page: number
  limit: number
}

export interface AdminMetricsDay {
  date: string
  newUsers: number
  jobs: number
  jobsFailed: number
  creditsConsumed: number
  inputBytes: number
  outputBytes: number
}

export interface AdminMetrics {
  days: AdminMetricsDay[]
}

export interface AdminQueueCounts {
  name: string
  waiting: number
  active: number
  failed: number
  delayed: number
}

export interface AdminHealth {
  mongo: { ok: boolean; latencyMs: number }
  redis: { ok: boolean; latencyMs: number }
  queues: AdminQueueCounts[]
  uptime: number
}
