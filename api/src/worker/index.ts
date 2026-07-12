// Polyfill browser APIs required by pdfjs-dist
if (typeof (globalThis as Record<string, unknown>).DOMMatrix === 'undefined') {
  (globalThis as Record<string, unknown>).DOMMatrix = class DOMMatrix {};
}

import { Worker } from 'bullmq';
import { redisConnection } from '../config/redis';
import { connectDatabase } from '../config/database';
import { TEXT_QUEUE, type TextQueueJob } from '../queues/text.queue';
import { AUDIO_QUEUE, type AudioQueueJob } from '../queues/audio.queue';
import { IMAGE_QUEUE, type ImageQueueJob } from '../queues/image.queue';
import { WEBHOOK_QUEUE, type WebhookQueueJob } from '../queues/webhook.queue';
import textProcessor from './text.processor';
import audioProcessor from './audio.processor';
import imageProcessor from './image.processor';
import webhookProcessor from './webhook.processor';

await connectDatabase();

const textWorker = new Worker<TextQueueJob>(
  TEXT_QUEUE,
  textProcessor,
  {
    connection: redisConnection,
    concurrency: Number(process.env.TEXT_WORKER_CONCURRENCY ?? 10),
  },
);

const audioWorker = new Worker<AudioQueueJob>(
  AUDIO_QUEUE,
  audioProcessor,
  {
    connection: redisConnection,
    // ffmpeg is CPU-bound; keep this close to the core count of the host
    concurrency: Number(process.env.AUDIO_WORKER_CONCURRENCY ?? 4),
  },
);

const imageWorker = new Worker<ImageQueueJob>(
  IMAGE_QUEUE,
  imageProcessor,
  {
    connection: redisConnection,
    concurrency: Number(process.env.IMAGE_WORKER_CONCURRENCY ?? 4),
  },
);

const webhookWorker = new Worker<WebhookQueueJob>(
  WEBHOOK_QUEUE,
  webhookProcessor,
  {
    connection: redisConnection,
    concurrency: 5,
  },
);

const workers = [textWorker, audioWorker, imageWorker, webhookWorker];

for (const worker of workers) {
  worker.on('failed', (job, err) => {
    console.error(
      `[Worker] Job ${job?.data?.jobId ?? 'unknown'} failed (attempt ${job?.attemptsMade ?? '?'}): ${err.message}`,
    );
  });

  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.data.jobId} completed`);
  });
}

const shutdown = async (signal: string) => {
  console.log(`[Worker] ${signal} received, finishing active jobs...`);
  await Promise.all(workers.map((worker) => worker.close()));
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

console.log('[Worker] Ready - listening for jobs');
