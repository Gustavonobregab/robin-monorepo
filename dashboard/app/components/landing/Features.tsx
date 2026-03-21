import Link from 'next/link'
import { FileText, Music, Image as ImageIcon, Zap } from 'lucide-react'
import { Button } from '@/app/components/ui/button'

export function Features() {
  return (
    <section id="features" className="py-16">
      <div className="max-w-6xl mx-auto px-8">
        {/* Two-column header */}
        <div className="flex items-start justify-between gap-16 mb-6">
          <div>
            <p className="text-sm text-muted mb-3">Robin Platform</p>
            <h2 className="text-[2.75rem] font-medium leading-[1.15] tracking-tight max-w-lg">
              Stop paying big tech for air
            </h2>
          </div>
          <p className="text-base text-muted leading-relaxed max-w-sm pt-10">
            No AI, no black box. Pure algorithms that shrink your payloads before they hit the API. Fewer tokens sent, more money saved every month.
          </p>
        </div>

        <div className="mb-12">
          <Button className="rounded-full bg-accent-strong text-foreground hover:bg-accent-light" asChild>
            <Link href="/sign-up">Get started</Link>
          </Button>
        </div>

        {/* Two large feature cards */}
        <div className="grid grid-cols-5 gap-4 mb-4">
          {/* Card 1: API Pipeline (spans 3) with gradient + noise */}
          <div className="col-span-3 relative rounded-2xl overflow-hidden flex flex-col" style={{ background: 'linear-gradient(135deg, #A0C878 0%, #DDEB9D 40%, #FFFDF6 70%, #A0C878 100%)' }}>
            {/* Noise overlay */}
            <div
              className="pointer-events-none absolute inset-0 z-0 mix-blend-overlay opacity-50"
              style={{
                backgroundImage: 'url(/noise.svg)',
                backgroundSize: '256px 256px',
                imageRendering: 'pixelated' as React.CSSProperties['imageRendering'],
              }}
            />
            <div className="relative z-10 flex-1 p-8">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-sm border border-white/30 mb-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-300" />
                  <div className="w-3 h-3 rounded-full bg-yellow-300" />
                  <div className="w-3 h-3 rounded-full bg-accent-strong" />
                  <span className="text-xs text-foreground/60 ml-2 font-mono">POST /api/text</span>
                </div>
                <pre className="text-xs text-foreground/70 font-mono leading-relaxed">
{`{
  "textUrl": "https://...",
  "operations": [
    { "type": "trim" },
    { "type": "minify", "params": { "level": 8 } }
  ]
}`}
                </pre>
              </div>
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-white/30">
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-emerald-700 font-semibold">200</span>
                  <span className="text-foreground/60">compressionRatio: 0.42 · tokensSaved: 1,248</span>
                </div>
              </div>
            </div>
            <div className="relative z-10 px-8 pb-8">
              <h3 className="font-semibold text-lg mb-1 text-foreground">Unified API pipeline</h3>
              <p className="text-sm text-foreground/70 leading-relaxed">
                Chain operations in a single request. Trim, compress, normalize, and send a fraction of what you used to.
              </p>
            </div>
          </div>

          {/* Card 2: Smart compression (spans 2) */}
          <div className="col-span-2 bg-background rounded-2xl border border-border flex flex-col">
            <div className="flex-1 p-8">
              <div className="text-sm text-muted leading-relaxed space-y-3">
                <p>
                  The quick brown fox jumps over the lazy dog. <span className="text-accent-strong bg-accent-light/40 px-1 rounded">[trimmed]</span> This sample demonstrates Robin&apos;s text pipeline with real-time compression feedback.
                </p>
                <p className="text-foreground">
                  Result: <span className="font-semibold">42% compression</span> with zero quality loss across 70+ languages.
                </p>
              </div>
              <div className="flex items-center gap-4 mt-6">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted">Input</span>
                  <span className="font-mono font-medium">2,400 tokens</span>
                </div>
                <span className="text-muted">→</span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted">Output</span>
                  <span className="font-mono font-medium text-accent-strong">1,392 tokens</span>
                </div>
              </div>
            </div>
            <div className="px-8 pb-8">
              <h3 className="font-semibold text-lg mb-1">Smart compression</h3>
              <p className="text-sm text-muted leading-relaxed">
                Algorithms that preserve meaning while cutting size. Your LLM gets the gist, your bank account gets the rest.
              </p>
            </div>
          </div>
        </div>

        {/* Four smaller cards */}
        <div className="grid grid-cols-4 gap-4">
          {[
            {
              icon: FileText,
              title: 'Text',
              description: 'Trim, minify, remove stopwords. Put your prompts on a diet before they hit the API.',
            },
            {
              icon: Music,
              title: 'Audio',
              description: "Silence, padding, dead air. All gone. You're not paying OpenAI to transcribe a pause.",
            },
            {
              icon: ImageIcon,
              title: 'Image',
              description: 'Smart compression that keeps visuals sharp. WebP, AVIF, and format conversion.',
              badge: 'Soon',
            },
            {
              icon: Zap,
              title: 'Presets',
              description: 'Common jobs, one click. Or stack operations exactly how you want.',
            },
          ].map(({ icon: Icon, title, description, badge }) => (
            <div key={title} className="bg-background rounded-2xl border border-border p-6 flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-background-section flex items-center justify-center mb-auto">
                <Icon className="w-5 h-5 text-foreground" />
              </div>
              <div className="mt-8">
                <h3 className="font-semibold mb-1 flex items-center gap-2">
                  {title}
                  {badge && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider bg-background-section text-muted px-1.5 py-0.5 rounded-md">
                      {badge}
                    </span>
                  )}
                </h3>
                <p className="text-sm text-muted leading-relaxed">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
