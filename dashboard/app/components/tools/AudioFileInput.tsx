'use client'

import { useRef, useState } from 'react'
import { Label } from '@/app/components/ui/label'

interface AudioFileInputProps {
  file: File | null
  onChange: (file: File | null) => void
}

const ACCEPTED = '.mp3,.wav'
const MAX_SIZE_MB = 100

export function AudioFileInput({ file, onChange }: AudioFileInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  function handleFile(f: File | undefined) {
    if (!f) return
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      onChange(null)
      return
    }
    onChange(f)
  }

  return (
    <div className="space-y-1.5">
      <Label>Audio file</Label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          handleFile(e.dataTransfer.files[0])
        }}
        className={`
          flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed
          px-4 py-8 text-sm transition-colors cursor-pointer
          ${dragOver
            ? 'border-accent-strong bg-accent-strong/5'
            : file
              ? 'border-accent-strong/40 bg-accent-strong/5'
              : 'border-border hover:border-muted-foreground/40'
          }
        `}
      >
        {file ? (
          <>
            <span className="font-medium text-foreground">{file.name}</span>
            <span className="text-xs text-muted">
              {(file.size / 1024 / 1024).toFixed(1)} MB
            </span>
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" x2="12" y1="3" y2="15" />
            </svg>
            <span className="text-muted">Drop an audio file here or click to browse</span>
            <span className="text-xs text-muted">.mp3 or .wav, up to {MAX_SIZE_MB}MB</span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  )
}
