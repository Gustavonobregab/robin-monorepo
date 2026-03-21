// Polyfill browser APIs required by pdfjs-dist
if (typeof (globalThis as Record<string, unknown>).DOMMatrix === 'undefined') {
  (globalThis as Record<string, unknown>).DOMMatrix = class DOMMatrix {};
}

import { Worker } from 'bullmq';
import { redisConnection } from '../config/redis';
import { connectDatabase } from '../config/database';
import { TEXT_QUEUE, type TextQueueJob } from '../queues/text.queue';
import { AUDIO_QUEUE, type AudioQueueJob } from '../queues/audio.queue';
import textProcessor from './text.processor';
import audioProcessor from './audio.processor';

await connectDatabase();

const textWorker = new Worker<TextQueueJob>(
  TEXT_QUEUE,
  textProcessor,
  {
    connection: redisConnection,
  },
);

const audioWorker = new Worker<AudioQueueJob>(
  AUDIO_QUEUE,
  audioProcessor,
  {
    connection: redisConnection,
  },
);

for (const worker of [textWorker, audioWorker]) {
  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.data.data.jobId} failed: ${err.message}`);
  });

  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.data.data.jobId} completed`);
  });
}

console.log('[Worker] Ready - listening for jobs');
