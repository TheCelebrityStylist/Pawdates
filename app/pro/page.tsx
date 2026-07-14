import Link from 'next/link'

export const metadata = { title: 'Tailtend Pro — coming soon' }

export default function ProPage() {
  return (
    <main className="min-h-screen px-6 py-16">
      <div className="wrap max-w-3xl">
        <Link href="/" className="mono">← Tailtend</Link>
        <p className="mono mt-20 text-[var(--health)]">Tailtend Pro</p>
        <h1 className="mt-4 text-5xl">A calmer record for every home.</h1>
        <p className="muted mt-6 max-w-xl text-lg">Shared household care, richer history and reports you can hand to your vet. We’re validating the details with real pet households before we build it.</p>
        <div className="card mt-10 p-6">
          <h2 className="text-2xl">Join the early list</h2>
          <form className="mt-5 flex flex-col gap-3 sm:flex-row" action="mailto:hello@tailtend.com" method="post" encType="text/plain">
            <input required type="email" name="email" placeholder="you@example.com" aria-label="Email address" className="min-h-11 flex-1 rounded border border-[var(--rule)] bg-transparent px-4" />
            <button className="btn" type="submit">Notify me</button>
          </form>
          <p className="mono mt-4 text-xs text-[var(--ink-60)]">No launch date yet. One email when the pilot opens.</p>
        </div>
      </div>
    </main>
  )
}
