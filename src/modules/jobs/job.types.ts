import type { AudioPreset } from "../audio/audio.types";
import type { AudioOperation } from "../audio/audio.types";
import type { TextPreset } from "../text/text.types";
import type { TextOperation } from "../text/text.types";

export type JobStatus =
  | "created"
  | "queued"
  | "running"
  | "succeeded"
  | "failed";
  
export type JobType = 
  | 'audio' 
  | 'text' 
  | 'video' 
  | 'image';

  export type JobSource =
  | { kind: "url"; url: string }
  | { kind: "storage"; ref: string };

export type JobPayload = AudioJobPayload | TextJobPayload | ImageJobPayload;

  export type AudioJobPayload = {
    type: "audio";
    preset?: AudioPreset;
    source: JobSource;
    operations: AudioOperation[];
    name?: string;
  };
  
  export type TextJobPayload = {
    type: "text";
    preset?: TextPreset;
    source: JobSource;
    operations: TextOperation[];
  };
  
  export type ImageJobPayload = {
    type: "image";
    preset?: string;
    source: JobSource;
    operations: any[];
  };

  export type VideoJobPayload = {
    type: "video";
    preset?: string;
    source: JobSource;
    operations: any[];
  };
  
  export type JobDocument = {
    userId: string;
    status: JobStatus;
    payload: JobPayload;
    completedAt?: Date;
    error?: string;
    result?: {
      outputUrl?: string;
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
      metrics?: Record<string, unknown>;
    };
  };
    