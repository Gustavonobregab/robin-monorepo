'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Braces,
  Building2,
  Check,
  Code2,
  FileText,
  ImageIcon,
  Layers,
  LayoutDashboard,
  Loader2,
  Mic,
  Rocket,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/app/components/ui/Button'
import { cn } from '@/app/lib/utils'
import { getProfile, updateOnboarding } from '@/app/http/users'
import { toastApiError } from '@/app/http/errors'
import type { OnboardingRole, OnboardingUsageMode, OnboardingUseCase } from '@/types'

const ROLES: { value: OnboardingRole; icon: LucideIcon; label: string; description: string }[] = [
  { value: 'developer', icon: Code2, label: 'Developer', description: 'Building or integrating a product' },
  { value: 'founder', icon: Rocket, label: 'Founder or indie hacker', description: 'Working on my own product' },
  { value: 'agency', icon: Users, label: 'Agency or freelancer', description: 'Working on client projects' },
  { value: 'company', icon: Building2, label: 'Company team', description: 'Part of a larger team' },
]

const USE_CASES: { value: OnboardingUseCase; icon: LucideIcon; label: string; description: string }[] = [
  { value: 'text', icon: FileText, label: 'Text', description: 'Prompts, documents, payloads' },
  { value: 'audio', icon: Mic, label: 'Audio', description: 'Voice notes, podcasts, calls' },
  { value: 'image', icon: ImageIcon, label: 'Image', description: 'Photos, assets, uploads' },
]

const USAGE_MODES: { value: OnboardingUsageMode; icon: LucideIcon; label: string; description: string }[] = [
  { value: 'site', icon: LayoutDashboard, label: 'On the dashboard', description: 'Upload and compress right here' },
  { value: 'api', icon: Braces, label: 'Through the API', description: 'Integrate Robin into my product' },
  { value: 'both', icon: Layers, label: 'Both', description: 'Dashboard and API' },
]

const STEPS = [
  { title: 'What best describes you?', subtitle: 'This helps us tailor Robin for you.' },
  { title: 'What will you compress?', subtitle: 'Pick everything that applies.' },
  { title: 'How will you use Robin?', subtitle: 'We will drop you in the right place.' },
]

function destination(mode: OnboardingUsageMode, useCases: OnboardingUseCase[]) {
  if (mode === 'api' || mode === 'both') return '/dashboard/keys'
  return useCases.length ? `/dashboard/${useCases[0]}` : '/dashboard/home'
}

function OptionRow({
  icon: Icon,
  label,
  description,
  selected,
  onClick,
}: {
  icon: LucideIcon
  label: string
  description: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border-[1.5px] p-3.5 text-left transition-colors',
        selected ? 'border-primary bg-black/[0.03]' : 'border-border hover:bg-black/[0.03]',
      )}
    >
      <span
        className={cn(
          'grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors',
          selected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground',
        )}
      >
        <Icon className="h-[1.05rem] w-[1.05rem]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="block text-[13px] text-muted-foreground">{description}</span>
      </span>
      {selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
    </button>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const { data } = useSWR('users/me', getProfile)

  const [step, setStep] = useState(0)
  const [role, setRole] = useState<OnboardingRole | null>(null)
  const [useCases, setUseCases] = useState<OnboardingUseCase[]>([])
  const [usageMode, setUsageMode] = useState<OnboardingUsageMode | null>(null)
  const [finishing, setFinishing] = useState(false)

  useEffect(() => {
    if (data?.data.onboardingCompleted) router.replace('/dashboard/home')
  }, [data, router])

  function toggleUseCase(value: OnboardingUseCase) {
    setUseCases((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    )
  }

  function next() {
    // Persist each step as it happens so partial answers survive abandonment
    if (step === 0 && role) updateOnboarding({ role }).catch(() => {})
    if (step === 1 && useCases.length) updateOnboarding({ useCases }).catch(() => {})
    setStep((s) => s + 1)
  }

  async function finish() {
    if (!usageMode) return
    setFinishing(true)
    try {
      await updateOnboarding({ usageMode, completed: true })
      router.replace(destination(usageMode, useCases))
    } catch (err) {
      await toastApiError(err, 'Could not save your answers')
      setFinishing(false)
    }
  }

  async function skip() {
    setFinishing(true)
    try {
      await updateOnboarding({ completed: true })
      router.replace('/dashboard/home')
    } catch (err) {
      await toastApiError(err, 'Could not skip onboarding')
      setFinishing(false)
    }
  }

  const canContinue =
    step === 0 ? role !== null : step === 1 ? useCases.length > 0 : usageMode !== null

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="space-y-3 text-center">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Robin
          </span>
          <div className="mx-auto flex w-24 gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors',
                  i <= step ? 'bg-primary' : 'bg-black/[0.08]',
                )}
              />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8"
          >
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-medium tracking-tight text-foreground">
                {STEPS[step].title}
              </h1>
              <p className="text-sm text-muted-foreground">{STEPS[step].subtitle}</p>
            </div>

            <div className="mt-8 space-y-2.5">
              {step === 0 &&
                ROLES.map((o) => (
                  <OptionRow
                    key={o.value}
                    icon={o.icon}
                    label={o.label}
                    description={o.description}
                    selected={role === o.value}
                    onClick={() => setRole(o.value)}
                  />
                ))}
              {step === 1 &&
                USE_CASES.map((o) => (
                  <OptionRow
                    key={o.value}
                    icon={o.icon}
                    label={o.label}
                    description={o.description}
                    selected={useCases.includes(o.value)}
                    onClick={() => toggleUseCase(o.value)}
                  />
                ))}
              {step === 2 &&
                USAGE_MODES.map((o) => (
                  <OptionRow
                    key={o.value}
                    icon={o.icon}
                    label={o.label}
                    description={o.description}
                    selected={usageMode === o.value}
                    onClick={() => setUsageMode(o.value)}
                  />
                ))}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex items-center gap-3">
          {step > 0 && (
            <Button
              variant="ghost"
              size="lg"
              onClick={() => setStep((s) => s - 1)}
              disabled={finishing}
            >
              Back
            </Button>
          )}
          <div className="flex-1" />
          <Button
            size="lg"
            className="min-w-32"
            disabled={!canContinue || finishing}
            onClick={step === 2 ? finish : next}
          >
            {finishing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : step === 2 ? (
              'Get started'
            ) : (
              'Continue'
            )}
          </Button>
        </div>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={skip}
            disabled={finishing}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )
}
