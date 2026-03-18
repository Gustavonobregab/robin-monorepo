'use client'
import { Label } from '@/app/components/ui/label'
import { cn } from '@/app/lib/utils'

interface Preset {
  value: string
  label: string
  description: string
}

interface PresetSelectorProps<T extends string> {
  presets: Preset[]
  value: T
  onChange: (value: T) => void
}

export function PresetSelector<T extends string>({
  presets,
  value,
  onChange,
}: PresetSelectorProps<T>) {
  return (
    <div className="space-y-1.5 mt-4">
      <Label>Preset</Label>
      <div className="grid gap-2">
        {presets.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => onChange(preset.value as T)}
            className={cn(
              'text-left px-3 py-2 rounded-xl border text-sm transition-colors',
              value === preset.value
                ? 'border-accent-strong bg-accent-light'
                : 'border-border hover:border-accent-light'
            )}
          >
            <span className="font-medium">{preset.label}</span>
            <span className="text-muted ml-2">{preset.description}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
