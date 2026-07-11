import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';
import { TEXT_QUEUE, type TextQueueJob } from './text.queue';
import { AUDIO_QUEUE, type AudioQueueJob } from './audio.queue';
import { WEBHOOK_QUEUE, type WebhookQueueJob } from './webhook.queue';

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 5000, 
  },
  removeOnComplete: { age: 60 * 60 * 24 }, 
  removeOnFail: { age: 60 * 60 * 24 * 7 },
};

const textQueue = new Queue<TextQueueJob>(TEXT_QUEUE, {
  connection: redisConnection,
  defaultJobOptions,
});

const audioQueue = new Queue<AudioQueueJob>(AUDIO_QUEUE, {
  connection: redisConnection,
  defaultJobOptions,
});

const webhookQueue = new Queue<WebhookQueueJob>(WEBHOOK_QUEUE, {
  connection: redisConnection,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 5,
    backoff: {
      type: 'exponential' as const,
      delay: 15_000,
    },
  },
});

export const queues = {
  text: textQueue,
  audio: audioQueue,
  webhook: webhookQueue,
};
