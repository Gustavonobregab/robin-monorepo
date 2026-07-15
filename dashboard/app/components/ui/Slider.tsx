'use client'

import { cn } from '@/app/lib/utils'

/* Styled native range input — grey track, near-black filled portion, white
   bordered thumb. No extra deps. */
export function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  className,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  className?: string
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{
        background: `linear-gradient(to right, hsl(var(--foreground)) ${pct}%, hsl(var(--accent)) ${pct}%)`,
      }}
      className={cn(
        'h-1 w-full cursor-pointer appearance-none rounded-full outline-none',
        '[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-black/10 [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:shadow-sm',
        '[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-black/10 [&::-moz-range-thumb]:bg-background',
        className,
      )}
    />
  )
}
