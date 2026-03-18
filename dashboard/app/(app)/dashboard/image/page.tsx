// dashboard/app/(app)/dashboard/image/page.tsx
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Image as ImageIcon } from 'lucide-react'

const IMAGE_PRESETS = [
  { value: 'light', label: 'Light', description: 'Minimal compression, best quality' },
  { value: 'balanced', label: 'Balanced', description: 'Good compression, good quality' },
  { value: 'aggressive', label: 'Aggressive', description: 'Maximum compression' },
]

export default function ImagePage() {
  return (
    <div className="h-full overflow-y-auto p-6">
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div>
          <h2 className="text-lg font-semibold">Image compression</h2>
          <p className="text-sm text-muted mt-0.5">
            Smart image compression that keeps quality high.
          </p>
        </div>
        <Badge className="bg-accent-light text-foreground border-0 rounded-full">Coming soon</Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 opacity-60 pointer-events-none select-none">
        <div className="bg-background rounded-xl border border-border shadow-sm p-5">
          <div className="space-y-1.5">
            <Label>Image file URL</Label>
            <Input type="url" placeholder="https://example.com/photo.jpg" disabled />
            <p className="text-xs text-muted">Paste a public URL to your image file.</p>
          </div>
          <div className="space-y-1.5 mt-4">
            <Label>Preset</Label>
            <div className="grid gap-2">
              {IMAGE_PRESETS.map((preset) => (
                <div
                  key={preset.value}
                  className="text-left px-3 py-2 rounded-xl border border-border text-sm"
                >
                  <span className="font-medium">{preset.label}</span>
                  <span className="text-muted ml-2">{preset.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-background rounded-xl border border-border shadow-sm p-5 flex flex-col items-center justify-center gap-3">
          <div className="w-16 h-16 rounded-xl bg-background-section flex items-center justify-center">
            <ImageIcon className="w-7 h-7 text-muted" />
          </div>
          <p className="text-sm text-muted">Image preview will appear here</p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          disabled
          className="rounded-full bg-accent-strong text-foreground opacity-50 cursor-not-allowed"
        >
          Compress image
        </Button>
      </div>
    </div>
    </div>
  )
}
