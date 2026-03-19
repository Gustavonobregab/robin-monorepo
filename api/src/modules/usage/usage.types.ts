import type { ObjectId } from 'mongoose';

export type PipelineType = 'audio' | 'text' | 'image' | 'video';

// --- Per-pipeline metadata ---

export interface AudioMetadata {
  durationMs: number;
  format: string;
  sampleRate: number;
  channels: number;
}

export interface TextMetadata {
  characterCount: number;
  wordCount: number;
  encoding: string;
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  megapixels: number;
}

export interface VideoMetadata {
  durationMs: number;
  width: number;
  height: number;
  format: string;
  fps: number;
  codec: string;
}

// --- UsageEvent document ---

export interface UsageEvent {
  _id: ObjectId;
  idempotencyKey: string;
  userId: string;
  jobId: string;
  pipelineType: PipelineType;
  operations: string[];
  inputBytes: number;
  outputBytes: number;
  processingMs: number;
  timestamp: Date;
  audio?: AudioMetadata;
  text?: TextMetadata;
  image?: ImageMetadata;
  video?: VideoMetadata;
}

// --- Service input/output ---

export interface RecordUsageInput {
  idempotencyKey: string;
  userId: string;
  jobId: string;
  pipelineType: PipelineType;
  operations: string[];
  inputBytes: number;
  outputBytes: number;
  processingMs: number;
  audio?: AudioMetadata;
  text?: TextMetadata;
  image?: ImageMetadata;
  video?: VideoMetadata;
}

export interface RecordUsageResult {
  eventId: string;
}

// --- Analytics ---

export type TimeRange = '7d' | '30d' | '90d' | '1y';

export interface PipelineUsageSummary {
  requests: number;
  totalInputBytes: number;
  totalOutputBytes: number;
}

export interface AudioPipelineSummary extends PipelineUsageSummary {
  totalMinutes: number;
}

export interface TextPipelineSummary extends PipelineUsageSummary {
  totalCharacters: number;
  totalWords: number;
}

export interface ImagePipelineSummary extends PipelineUsageSummary {
  totalMegapixels: number;
}

export interface VideoPipelineSummary extends PipelineUsageSummary {
  totalMinutes: number;
}

export interface UsageAnalytics {
  summary: {
    totalRequests: number;
    totalInputBytes: number;
    totalOutputBytes: number;
    byPipeline: {
      audio?: AudioPipelineSummary;
      text?: TextPipelineSummary;
      image?: ImagePipelineSummary;
      video?: VideoPipelineSummary;
    };
  };
  chart: { date: string; requests: number }[];
  recent: UsageEvent[];
}

export interface CurrentUsage {
  period: { start: Date; end: Date };
  audio: { requests: number; minutes: number; inputBytes: number };
  text: { requests: number; characters: number; inputBytes: number };
  image: { requests: number; megapixels: number; inputBytes: number };
  video: { requests: number; minutes: number; inputBytes: number };
}

// Default free tier (500MB) — kept for users.model.ts schema default
export const DEFAULT_TOKENS_LIMIT = 500_000_000;
