import { isTerminalStatus, type JobStatusView } from './job.types';

// The processing-endpoint contract: 202 while the job is in flight, 200 once terminal
export function jobResponse(set: { status?: number | string }, job: JobStatusView): JobStatusView {
  if (!isTerminalStatus(job.status)) set.status = 202;
  return job;
}
