import type { JobPayload, Job, JobStatusView } from './job.types';
import { JobModel } from './job.model';

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

  async getStatus(jobId: string): Promise<JobStatusView | null> {
    const doc = await JobModel.findById(jobId);
    if (!doc) return null;

    return {
      id: doc._id.toString(),
      status: doc.status as Job['status'],
      error: doc.error ?? undefined,
      result: doc.result as JobStatusView['result'],
    };
  }

  async findByUserId(userId: string): Promise<Job[]> {
    const docs = await JobModel.find({ userId }).sort({ createdAt: -1 });
    return docs.map((doc) => this.toJob(doc));
  }

  async enqueue(job: Job): Promise<void> {
    const { queues } = await import('../../queues/queue');
    const jobDoc = await JobModel.findById(job.id);
    
    if (!jobDoc) return;

    const jobType = jobDoc.payload?.type as 'text' | 'audio';
    
    const queue = jobType === 'text' ? queues.text : queues.audio;

    await queue.add(jobType, {
      data: { jobId: job.id },
      metadata: { step: 'CREATED' },
    });
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
