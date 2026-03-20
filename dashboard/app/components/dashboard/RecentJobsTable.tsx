'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/app/components/ui/table'
import { Pagination } from '@/app/components/ui/pagination'
import type { UsageEvent } from '@/types'

interface RecentJobsTableProps {
  jobs: UsageEvent[]
}

const PER_PAGE = 10

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function RecentJobsTable({ jobs }: RecentJobsTableProps) {
  const [page, setPage] = useState(1)

  if (jobs.length === 0) {
    return (
      <div className="bg-background rounded-xl border border-border shadow-sm p-8 text-center">
        <p className="text-muted text-sm">No jobs yet.</p>
        <p className="text-muted text-xs mt-1">
          Try processing some{' '}
          <Link href="/dashboard/text" className="underline text-foreground">text</Link> or{' '}
          <Link href="/dashboard/audio" className="underline text-foreground">audio</Link>.
        </p>
      </div>
    )
  }

  const totalPages = Math.ceil(jobs.length / PER_PAGE)
  
  const paged = jobs.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  return (
    <div className="bg-background rounded-xl border border-border shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Latency</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paged.map((job) => (
            <TableRow key={job._id}>
              <TableCell className="font-medium capitalize">{job.pipelineType}</TableCell>
              <TableCell className="text-muted text-sm">
                {formatBytes(job.inputBytes)} to {formatBytes(job.outputBytes)}
              </TableCell>
              <TableCell className="text-muted text-sm">{job.processingMs}ms</TableCell>
              <TableCell className="text-muted text-sm">
                {new Date(job.timestamp).toLocaleString('en-US', {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="py-2">
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  )
}
