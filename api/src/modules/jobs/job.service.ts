import type { JobPayload, Job, JobStatusView, JobListItem, JobListQuery } from './job.types';
import { JobModel } from './job.model';
import { getSignedDownloadUrl } from '../../config/storage';

const OBJECT_ID = /^[a-f0-9]{24}$/;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export class JobService {
  async create(input: { userId: string; payload: JobPayload }): Promise<Job> {
    const doc = await JobModel.create({
      userId: input.userId,
      status: 'created',
      payload: input.payload,
    });

    return this.toJob(doc);
  }

  async findById(jobId: string): Promise<Job | null> {
    const doc = await JobModel.findById(jobId);
    return doc ? this.toJob(doc) : null;
  }

  async getStatus(userId: string, jobId: string): Promise<JobStatusView | null> {
    if (!OBJECT_ID.test(jobId)) return null;

    const doc = await JobModel.findOne({ _id: jobId, userId }).lean();
    if (!doc) return null;

    return {
      id: doc._id.toString(),
      status: doc.status as Job['status'],
      error: doc.error ?? undefined,
      result: await this.toResultView(doc.result),
    };
  }

  async list(userId: string, query: JobListQuery): Promise<{ items: JobListItem[]; nextCursor: string | null }> {
    const limit = Math.min(query.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    const docs = await JobModel.find({
      userId,
      ...(query.type && { 'payload.type': query.type }),
      ...(query.status && { status: query.status }),
      ...(query.cursor && OBJECT_ID.test(query.cursor) && { _id: { $lt: query.cursor } }),
    })
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

    await queue.add(
      type,
      {
        data: { jobId },
        metadata: { step: 'CREATED' },
      },
      { jobId },
    );
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
