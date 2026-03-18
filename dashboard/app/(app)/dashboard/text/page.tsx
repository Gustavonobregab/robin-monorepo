// dashboard/app/(app)/dashboard/text/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/app/components/ui/button'
import { ToolLayout } from '@/app/components/tools/ToolLayout'
import { UrlInput } from '@/app/components/tools/UrlInput'
import { PresetSelector } from '@/app/components/tools/PresetSelector'
import { MetricsPanel } from '@/app/components/tools/MetricsPanel'
import { useJobPoll } from '@/app/hooks/use-job-poll'
import { submitTextJob } from '@/app/http/text'
import { getTextJobStatus } from '@/app/http/jobs'
import type { TextPreset } from '@/types'

const TEXT_PRESETS = [
  { value: 'chill', label: 'Chill', description: 'Light cleanup, just trim whitespace' },
  { value: 'medium', label: 'Medium', description: 'Trim + Shorten for balanced compression' },
  { value: 'aggressive', label: 'Aggressive', description: 'Shorten + Minify for maximum compression' },
]

export default function TextPage() {
  const [url, setUrl] = useState('')
  const [preset, setPreset] = useState<TextPreset>('medium')
  const [jobId, setJobId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { job, isPolling, isCompleted, isFailed, timedOut } = useJobPoll({
    jobId,
    fetcher: getTextJobStatus,
  })

  async function handleSubmit() {
    if (!url) return toast.error('Please enter a URL')
    setJobId(null)
    setSubmitting(true)
    try {
      const res = await submitTextJob({ textUrl: url, preset })
      setJobId(res.data._id)
    } catch {
      toast.error('Failed to submit job. Check your API key and URL.')
    } finally {
      setSubmitting(false)
    }
  }

  // Show error toast once when job transitions to failed (not on every render)
  useEffect(() => {
    if (isFailed) toast.error(job?.error ?? 'Job failed')
  }, [isFailed]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ToolLayout
      title="Text compression"
      description="Compress a text file using a preset. Paste a public URL to your file."
      inputPanel={
        <UrlInput
          value={url}
          onChange={setUrl}
          placeholder="https://example.com/my-text.txt"
          label="Text file URL"
        />
      }
      settingsPanel={<PresetSelector presets={TEXT_PRESETS} value={preset} onChange={setPreset} />}
      outputPanel={
        <MetricsPanel
          status={job?.status}
          metrics={job?.result?.metrics}
          error={job?.error}
          timedOut={timedOut}
        />
      }
      action={
        <Button
          onClick={handleSubmit}
          disabled={submitting || isPolling}
          className="rounded-full bg-accent-strong text-foreground hover:bg-accent-light"
        >
          {submitting || isPolling ? 'Processing…' : 'Compress'}
        </Button>
      }
    />
  )
}
