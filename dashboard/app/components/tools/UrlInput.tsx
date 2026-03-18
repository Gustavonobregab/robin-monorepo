import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'

interface UrlInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
}

export function UrlInput({
  value,
  onChange,
  placeholder = 'https://example.com/file',
  label = 'File URL',
}: UrlInputProps) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type="url"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="text-xs text-muted">Paste a public URL to your file.</p>
    </div>
  )
}
