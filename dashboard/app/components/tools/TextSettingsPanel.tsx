'use client'
import { useEffect } from 'react'
import useSWR from 'swr'
import { cn } from '@/app/lib/utils'
import { Label } from '@/app/components/ui/label'
import { getTextPresets, getTextOperations } from '@/app/http/text'
import type { TextPreset, TextOperationInput } from '@/types'

export type TextSettings =
  | { mode: 'preset'; preset: TextPreset }
  | { mode: 'custom'; operations: TextOperationInput[] }

interface TextSettingsPanelProps {
  value: TextSettings
  onChange: (value: TextSettings) => void
}

const LANG_OPTIONS = ['EN', 'PT'] as const
const ALGO_OPTIONS = ['gzip', 'brotli'] as const

//TODO: VERIFY IF/ELSES
export function TextSettingsPanel({ value, onChange }: TextSettingsPanelProps) {
  const { data: presetsData, error: presetsError, isLoading: presetsLoading } = useSWR('text/presets', () => getTextPresets())
  const { data: operationsData, error: operationsError, isLoading: operationsLoading } = useSWR('text/operations', () => getTextOperations())


  const presets = presetsData?.data ?? []
  const operations = operationsData?.data ?? []

  const customOps: TextOperationInput[] =
    value.mode === 'custom' ? value.operations : []

  // Auto-initialize all operations with defaults when switching to custom mode
  useEffect(() => {
    if (value.mode !== 'custom' || operations.length === 0) return
    if (value.operations.length > 0) return
    const allOps: TextOperationInput[] = operations.map((op) => {
      const defaultParams: Record<string, number | string> = {}
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

  function setParam(opId: string, paramKey: string, paramValue: number | string) {
    if (value.mode !== 'custom') return
    onChange({
      mode: 'custom',
      operations: value.operations.map((o) =>
        o.type === opId ? { ...o, params: { ...o.params, [paramKey]: paramValue } } : o
      ),
    })
  }

  function toggleOperation(opId: string) {
    if (value.mode !== 'custom') return
    const exists = value.operations.some((o) => o.type === opId)
    onChange({
      mode: 'custom',
      operations: exists
        ? value.operations.filter((o) => o.type !== opId)
        : [...value.operations, { type: opId }],
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
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 rounded-xl bg-background-section animate-pulse" />
              ))
            : presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onChange({ mode: 'preset', preset: preset.id as TextPreset })}
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
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-background-section animate-pulse" />
              ))
            : operations.map((op) => {
                const activeOp = customOps.find((o) => o.type === op.id)
                const params = activeOp?.params ?? {}
                const hasParams = Object.keys(op.params).length > 0

                if (!hasParams) {
                  const isEnabled = !!activeOp
                  return (
                    <div key={op.id} className="flex items-center justify-between py-2">
                      <div>
                        <Label className="text-sm font-medium">{op.name}</Label>
                        <p className="text-xs text-muted mt-0.5">{op.description}</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isEnabled}
                        onClick={() => toggleOperation(op.id)}
                        className={cn(
                          'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer',
                          isEnabled ? 'bg-accent-strong' : 'bg-background-section'
                        )}
                      >
                        <span
                          className={cn(
                            'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
                            isEnabled ? 'translate-x-4' : 'translate-x-0'
                          )}
                        />
                      </button>
                    </div>
                  )
                }

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
                          return (
                            <div key={key} className="space-y-1">
                              <div className="flex justify-between text-xs text-muted">
                                <span className="capitalize">{key}</span>
                                <span>{val}</span>
                              </div>
                              <input
                                type="range"
                                min={param.min ?? 0}
                                max={param.max ?? 100}
                                value={val}
                                onChange={(e) => setParam(op.id, key, Number(e.target.value))}
                                className="w-full h-1.5 appearance-none rounded-full bg-background-section accent-foreground cursor-pointer"
                              />
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

                        if (key === 'algo') {
                          const val = (params[key] as string) ?? (param.default as string)
                          return (
                            <div key={key} className="flex gap-1.5">
                              {ALGO_OPTIONS.map((opt) => (
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
