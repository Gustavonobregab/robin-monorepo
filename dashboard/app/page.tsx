'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Image from 'next/image'
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

function Vignette({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <div aria-hidden className={`relative overflow-hidden rounded-2xl bg-black/[0.03] ${className}`}>
      {children}
    </div>
  )
}

function DashboardVisual() {
  return (
    <div className="absolute inset-x-8 bottom-0 top-7 overflow-hidden rounded-t-xl border border-b-0 border-black/[0.07] bg-background">
      <div className="flex items-center gap-1.5 border-b border-black/[0.05] px-3.5 py-2">
        <span className="h-1.5 w-1.5 rounded-full bg-black/10" />
        <span className="h-1.5 w-1.5 rounded-full bg-black/10" />
        <span className="h-1.5 w-1.5 rounded-full bg-black/10" />
        <span className="ml-2 rounded-full bg-black/[0.04] px-2.5 py-0.5 text-[9px] text-muted-foreground">
          robinzip.app
        </span>
      </div>
      <div className="space-y-2 p-3.5">
        <div className="rounded-lg border border-dashed border-black/10 py-4 text-center text-[10px] text-muted-foreground">
          Drop a file to compress
        </div>
        <div className="flex items-center justify-between rounded-lg bg-black/[0.03] px-3 py-2 text-[10px]">
          <span className="font-mono text-foreground/70">keynote.mp3</span>
          <span className="text-muted-foreground">
            <s className="mr-1.5">31 MB</s>
            <span className="font-medium text-foreground">2.2 MB</span>
          </span>
        </div>
      </div>
    </div>
  )
}

function ApiVisual() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <pre className="font-mono text-[11px] leading-[1.9] text-muted-foreground">
        {'curl api.robinzip.app/v1/audio\n  -H "Authorization: Bearer rb_live_a1f0"\n  -F "preset=voice"\n'}
        <span className="font-medium text-foreground">201</span>
        {'  "savings": "93%"'}
      </pre>
    </div>
  )
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
    Visual: DashboardVisual,
  },
  {
    name: 'API',
    tagline: 'One POST, one lighter file.',
    copy: 'Bearer keys, idempotency, long-polling, webhooks. Built to sit quietly inside your pipeline.',
    href: '/dashboard/keys',
    label: 'Get an API key',
    Visual: ApiVisual,
  },
]

function GridLine({ position }: { position: 'top' | 'bottom' }) {
  return (
    <div
      className={`absolute ${position === 'top' ? 'top-0' : 'bottom-0'} left-1/2 h-px w-screen -translate-x-1/2 bg-black/[0.05]`}
    />
  )
}

function RowDots({ position, center = true }: { position: 'top' | 'bottom'; center?: boolean }) {
  const y = position === 'top' ? '-top-[2.5px]' : '-bottom-[2.5px]'
  return (
    <>
      <span className={`absolute -left-6 ${y} h-[5px] w-[5px] -translate-x-1/2 rounded-full bg-foreground/25`} />
      {center && (
        <span
          className={`absolute left-1/2 ${y} hidden h-[5px] w-[5px] -translate-x-1/2 rounded-full bg-foreground/25 md:block`}
        />
      )}
      <span className={`absolute -right-6 ${y} h-[5px] w-[5px] translate-x-1/2 rounded-full bg-foreground/25`} />
    </>
  )
}

/* syntax colors lifted from the elevenlabs code sample */
const Kw = ({ children }: { children: ReactNode }) => <span style={{ color: '#F41A2F' }}>{children}</span>
const Id = ({ children }: { children: ReactNode }) => <span style={{ color: '#0A59D2' }}>{children}</span>
const Str = ({ children }: { children: ReactNode }) => <span style={{ color: '#052F70' }}>{children}</span>

function ApiCode({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full overflow-x-auto rounded-3xl py-6 [scrollbar-width:none]">
      <div className="sticky left-0 w-6 flex-none bg-gradient-to-r from-background to-transparent" />
      <pre
        className="font-mono text-[11px] leading-[1.375rem] text-foreground"
        style={{ fontVariantLigatures: 'none' }}
      >
        <code>{children}</code>
      </pre>
      <div className="sticky right-0 ml-12 w-6 flex-none bg-gradient-to-l from-background to-transparent" />
    </div>
  )
}

function TokenDiff() {
  return (
    <div className="w-full space-y-6">
      <div>
        <div className="flex justify-between text-[12px]">
          <span className="text-muted-foreground">Raw prompt</span>
          <span className="text-muted-foreground">12,400 tokens</span>
        </div>
        <div className="mt-2.5 h-2 w-full rounded-full bg-black/[0.06]" />
      </div>
      <div>
        <div className="flex justify-between text-[12px]">
          <span className="text-muted-foreground">Compressed</span>
          <span className="font-medium text-foreground">4,900 tokens</span>
        </div>
        <div className="mt-2.5 h-2 w-[40%] rounded-full bg-foreground" />
      </div>
    </div>
  )
}

const API_ROWS = [
  {
    title: 'Audio API',
    desc: 'Speech-aware codecs behind one endpoint. Upload heavy recordings, get lightweight Opus back with the voice intact.',
    features: [
      ['voice', 'Opus tuned for speech'],
      ['podcast', 'Smaller episodes, same warmth'],
    ],
    visual: (
      <ApiCode>
        <Kw>const</Kw>
        <Id> form</Id>
        {' = new FormData()\nform.append('}
        <Str>&quot;file&quot;</Str>
        {', file)\nform.append('}
        <Str>&quot;preset&quot;</Str>
        {', '}
        <Str>&quot;voice&quot;</Str>
        {')\n\n'}
        <Kw>await</Kw>
        {' fetch('}
        <Str>&quot;https://api.robinzip.app/v1/audio&quot;</Str>
        {', {\n'}
        <Id>{'  method:'}</Id>
        <Str> &quot;POST&quot;</Str>
        {',\n'}
        <Id>{'  headers:'}</Id>
        {' { '}
        <Id>Authorization:</Id>
        <Str> &quot;Bearer rb_live_a1f0&quot;</Str>
        {' },\n'}
        <Id>{'  body:'}</Id>
        {' form,\n})'}
      </ApiCode>
    ),
  },
  {
    title: 'Text API',
    desc: 'Prompt compression that keeps meaning. Send verbose context, get the same answers back for a fraction of the tokens.',
    features: [
      ['prompt', 'Fewer tokens, same intent'],
      ['context', 'Long documents, trimmed safely'],
    ],
    visual: <TokenDiff />,
  },
  {
    title: 'Image API',
    desc: 'WebP and AVIF generated on demand. Set a quality target and ship the smallest file that clears it.',
    features: [
      ['web', 'AVIF with WebP fallback'],
      ['archive', 'Maximum squeeze for storage'],
    ],
    visual: (
      <ApiCode>
        <Kw>const</Kw>
        <Id> job</Id>
        {' = '}
        <Kw>await</Kw>
        {' fetch('}
        <Str>&quot;https://api.robinzip.app/v1/image&quot;</Str>
        {', {\n'}
        <Id>{'  method:'}</Id>
        <Str> &quot;POST&quot;</Str>
        {',\n'}
        <Id>{'  headers:'}</Id>
        {' { '}
        <Id>Authorization:</Id>
        <Str> &quot;Bearer rb_live_a1f0&quot;</Str>
        {' },\n'}
        <Id>{'  body:'}</Id>
        {' form,\n}).then((r) => r.json())\n\n'}
        <span className="text-muted-foreground">
          {'// { status: "completed", output: "168 KB", savings: "93%" }'}
        </span>
      </ApiCode>
    ),
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
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-end gap-8 px-6 py-5">
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

      <main className="relative mx-auto max-w-6xl px-6">
        <div className="absolute inset-y-0 left-0 hidden w-px bg-black/[0.05] md:block" aria-hidden />
        <div className="absolute inset-y-0 right-0 hidden w-px bg-black/[0.05] md:block" aria-hidden />
        {/* Hero: statement + CTAs + wide media below */}
        <section className="flex min-h-[480px] flex-col justify-center pb-10 pt-16 md:min-h-[560px] md:pt-24">
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
        </section>

        {/* How it works: numbered steps left, media right */}
        <section id="how" className="relative grid gap-10 py-16 md:grid-cols-[1fr_1.15fr] md:gap-16 md:py-24">
          <GridLine position="top" />
          <RowDots position="top" center={false} />
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
          <Image
            src="/landing/image-compression.webp"
            alt="Robin compressing hero-4k.png from 2.4 MB to 168 KB"
            width={1407}
            height={1118}
            className="w-full self-center rounded-2xl"
          />
        </section>

        {/* Workflows: heading + pills + wide media */}
        <section id="workflows" className="relative py-16 md:py-24">
          <GridLine position="top" />
          <RowDots position="top" center={false} />
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

        {/* Audiences */}
        <section className="relative py-16 md:py-24">
          <GridLine position="top" />
          <RowDots position="top" center={false} />
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
        <section className="relative py-16 md:py-24">
          <GridLine position="bottom" />
          <RowDots position="bottom" center={false} />
          <h2 className="max-w-md text-3xl font-light tracking-tight">
            Two ways in. The same small files out.
          </h2>
          <div className="mt-10 grid gap-3 md:grid-cols-2">
            {SURFACES.map(({ name, tagline, copy, href, label, Visual }) => (
              <div key={name} className="flex flex-col rounded-3xl border border-border p-7">
                <Vignette className="aspect-[16/8]">
                  <Visual />
                </Vignette>
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

        {/* API grid */}
        <section className="py-16 md:py-24">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Robin API</p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
            <h2 className="max-w-md text-3xl font-light tracking-tight">
              Or build anything with one compression API.
            </h2>
            <Button variant="secondary" className="rounded-full" asChild>
              <a href={DOCS_URL} target="_blank" rel="noopener noreferrer">
                Explore docs
              </a>
            </Button>
          </div>

          <div className="relative mt-14">
            {API_ROWS.map(({ title, desc, features, visual }) => (
              <div key={title} className="relative grid md:grid-cols-2">
                <GridLine position="top" />
                <RowDots position="top" />
                <div className="py-10 md:py-14 md:pr-14">
                  <p className="text-lg font-medium">{title}</p>
                  <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground">
                    {desc}
                  </p>
                  <div className="mt-9 grid max-w-md grid-cols-2 gap-6">
                    {features.map(([name, sub]) => (
                      <div key={name}>
                        <p className="font-mono text-[13px] font-medium">{name}</p>
                        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{sub}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center border-t border-black/[0.05] py-10 md:border-l md:border-t-0 md:py-14 md:pl-14">
                  {visual}
                </div>
              </div>
            ))}
            <GridLine position="bottom" />
            <RowDots position="bottom" />
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
        <section className="relative flex flex-col items-center gap-4 py-20 text-center">
          <GridLine position="top" />
          <RowDots position="top" center={false} />
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
      <footer className="border-t border-black/[0.05]">
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
