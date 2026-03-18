import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/app/components/ui/table'
import { Badge } from '@/app/components/ui/badge'
import type { RecentActivity } from '@/types'

interface RecentJobsTableProps {
  jobs: RecentActivity[]
}

const statusVariant = (status: string) =>
  status === 'success' ? 'bg-accent-light text-foreground' : 'bg-red-100 text-red-700'

export function RecentJobsTable({ jobs }: RecentJobsTableProps) {
  if (jobs.length === 0) {
    return (
      <div className="bg-background rounded-xl border border-border shadow-sm p-8 text-center">
        <p className="text-muted text-sm">No jobs yet.</p>
        <p className="text-muted text-xs mt-1">
          Try processing some{' '}
          <a href="/dashboard/text" className="underline text-foreground">text</a> or{' '}
          <a href="/dashboard/audio" className="underline text-foreground">audio</a>.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-background rounded-xl border border-border shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Latency</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job.id}>
              <TableCell className="font-medium">{job.type}</TableCell>
              <TableCell>
                <Badge className={`text-xs border-0 rounded-full ${statusVariant(job.status)}`}>
                  {job.status}
                </Badge>
              </TableCell>
              <TableCell className="text-muted text-sm">{job.size}</TableCell>
              <TableCell className="text-muted text-sm">{job.latency}</TableCell>
              <TableCell className="text-muted text-sm">{job.timestamp}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
