import type { JobPayload, Job, JobStatusView, JobListItem, JobListQuery } from './job.types';
import { JobModel } from './job.model';
import { getSignedDownloadUrl } from '../../config/storage';

const OBJECT_ID = /^[a-f0-9]{24}$/;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const MAX_WAIT_SECONDS = 30;
const WAIT_POLL_INTERVAL_MS = 500;

export class JobService {
  async create(input: { userId: string; payload: JobPayload; idempotencyKey?: string }): Promise<Job> {
    const doc = await JobModel.create({
      userId: input.userId,
      status: 'created',
      payload: input.payload,
      ...(input.idempotencyKey && { idempotencyKey: input.idempotencyKey }),
    });

    return this.toJob(doc);
  }

  // One unit: a job left behind by a failed enqueue never runs, yet its key answers every retry
  async createAndEnqueue(input: {
    userId: string;
    payload: JobPayload;
    idempotencyKey?: string;
  }): Promise<JobStatusView> {
    const job = await this.create(input);

    try {
      await this.enqueue(job.id, input.payload.type as 'text' | 'audio');
      return { id: job.id, status: job.status };
    } catch (err) {
      await JobModel.deleteOne({ _id: job.id });
      throw err;
    }
  }

  // Synchronous results are jobs born completed: same contract, same history
  async createCompleted(input: {
    userId: string;
    payload: JobPayload;
    result: { outputText?: string; metrics?: Record<string, unknown> };
  }): Promise<JobStatusView> {
    const doc = await JobModel.create({
      userId: input.userId,
      status: 'completed',
      completedAt: new Date(),
      payload: input.payload,
      result: input.result,
    });

    return { id: doc._id.toString(), status: 'completed', result: input.result };
  }

  async findByIdempotencyKey(userId: string, idempotencyKey: string): Promise<Job | null> {
    const doc = await JobModel.findOne({ userId, idempotencyKey });
    return doc ? this.toJob(doc) : null;
  }

  async findById(jobId: string): Promise<Job | null> {
    const doc = await JobModel.findById(jobId);
    return doc ? this.toJob(doc) : null;
  }

  async getStatus(userId: string, jobId: string, waitSeconds = 0): Promise<JobStatusView | null> {
    if (!OBJECT_ID.test(jobId)) return null;

    if (waitSeconds > 0) {
      const found = await this.waitForTerminal(userId, jobId, Math.min(waitSeconds, MAX_WAIT_SECONDS));
      if (!found) return null;
    }

    const doc = await JobModel.findOne({ _id: jobId, userId }).lean();
    if (!doc) return null;

    return {
      id: doc._id.toString(),
      status: doc.status as Job['status'],
      error: doc.error ?? undefined,
      result: await this.toResultView(doc.result),
    };
  }

  private async waitForTerminal(userId: string, jobId: string, waitSeconds: number): Promise<boolean> {
    const deadline = Date.now() + waitSeconds * 1000;

    while (true) {
      const doc = await JobModel.findOne({ _id: jobId, userId }).select('status').lean();
      if (!doc) return false;
      if (doc.status === 'completed' || doc.status === 'failed') return true;
      if (Date.now() + WAIT_POLL_INTERVAL_MS >= deadline) return true;
      await new Promise((resolve) => setTimeout(resolve, WAIT_POLL_INTERVAL_MS));
    }
  }

  async list(userId: string, query: JobListQuery): Promise<{ items: JobListItem[]; nextCursor: string | null }> {
    const limit = Math.min(query.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    const docs = await JobModel.find({
      userId,
      ...(query.type && { 'payload.type': query.type }),
      ...(query.status && { status: query.status }),
      ...(query.cursor && OBJECT_ID.test(query.cursor) && { _id: { $lt: query.cursor } }),
    })
      // Skips the heavy fields: inline input runs to 5MB per job
      .select('status error createdAt completedAt payload.type payload.name result.metrics')
      .sort({ _id: -1 })
      .limit(limit + 1)
      .lean();

    const page = docs.slice(0, limit);

    return {
      items: page.map((doc) => ({
        id: doc._id.toString(),
        type: doc.payload?.type as JobListItem['type'],
        status: doc.status as JobListItem['status'],
        name: doc.payload?.name ?? undefined,
        error: doc.error ?? undefined,
        metrics: doc.result?.metrics as JobListItem['metrics'],
        createdAt: doc.createdAt,
        completedAt: doc.completedAt ?? undefined,
      })),
      nextCursor: docs.length > limit ? page[page.length - 1]._id.toString() : null,
    };
  }

  private async toResultView(
    result?: { outputKey?: string | null; outputText?: string | null; metrics?: unknown } | null,
  ): Promise<JobStatusView['result']> {
    if (!result || (!result.outputKey && !result.outputText && !result.metrics)) return undefined;

    return {
      outputText: result.outputText ?? undefined,
      outputUrl: result.outputKey ? await getSignedDownloadUrl(result.outputKey) : undefined,
      metrics: result.metrics as Record<string, unknown> | undefined,
    };
  }

  async enqueue(jobId: string, type: 'text' | 'audio'): Promise<void> {
    const { queues } = await import('../../queues/queue');
    const queue = type === 'text' ? queues.text : queues.audio;

    await queue.add(type, { jobId }, { jobId });
  }

  private toJob(doc: any): Job {
    return {
      id: doc._id.toString(),
      userId: doc.userId,
      status: doc.status,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      error: doc.error,
    };
  }
}

export const jobService = new JobService();
