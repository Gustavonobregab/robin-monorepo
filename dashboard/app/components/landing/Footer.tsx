import Link from 'next/link'
import { Logo } from '@/app/components/layout/Logo'

const footerLinks = {
  Product: [
    { label: 'Text Compression', href: '#features' },
    { label: 'Audio Processing', href: '#features' },
    { label: 'Image Optimization', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
  ],
  Developers: [
    { label: 'Documentation', href: '#' },
    { label: 'API Reference', href: '#' },
    { label: 'Status', href: '#' },
  ],
  Company: [
    { label: 'About', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Contact', href: '#' },
  ],
}

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="max-w-6xl mx-auto px-8 py-16">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-16">
          <div>
            <div className="flex items-center gap-2">
              <Logo size={22} />
              <span className="font-bold text-lg">Robin</span>
            </div>
            <p className="text-sm text-muted mt-3 max-w-xs leading-relaxed">
              Compress before you send. Pay less to the cloud giants. Keep the quality.
            </p>
          </div>

          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-semibold text-sm mb-4">{title}</h4>
              <ul className="space-y-2.5">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href} className="text-sm text-muted hover:text-foreground transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-16 pt-6 border-t border-border text-sm text-muted">
          <span>&copy; {new Date().getFullYear()} Robin. All rights reserved.</span>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
