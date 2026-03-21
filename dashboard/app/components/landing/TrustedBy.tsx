export function TrustedBy() {
  return (
    <section className="py-16 border-t border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        <p className="text-sm text-muted mb-10">Trusted by developers tired of paying for whitespace</p>

        {/* Plain gray placeholder cards — 3 cols mobile, 4 sm, 6 md+ */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="h-10 rounded-xl bg-background-section"
            />
          ))}
        </div>
      </div>
    </section>
  )
}
