import Link from 'next/link'
import { FileText, Music, Image as ImageIcon } from 'lucide-react'

const actions = [
  { href: '/dashboard/text', icon: FileText, label: 'Compress Text', description: 'Trim, shorten, or summarize' },
  { href: '/dashboard/audio', icon: Music, label: 'Compress Audio', description: 'Remove silence, normalize' },
  { href: '/dashboard/image', icon: ImageIcon, label: 'Compress Image', description: 'Coming soon', disabled: true },
]

export function QuickActions() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {actions.map(({ href, icon: Icon, label, description, disabled }) => (
        <Link
          key={href}
          href={disabled ? '#' : href}
          className={`bg-background rounded-xl p-5 border border-border shadow-sm flex items-center gap-4 transition-colors ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-accent-strong'
          }`}
          onClick={disabled ? (e) => e.preventDefault() : undefined}
        >
          <div className="w-9 h-9 rounded-xl bg-accent-light flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <p className="font-medium text-sm">{label}</p>
            <p className="text-xs text-muted">{description}</p>
          </div>
        </Link>
      ))}
    </div>
  )
}
