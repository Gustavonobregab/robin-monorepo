import { t } from "elysia";
import type { AudioPreset } from "../audio/audio.types";
import type { AudioOperation } from "../audio/audio.types";
import type { TextPreset } from "../text/text.types";
import type { TextOperation } from "../text/text.types";

export type JobStatus =
  | "created"
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export type JobType =
  | "audio"
  | "text"
  | "image"
  | "video";

export type JobSource =
  | { kind: "url"; url: string }
  | { kind: "storage"; ref: string }
  | { kind: "inline"; text: string };

export type JobPayload =
  | AudioJobPayload
  | TextJobPayload
  | ImageJobPayload
  | VideoJobPayload;

export type AudioJobPayload = {
  type: "audio";
  preset?: AudioPreset;
  source: { kind: "storage"; ref: string };
  operations: AudioOperation[];
  name?: string;
  creditCost?: number;   // credits reserved for this job, used for rollback on failure
  webhookUrl?: string;   // per-job override; falls back to user.webhookUrl
};

export type TextJobPayload = {
  type: "text";
  preset?: TextPreset;
  source: JobSource;
  operations: TextOperation[];
  creditCost?: number;   // credits reserved for this job, used for rollback on failure
  webhookUrl?: string;   // per-job override; falls back to user.webhookUrl
};

// Image and video pipelines are not implemented yet; payloads are typed
// ahead so the job surface (model, list, webhooks) is ready for them.
export type ImageJobPayload = {
  type: "image";
  preset?: string;
  source: { kind: "storage"; ref: string };
  operations: { type: string; params?: Record<string, unknown> }[];
  name?: string;
  creditCost?: number;
  webhookUrl?: string;
};

export type VideoJobPayload = {
  type: "video";
  preset?: string;
  source: { kind: "storage"; ref: string };
  operations: { type: string; params?: Record<string, unknown> }[];
  name?: string;
  creditCost?: number;
  webhookUrl?: string;
};
  
export type JobDocument = {
  userId: string;
  status: JobStatus;
  payload: JobPayload;
  completedAt?: Date;
  error?: string;
  result?: {
    outputKey?: string;
    outputText?: string;
    metrics?: Record<string, unknown>;
  };
  createdAt: Date;
  updatedAt: Date;
};

export type Job = {
  id: string;
  userId: string;
  status: JobStatus;
  createdAt: Date;
  updatedAt: Date;
  error?: string;
};

export type JobStatusView = {
  id: string;
  status: JobStatus;
  error?: string;
  result?: {
    outputUrl?: string;
    outputText?: string;
    metrics?: Record<string, unknown>;
  };
};

export type JobListItem = {
  id: string;
  type: JobType;
  status: JobStatus;
  name?: string;
  error?: string;
  metrics?: Record<string, unknown>;
  createdAt: Date;
  completedAt?: Date;
};

export type JobListQuery = {
  type?: JobType;
  status?: JobStatus;
  limit?: number;
  cursor?: string;
};

export const JobListQuerySchema = t.Object({
  type: t.Optional(
    t.Union([
      t.Literal('audio'),
      t.Literal('text'),
      t.Literal('image'),
      t.Literal('video'),
    ]),
  ),
  status: t.Optional(
    t.Union([
      t.Literal('created'),
      t.Literal('pending'),
      t.Literal('processing'),
      t.Literal('completed'),
      t.Literal('failed'),
    ]),
  ),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
  cursor: t.Optional(t.String({ pattern: '^[a-f0-9]{24}$' })),
});
