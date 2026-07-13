import type { Metadata } from 'next'
import { Geist, IBM_Plex_Mono } from 'next/font/google'
import { Providers } from './providers'
import './globals.css'

const sans = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
})

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'Robin',
  description: 'Compress text, audio, and images',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} font-sans`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
