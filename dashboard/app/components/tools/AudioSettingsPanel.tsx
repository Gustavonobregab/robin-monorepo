'use client'
import { useEffect } from 'react'
import useSWR from 'swr'
import { cn } from '@/app/lib/utils'
import { Label } from '@/app/components/ui/label'
import { getAudioPresets, getAudioOperations } from '@/app/http/audio'
import type { AudioPreset, AudioOperationInput } from '@/types'

export type AudioSettings =
  | { mode: 'preset'; preset: AudioPreset }
  | { mode: 'custom'; operations: AudioOperationInput[] }

interface AudioSettingsPanelProps {
  value: AudioSettings
  onChange: (value: AudioSettings) => void
}

const LANG_OPTIONS = ['EN', 'PT'] as const

export function AudioSettingsPanel({ value, onChange }: AudioSettingsPanelProps) {
  const { data: presetsData } = useSWR('audio/presets', () => getAudioPresets())
  const { data: operationsData } = useSWR('audio/operations', () => getAudioOperations())

  const presets = presetsData?.data ?? []
  const operations = operationsData?.data ?? []

  const customOps: AudioOperationInput[] =
    value.mode === 'custom' ? value.operations : []

  // Auto-initialize all operations with defaults when switching to custom mode
  useEffect(() => {
    if (value.mode !== 'custom' || operations.length === 0) return
    if (value.operations.length > 0) return
    
    const allOps: AudioOperationInput[] = operations.map((op) => {
      const defaultParams: Record<string, number | string | boolean> = {}
      for (const [key, param] of Object.entries(op.params)) {
        defaultParams[key] = param.default
      }
      return { type: op.id, params: defaultParams }
    })
    onChange({ mode: 'custom', operations: allOps })
  }, [operations, value.mode]) // eslint-disable-line react-hooks/exhaustive-deps

  function switchToPreset() {
    onChange({ mode: 'preset', preset: 'medium' })
  }

  function switchToCustom() {
    onChange({ mode: 'custom', operations: [] })
  }

  function setParam(opId: string, paramKey: string, paramValue: number | string | boolean) {
    if (value.mode !== 'custom') return
    onChange({
      mode: 'custom',
      operations: value.operations.map((o) =>
        o.type === opId ? { ...o, params: { ...o.params, [paramKey]: paramValue } } : o
      ),
    })
  }

  return (
    <div className="space-y-4 mt-4">
      {/* Mode tabs */}
      <div className="flex gap-1 bg-background-section rounded-xl p-1">
        <button
          type="button"
          onClick={switchToPreset}
          className={cn(
            'flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors',
            value.mode === 'preset'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted hover:text-foreground'
          )}
        >
          Preset
        </button>
        <button
          type="button"
          onClick={switchToCustom}
          className={cn(
            'flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors',
            value.mode === 'custom'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted hover:text-foreground'
          )}
        >
          Custom
        </button>
      </div>

      {/* Preset mode */}
      {value.mode === 'preset' && (
        <div className="grid gap-2">
          {presets.length === 0
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 rounded-xl bg-background-section animate-pulse" />
              ))
            : presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onChange({ mode: 'preset', preset: preset.id as AudioPreset })}
                  className={cn(
                    'text-left px-3 py-2 rounded-xl border text-sm transition-colors',
                    value.preset === preset.id
                      ? 'border-accent-strong bg-accent-light'
                      : 'border-border hover:border-accent-light'
                  )}
                >
                  <span className="font-medium">{preset.name}</span>
                  <span className="text-muted ml-2">{preset.description}</span>
                </button>
              ))}
        </div>
      )}

      {/* Custom mode */}
      {value.mode === 'custom' && (
        <div className="space-y-4">
          {operations.length === 0
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-background-section animate-pulse" />
              ))
            : operations.map((op) => {
                const activeOp = customOps.find((o) => o.type === op.id)
                const params = activeOp?.params ?? {}

                return (
                  <div key={op.id} className="space-y-2">
                    <div>
                      <Label className="text-sm font-medium">{op.name}</Label>
                      <p className="text-xs text-muted mt-0.5">{op.description}</p>
                    </div>

                    <div className="space-y-2">
                      {Object.entries(op.params).map(([key, param]) => {
                        if (param.type === 'number') {
                          const val = (params[key] as number) ?? (param.default as number)
                          const step = (param.max ?? 100) - (param.min ?? 0) <= 5 ? 0.1 : 1
                          return (
                            <div key={key} className="space-y-1">
                              <div className="flex justify-between text-xs text-muted">
                                <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                <span>{val}</span>
                              </div>
                              <input
                                type="range"
                                min={param.min ?? 0}
                                max={param.max ?? 100}
                                step={step}
                                value={val}
                                onChange={(e) => setParam(op.id, key, Number(e.target.value))}
                                className="w-full h-1.5 appearance-none rounded-full bg-background-section accent-foreground cursor-pointer"
                              />
                            </div>
                          )
                        }

                        if (param.type === 'boolean') {
                          const val = (params[key] as boolean) ?? (param.default as boolean)
                          return (
                            <div key={key} className="flex items-center justify-between">
                              <span className="text-xs text-muted capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                              <button
                                type="button"
                                onClick={() => setParam(op.id, key, !val)}
                                className={cn(
                                  'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                                  val ? 'bg-accent-strong' : 'bg-background-section'
                                )}
                              >
                                <span
                                  className={cn(
                                    'inline-block h-3.5 w-3.5 rounded-full bg-foreground transition-transform',
                                    val ? 'translate-x-4.5' : 'translate-x-0.5'
                                  )}
                                />
                              </button>
                            </div>
                          )
                        }

                        if (key === 'lang') {
                          const val = (params[key] as string) ?? (param.default as string)
                          return (
                            <div key={key} className="flex gap-1.5">
                              {LANG_OPTIONS.map((opt) => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => setParam(op.id, key, opt)}
                                  className={cn(
                                    'flex-1 text-xs py-1 rounded-lg border transition-colors',
                                    val === opt
                                      ? 'border-accent-strong bg-accent-light text-foreground'
                                      : 'border-border text-muted hover:border-accent-light'
                                  )}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          )
                        }

                        return null
                      })}
                    </div>
                  </div>
                )
              })}
        </div>
      )}
    </div>
  )
}
