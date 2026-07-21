'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { encodeWav } from '@/app/lib/wav'

export type RecorderStatus = 'idle' | 'recording' | 'processing'

const ERROR_MESSAGES: Record<string, string> = {
  NotAllowedError: 'Microphone access was denied. Allow it in your browser settings and try again.',
  NotFoundError: 'No microphone found. Connect one and try again.',
  NotReadableError: 'Your microphone is in use by another app.',
}

export function useAudioRecorder({
  maxSeconds = 300,
  onRecorded,
  onError,
}: {
  maxSeconds?: number
  onRecorded: (file: File) => void
  onError: (message: string) => void
}) {
  const [status, setStatus] = useState<RecorderStatus>('idle')
  const [seconds, setSeconds] = useState(0)
  const [supported, setSupported] = useState(false)

  const recorder = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const chunks = useRef<Blob[]>([])
  const callbacks = useRef({ onRecorded, onError })
  callbacks.current = { onRecorded, onError }

  // getUserMedia is absent on the server and outside secure contexts; probe after mount so SSR matches
  useEffect(() => {
    setSupported(
      typeof MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia),
    )
  }, [])

  const releaseMic = useCallback(() => {
    stream.current?.getTracks().forEach((track) => track.stop())
    stream.current = null
  }, [])

  const finalize = useCallback(async () => {
    setStatus('processing')
    releaseMic()

    let context: AudioContext | null = null
    try {
      const recorded = new Blob(chunks.current)
      // decoding normalises the per-browser capture format (WebM/Opus, MP4/AAC) down to raw PCM
      context = new AudioContext()
      const decoded = await context.decodeAudioData(await recorded.arrayBuffer())
      const wav = encodeWav(decoded)

      callbacks.current.onRecorded(
        new File([wav], `recording-${Date.now()}.wav`, { type: 'audio/wav' }),
      )
    } catch {
      callbacks.current.onError('Could not process the recording. Try again.')
    } finally {
      await context?.close()
      chunks.current = []
      setSeconds(0)
      setStatus('idle')
    }
  }, [releaseMic])

  const stop = useCallback(() => {
    if (recorder.current?.state === 'recording') recorder.current.stop()
  }, [])

  const start = useCallback(async () => {
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.current = media

      const instance = new MediaRecorder(media)
      chunks.current = []
      instance.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.current.push(event.data)
      }
      instance.onstop = () => void finalize()
      instance.start()

      recorder.current = instance
      setSeconds(0)
      setStatus('recording')
    } catch (err) {
      releaseMic()
      const name = err instanceof DOMException ? err.name : ''
      callbacks.current.onError(ERROR_MESSAGES[name] ?? 'Could not start recording.')
    }
  }, [finalize, releaseMic])

  useEffect(() => {
    if (status !== 'recording') return
    const id = setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => clearInterval(id)
  }, [status])

  useEffect(() => {
    if (status === 'recording' && seconds >= maxSeconds) stop()
  }, [status, seconds, maxSeconds, stop])

  // a live mic keeps the browser recording indicator on, so drop it if the page goes away mid-take
  useEffect(() => releaseMic, [releaseMic])

  return { status, seconds, supported, maxSeconds, start, stop }
}
