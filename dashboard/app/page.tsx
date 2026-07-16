'use client'

import Link from 'next/link'
import { ArrowRight, FileText, ImageIcon, Mic } from 'lucide-react'
import { Button } from '@/app/components/ui/Button'


const FEATURES = [
  {
    Icon: FileText,
    title: 'Text',
    copy: 'Compress prompts and documents before they reach the model. Fewer tokens in, the same answer out.',
  },
  {
    Icon: Mic,
    title: 'Audio',
    copy: 'Shrink recordings with presets tuned for speech and music. Keep the fidelity, drop the megabytes.',
  },
  {
    Icon: ImageIcon,
    title: 'Image',
    copy: 'Encode to WebP and AVIF with one call. Lighter assets, faster loads, smaller bills.',
  },
]

const STATS = [
  { value: '−70%', label: 'average size reduction' },
  { value: '3', label: 'modalities, one API' },
  { value: '1 call', label: 'from raw file to compressed' },
]

function MediaPlaceholder({ className = '' }: { className?: string }) {
  return <div className={`rounded-2xl bg-black/[0.04] ${className}`} aria-hidden />
}


function FeatureSlab({
  label,
  caption,
  Icon,
  tilt,
  className = '',
}: {
  label: string
  caption: string
  Icon: typeof FileText
  tilt: 'left' | 'center' | 'right'
  className?: string
}) {
  const rotation = {
    left: 'md:[transform:rotateY(26deg)_rotateX(6deg)_translateZ(-40px)]',
    center: 'md:[transform:rotateY(0deg)_rotateX(4deg)_translateZ(30px)]',
    right: 'md:[transform:rotateY(-26deg)_rotateX(6deg)_translateZ(-40px)]',
  }[tilt]

  return (
    <div
      className={`group transition-transform duration-500 ease-out md:hover:[transform:rotateY(0deg)_rotateX(0deg)_translateZ(30px)] ${rotation} ${className}`}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <div className="rounded-[2.5rem] border border-black/[0.06] bg-gradient-to-b from-white to-black/[0.03] p-2.5 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.25)] transition-shadow duration-500 group-hover:shadow-[0_32px_80px_-24px_rgba(0,0,0,0.35)]">
        {/* Swap for a real <img>/<video>, keeping the radius */}
        <div className="aspect-[4/3] rounded-[2rem] bg-black/[0.05]" aria-hidden />
        <div className="flex items-center gap-2 px-3 pb-2 pt-3.5">
          <Icon className="h-4 w-4" />
          <p className="text-sm font-medium">{label}</p>
          <p className="ml-auto text-right text-[12px] text-muted-foreground">{caption}</p>
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="text-[15px] font-semibold tracking-tight">Robin Wood</span>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#features" className="transition-colors hover:text-foreground">
            Features
          </a>
          <a href="#savings" className="transition-colors hover:text-foreground">
            Why compress
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="rounded-full" asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button className="rounded-full" asChild>
            <Link href="/dashboard/home">Get started</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        {/* Hero */}
        <section className="grid gap-8 py-16 md:grid-cols-[1.2fr_1fr] md:items-end md:py-24">
          <h1 className="text-5xl font-light leading-[1.05] tracking-tight sm:text-6xl">
            Compress everything.
            <br />
            Spend less.
          </h1>
          <div className="space-y-5">
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              Robin Wood shrinks text, audio, and images through one API. Smaller files mean
              cheaper storage, faster transfers — and fewer tokens burned on every model call.
            </p>
            <div className="flex items-center gap-2">
              <Button className="rounded-full" asChild>
                <Link href="/dashboard/home">Start compressing</Link>
              </Button>
              <Button variant="secondary" className="rounded-full" asChild>
                <Link href="/dashboard/keys">Get an API key</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* 3D feature slabs */}
        <section className="pb-6">
          <div className="grid gap-6 md:grid-cols-3 md:gap-2" style={{ perspective: '1600px' }}>
            <FeatureSlab tilt="left" Icon={FileText} label="Text" caption="Prompts & documents" />
            <FeatureSlab
              tilt="center"
              Icon={Mic}
              label="Audio"
              caption="Speech & music"
              className="md:-mt-4"
            />
            <FeatureSlab tilt="right" Icon={ImageIcon} label="Image" caption="WebP & AVIF" />
          </div>
        </section>

        {/* Stats strip */}
        <section className="grid gap-8 border-b border-border py-14 sm:grid-cols-3">
          {STATS.map(({ value, label }) => (
            <div key={label} className="space-y-1 text-center">
              <p className="text-3xl font-light tracking-tight">{value}</p>
              <p className="text-[13px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </section>

        {/* Features */}
        <section id="features" className="space-y-10 py-16">
          <div className="max-w-lg space-y-2">
            <h2 className="text-3xl font-light tracking-tight">Three formats. One job: smaller.</h2>
            <p className="text-[15px] text-muted-foreground">
              Upload, pick a preset, download. Or automate all of it through the API.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {FEATURES.map(({ Icon, title, copy }) => (
              <div key={title} className="rounded-3xl border border-border p-5">
                <MediaPlaceholder className="aspect-video" />
                <div className="mt-4 flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <p className="text-sm font-medium">{title}</p>
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Savings */}
        <section id="savings" className="grid gap-8 rounded-3xl bg-foreground px-8 py-12 text-background sm:px-12 md:grid-cols-[1fr_1fr] md:items-center">
          <div className="space-y-3">
            <h2 className="text-3xl font-light tracking-tight">Stop paying for size.</h2>
            <p className="text-[15px] leading-relaxed text-background/70">
              Every megabyte you store, transfer, or feed to a model costs money. A prompt
              compressed by 70% is a token bill cut by 70% — on every single call.
            </p>
            <Button
              variant="secondary"
              className="rounded-full border-0 bg-background text-foreground hover:bg-background/90"
              asChild
            >
              <Link href="/dashboard/home">
                See your savings
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="space-y-2">
            {[
              ['Storage', 'Smaller files, smaller bills'],
              ['Bandwidth', 'Faster transfers, less egress'],
              ['LLM tokens', 'Compressed prompts, cheaper calls'],
            ].map(([k, v]) => (
              <div
                key={k}
                className="flex items-center justify-between rounded-2xl bg-background/10 px-5 py-4"
              >
                <span className="text-sm font-medium">{k}</span>
                <span className="text-[13px] text-background/70">{v}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="flex flex-col items-center gap-4 py-20 text-center">
          <h2 className="text-4xl font-light tracking-tight">Compress your first file.</h2>
          <p className="text-[15px] text-muted-foreground">Free to start. No card required.</p>
          <Button size="lg" className="rounded-full" asChild>
            <Link href="/dashboard/home">Get started</Link>
          </Button>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-[13px] text-muted-foreground">
          <span>Robin Wood</span>
          <div className="flex items-center gap-5">
            <Link href="/sign-in" className="transition-colors hover:text-foreground">
              Sign in
            </Link>
            <a href="#features" className="transition-colors hover:text-foreground">
              Features
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
