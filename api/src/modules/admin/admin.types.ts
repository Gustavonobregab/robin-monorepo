import type { User } from '../users/users.types';

export interface AdminOverview {
  users: { total: number; new7d: number; new30d: number };
  subscriptions: {
    byPlan: { planName: string; count: number }[];
    active: number;
    pastDue: number;
    canceled: number;
  };
  jobs24h: { total: number; completed: number; failed: number; processing: number };
  usage7d: {
    events: number;
    creditsConsumed: number;
    inputBytes: number;
    outputBytes: number;
    byPipeline: { pipelineType: string; events: number; creditsConsumed: number }[];
  };
  webhooks7d: { deliveries: number; failed: number };
}

export interface AdminUserListItem {
  id: string;
  name: string;
  email: string;
  planName: string | null;
  subscriptionStatus: string | null;
  creditsUsed: number;
  creditsLimit: number;
  createdAt: Date;
  lastActivityAt: Date | null;
}

export interface AdminUserList {
  items: AdminUserListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminJobItem {
  id: string;
  type: string;
  status: string;
  createdAt: Date;
  processingMs: number | null;
}

export interface AdminUserDetail {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
    profile: User['profile'] | null;
    createdAt: Date;
  };
  subscription:
    | (Omit<NonNullable<User['subscription']>, 'gatewayCustomerIds' | 'gatewaySubscriptionId'> & {
        planName: string | null;
      })
    | null;
  keysCount: number;
  usage30d: { events: number; creditsConsumed: number; inputBytes: number; outputBytes: number };
  recentJobs: AdminJobItem[];
}

export interface AdminJobListItem extends AdminJobItem {
  userEmail: string | null;
  error: string | null;
}

export interface AdminJobList {
  items: AdminJobListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminDailyMetric {
  date: string;
  newUsers: number;
  jobs: number;
  jobsFailed: number;
  creditsConsumed: number;
  inputBytes: number;
  outputBytes: number;
}

export interface AdminMetrics {
  days: AdminDailyMetric[];
}

export interface AdminHealth {
  mongo: { ok: boolean; latencyMs: number };
  redis: { ok: boolean; latencyMs: number };
  queues: { name: string; waiting: number; active: number; failed: number; delayed: number }[];
  uptime: number;
}
