export const dynamic = 'force-dynamic'

import { Hero } from '@/app/components/landing/Hero'
import { TrustedBy } from '@/app/components/landing/TrustedBy'
import { Features } from '@/app/components/landing/Features'
import { Showcase } from '@/app/components/landing/Showcase'
import { Pricing } from '@/app/components/landing/Pricing'

function SectionDivider() {
  return (
    <div className="relative h-px bg-border/60 mx-4 md:mx-0">
      {/* Corner dots — hidden on mobile to avoid overflow */}
      <div className="absolute left-0 -top-[3px] w-1.5 h-1.5 rounded-full bg-border hidden md:block" />
      <div className="absolute right-0 -top-[3px] w-1.5 h-1.5 rounded-full bg-border hidden md:block" />
    </div>
  )
}

export default function LandingPage() {
  return (
    <>
      <Hero />
      <SectionDivider />
      <TrustedBy />
      <SectionDivider />
      <Features />
      <SectionDivider />
      {/* <HowItWorks /> */}
      {/* <SectionDivider /> */}
      <Showcase />
      <SectionDivider />
      <Pricing />
    </>
  )
}
