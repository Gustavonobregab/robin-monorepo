'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { animate } from 'framer-motion'
import { ArrowRight, Check } from 'lucide-react'
import { Button } from '@/app/components/ui/Button'

const DOCS_URL = 'https://docs.robinzip.app'

const HEADLINE: { text: string; keep?: boolean }[] = [
  { text: 'Compress ', keep: true },
  { text: 'every file, ' },
  { text: 'every prompt, ' },
  { text: 'every image, ' },
  { text: 'absolutely ' },
  { text: 'everything.', keep: true },
]

function CompressingHeadline({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLHeadingElement>(null)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    const h1 = ref.current
    if (!h1?.parentElement) return
    const cuts = Array.from(h1.querySelectorAll<HTMLElement>('[data-cut]'))
    const keeps = Array.from(h1.querySelectorAll<HTMLElement>('[data-keep]'))

    // idempotent reset: dev StrictMode runs effects twice, leftovers corrupt measurements
    h1.style.cssText = ''
    cuts.concat(keeps).forEach((span) => (span.style.cssText = ''))

    const containerWidth = h1.parentElement.clientWidth

    // fit the long sentence on a single line, then derive the final size from the kept words
    h1.style.fontSize = '40px'
    const startSize = Math.min(56, 40 * (containerWidth / h1.scrollWidth) * 0.98)
    h1.style.fontSize = `${startSize}px`
    const keptWidth = keeps.reduce((total, keep) => total + keep.getBoundingClientRect().width, 0)
    const endSize = Math.min(96, startSize * ((containerWidth * 0.76) / keptWidth))
    h1.style.opacity = '1'

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const mobile = window.innerWidth < 768
    if (reduced || mobile || startSize < 22) {
      cuts.forEach((cut) => {
        cut.style.width = '0px'
        cut.style.opacity = '0'
      })
      h1.style.fontSize = `${endSize}px`
      onDoneRef.current()
      return
    }

    cuts.forEach((cut) => {
      cut.style.width = `${cut.getBoundingClientRect().width}px`
    })

    const controls = cuts.flatMap((cut, i) => {
      const at = 1.1 + i * 0.09
      return [
        animate(cut, { opacity: 0, filter: 'blur(5px)' }, { duration: 1.5, delay: at, ease: 'easeInOut' }),
        animate(cut, { width: 0 }, { duration: 1.4, delay: at + 0.55, ease: [0.45, 0, 0.55, 1] }),
      ]
    })
    const growAt = 1.1 + (cuts.length - 1) * 0.09 + 0.55 + 1.4 - 0.8
    controls.push(
      animate(h1, { fontSize: `${endSize}px` }, {
        duration: 1.2,
        delay: growAt,
        ease: [0.65, 0, 0.35, 1],
        onComplete: () => onDoneRef.current(),
      }),
    )

    return () => {
      controls.forEach((control) => control.stop())
    }
  }, [])

  return (
    <h1
      ref={ref}
      aria-label="Compress everything."
      className="whitespace-nowrap font-light leading-none tracking-tight opacity-0"
    >
      {HEADLINE.map(({ text, keep }) => (
        <span
          key={text}
          aria-hidden
          {...(keep ? { 'data-keep': '' } : { 'data-cut': '' })}
          className={`inline-block whitespace-pre ${keep ? '' : 'overflow-hidden align-bottom'}`}
        >
          {text}
        </span>
      ))}
    </h1>
  )
}

function SizeDiff({ className = '' }: { className?: string }) {
  return (
    <p className={`whitespace-nowrap text-[15px] text-muted-foreground ${className}`}>
      <s className="mr-2.5">2.4 MB</s>
      <span className="text-[17px] font-semibold text-foreground">168 KB</span>
      <span className="ml-2.5 text-[13px]">−93%</span>
    </p>
  )
}

/* blank media slot: swap for real <img>/<video>, keep the radius */
function Media({ className = '' }: { className?: string }) {
  return <div className={`rounded-2xl bg-black/[0.04] ${className}`} aria-hidden />
}

const STEPS = [
  {
    title: 'Upload',
    copy: 'Presigned PUTs straight from the browser or your backend. Drop the file, get a handle back.',
  },
  {
    title: 'Pick a preset',
    copy: 'Opus for speech, WebP or AVIF for images, token compression for prompts. Sane defaults, tunable knobs.',
  },
  {
    title: 'Jobs and webhooks',
    copy: 'Small files return inline. Big ones queue, and you poll, long-poll, or get a webhook when done.',
  },
  {
    title: 'Ship it lighter',
    copy: 'Every job reports input, output, and savings. Download from a signed URL and move on.',
  },
]

const WORKFLOWS = [
  'Compress prompts',
  'Shrink podcasts',
  'Optimize images',
  'Archive audio',
  'Automate pipelines',
]

const CAROUSEL = [
  { title: 'Batch jobs', copy: 'Queue thousands of files, let the workers grind.' },
  { title: 'Presets', copy: 'One name, a whole encoding strategy behind it.' },
  { title: 'Webhooks', copy: 'HMAC-signed delivery when every job completes.' },
  { title: 'Usage analytics', copy: 'Credits, savings, and volume, per key and per month.' },
]

const AUDIENCES = [
  {
    title: 'AI products',
    copy: 'Trim prompts and context before they hit the model. The same answers cost fewer tokens, on every call.',
  },
  {
    title: 'Media platforms',
    copy: 'Podcasts, voice notes, and user uploads stored at a fraction of the size, with the fidelity that matters kept intact.',
  },
  {
    title: 'Web performance',
    copy: 'WebP and AVIF assets generated on demand. Lighter pages, faster loads, smaller bandwidth bills.',
  },
]

const SECURITY = [
  ['Hashed API keys', 'Keys are stored as sha256 hashes. The raw key is shown once, then never again.'],
  ['Signed webhooks', 'Every delivery is HMAC-signed so you can verify it came from us.'],
  ['Signed downloads', 'Results live behind expiring signed URLs, never public buckets.'],
]

const SURFACES = [
  {
    name: 'Dashboard',
    tagline: 'Compression without code.',
    copy: 'Upload, pick a preset, download. Track credits, savings, and job history from one place.',
    href: '/dashboard/home',
    label: 'Open the dashboard',
  },
  {
    name: 'API',
    tagline: 'One POST, one lighter file.',
    copy: 'Bearer keys, idempotency, long-polling, webhooks. Built to sit quietly inside your pipeline.',
    href: '/dashboard/keys',
    label: 'Get an API key',
  },
]

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    cta: 'Start free',
    highlight: false,
    perks: ['100 credits per month', 'Files up to 25 MB', '2 API keys', 'All three modalities'],
  },
  {
    name: 'Pro',
    price: '$19',
    period: 'per month',
    cta: 'Go Pro',
    highlight: true,
    perks: ['1,000 credits per month', 'Files up to 100 MB', '5 API keys', 'Job webhooks'],
  },
]

export default function LandingPage() {
  const [heroDone, setHeroDone] = useState(false)

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-end px-6 py-5">
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#how" className="transition-colors hover:text-foreground">
            How it works
          </a>
          <a href="#workflows" className="transition-colors hover:text-foreground">
            Workflows
          </a>
          <a href="#pricing" className="transition-colors hover:text-foreground">
            Pricing
          </a>
          <a
            href={DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            Docs
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
        {/* Hero: statement + CTAs + wide media below */}
        <section className="pb-10 pt-16 md:pt-24">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
            Text · Audio · Image
          </p>
          <div className="relative mt-5 flex items-end" style={{ height: 'clamp(64px, 9vw, 104px)' }}>
            <CompressingHeadline onDone={() => setHeroDone(true)} />
            <div
              className={`absolute bottom-2 right-0 hidden transition-opacity duration-700 md:bottom-3 md:block ${heroDone ? 'opacity-100' : 'opacity-0'}`}
            >
              <SizeDiff />
            </div>
          </div>
          <div
            className={`mt-6 h-6 transition-opacity duration-700 md:hidden ${heroDone ? 'opacity-100' : 'opacity-0'}`}
          >
            <SizeDiff />
          </div>
          <p className="mt-7 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            Robin shrinks text, audio, and images through one API. Smaller files mean cheaper
            storage, faster transfers, and fewer tokens burned on every model call.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <Button className="rounded-full" asChild>
              <Link href="/dashboard/home">Start compressing</Link>
            </Button>
            <Button variant="secondary" className="rounded-full" asChild>
              <Link href="/dashboard/keys">Get an API key</Link>
            </Button>
          </div>
          <Media className="mt-14 aspect-[16/7] w-full" />
        </section>

        {/* How it works: numbered steps left, media right */}
        <section id="how" className="grid gap-10 border-t border-border py-16 md:grid-cols-[1fr_1.15fr] md:gap-16 md:py-24">
          <div>
            <h2 className="max-w-sm text-3xl font-light tracking-tight">
              Results in one call.
            </h2>
            <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
              Infrastructure for compression, turning heavy files into light ones without you
              thinking about codecs, encoders, or queues.
            </p>
            <ol className="mt-10 space-y-7">
              {STEPS.map(({ title, copy }, i) => (
                <li key={title} className="flex gap-4">
                  <span className="text-[13px] font-medium text-muted-foreground">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium">{title}</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{copy}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <Media className="min-h-[320px] md:min-h-0" />
        </section>

        {/* Workflows: heading + pills + wide media */}
        <section id="workflows" className="border-t border-border py-16 md:py-24">
          <div className="max-w-lg space-y-3">
            <h2 className="text-3xl font-light tracking-tight">
              Built for the most demanding pipelines.
            </h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              Designed for products moving files at scale, turning heavy media and verbose prompts
              into assets your infrastructure barely notices.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {WORKFLOWS.map((w, i) => (
              <span
                key={w}
                className={`rounded-full px-4 py-2 text-[13px] font-medium ${
                  i === 0 ? 'bg-foreground text-background' : 'border border-border text-muted-foreground'
                }`}
              >
                {w}
              </span>
            ))}
          </div>
          <Media className="mt-8 aspect-[16/8] w-full md:aspect-[16/6]" />
        </section>

        {/* Horizontal cards */}
        <section className="border-t border-border py-16 md:py-24">
          <h2 className="max-w-lg text-3xl font-light tracking-tight">
            Create, scale, and move faster with less.
          </h2>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CAROUSEL.map(({ title, copy }) => (
              <div key={title} className="rounded-3xl border border-border p-4">
                <Media className="aspect-[4/3]" />
                <p className="mt-4 text-sm font-medium">{title}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Audiences */}
        <section className="border-t border-border py-16 md:py-24">
          <div className="max-w-lg space-y-3">
            <h2 className="text-3xl font-light tracking-tight">Built for every product.</h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              Compression for teams shipping AI features, media platforms, and fast pages.
            </p>
          </div>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {AUDIENCES.map(({ title, copy }) => (
              <div key={title} className="space-y-3 border-t border-border pt-5">
                <p className="text-sm font-medium">{title}</p>
                <p className="text-[13px] leading-relaxed text-muted-foreground">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Secure by design */}
        <section className="grid gap-10 rounded-3xl bg-foreground px-8 py-12 text-background sm:px-12 md:grid-cols-[1fr_1.2fr] md:items-center">
          <div className="space-y-3">
            <h2 className="text-3xl font-light tracking-tight">Secure by design.</h2>
            <p className="text-[15px] leading-relaxed text-background/70">
              Your files pass through, get lighter, and leave. Nothing sits in a public bucket,
              nothing is delivered unsigned.
            </p>
          </div>
          <div className="space-y-2">
            {SECURITY.map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-background/10 px-5 py-4">
                <p className="text-sm font-medium">{k}</p>
                <p className="mt-0.5 text-[13px] text-background/70">{v}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Two surfaces */}
        <section className="border-b border-border py-16 md:py-24">
          <h2 className="max-w-md text-3xl font-light tracking-tight">
            Two ways in. The same small files out.
          </h2>
          <div className="mt-10 grid gap-3 md:grid-cols-2">
            {SURFACES.map(({ name, tagline, copy, href, label }) => (
              <div key={name} className="flex flex-col rounded-3xl border border-border p-7">
                <Media className="aspect-[16/8]" />
                <p className="mt-6 text-sm font-medium">{name}</p>
                <p className="mt-1 text-xl font-light tracking-tight">{tagline}</p>
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{copy}</p>
                <Link
                  href={href}
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-muted-foreground"
                >
                  {label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="space-y-10 py-16 md:py-24">
          <div className="max-w-lg space-y-2">
            <h2 className="text-3xl font-light tracking-tight">Simple pricing.</h2>
            <p className="text-[15px] text-muted-foreground">
              Start free, upgrade when your files do. Credits reset every month.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {PLANS.map(({ name, price, period, cta, highlight, perks }) => (
              <div
                key={name}
                className={`flex flex-col gap-6 rounded-3xl p-7 ${
                  highlight ? 'bg-foreground text-background' : 'border border-border'
                }`}
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">{name}</p>
                  <p className="text-4xl font-light tracking-tight">
                    {price}
                    <span
                      className={`ml-2 text-[13px] ${highlight ? 'text-background/60' : 'text-muted-foreground'}`}
                    >
                      {period}
                    </span>
                  </p>
                </div>
                <ul className="space-y-2.5">
                  {perks.map((perk) => (
                    <li key={perk} className="flex items-center gap-2.5 text-[14px]">
                      <Check
                        className={`h-4 w-4 shrink-0 ${highlight ? 'text-background/60' : 'text-muted-foreground'}`}
                      />
                      {perk}
                    </li>
                  ))}
                </ul>
                <Button
                  className={`mt-auto w-fit rounded-full ${
                    highlight ? 'border-0 bg-background text-foreground hover:bg-background/90' : ''
                  }`}
                  variant={highlight ? 'secondary' : 'primary'}
                  asChild
                >
                  <Link href="/dashboard/billing">{cta}</Link>
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="flex flex-col items-center gap-4 border-t border-border py-20 text-center">
          <h2 className="max-w-xl text-4xl font-light tracking-tight">
            Ready to see how small your files can get?
          </h2>
          <p className="text-[15px] text-muted-foreground">Free to start. No card required.</p>
          <div className="flex items-center gap-2">
            <Button size="lg" className="rounded-full" asChild>
              <Link href="/dashboard/home">Get started</Link>
            </Button>
            <Button size="lg" variant="secondary" className="rounded-full" asChild>
              <Link href="/dashboard/keys">Get an API key</Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-6 text-[13px] text-muted-foreground sm:flex-row">
          <span>Robin · robinzip.app</span>
          <div className="flex items-center gap-5">
            <Link href="/sign-in" className="transition-colors hover:text-foreground">
              Sign in
            </Link>
            <a href="#how" className="transition-colors hover:text-foreground">
              How it works
            </a>
            <a href="#pricing" className="transition-colors hover:text-foreground">
              Pricing
            </a>
            <a
              href={DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
            >
              Docs
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
