// dashboard/app/lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// randomUUID only exists in secure contexts; getRandomValues exists everywhere
export function randomKey(): string {
  if (crypto.randomUUID) return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function triggerDownload(href: string, filename = '') {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  a.click()
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1)
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`
}

const DATE_TIME_FMT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

export function formatDateTime(date: string | Date): string {
  return DATE_TIME_FMT.format(new Date(date))
}

export function timeAgo(date: string | Date): string {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(date)
}

export function savedPercent(inputBytes?: number, outputBytes?: number): number | null {
  if (!inputBytes || outputBytes == null) return null
  return Math.max(0, Math.round((1 - outputBytes / inputBytes) * 100))
}

export function formatSaved(pct: number): string {
  return `−${pct}%`
}

export function downloadTextAsFile(text: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
  triggerDownload(url, filename)
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
