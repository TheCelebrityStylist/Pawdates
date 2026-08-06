import Link from 'next/link';
import {breeds, topicSlug, topicLabel, type BreedTopicKey} from '@/content/breeds';
import {baseGraph, buildMetadata, canonicalHost, graphJson} from '@/lib/seo';

const TOPIC_KEYS: BreedTopicKey[] = ['flea', 'worming', 'grooming'];
export const revalidate = 86400;
export function generateMetadata() {
  return buildMetadata({title: 'Breed care schedules', description: 'Breed-specific flea, worming and grooming schedules — how a French Bulldog, Labrador or Maine Coon changes the routine, and why.', path: '/breeds'});
}

export default function BreedsIndex() {
  const graph = [...baseGraph('/breeds'), {
    '@type': 'CollectionPage', '@id': `${canonicalHost}/breeds#collection`, name: 'Breed care schedules',
    hasPart: breeds.map((b) => ({'@type': 'Article', name: `${b.name} care schedule`, url: `${canonicalHost}/breeds/${b.slug}`})),
  }];
  return (
    <main className="min-h-screen bg-[var(--paper)]">
      <div className="mx-auto max-w-3xl px-5 py-16 md:py-20">
        <nav className="mono"><Link href="/">Home</Link> / Breeds</nav>
        <h1 className="mt-8 text-4xl md:text-5xl">Breed care schedules</h1>
        <p className="muted mt-5 text-xl">Care advice changes with anatomy. These pages set out how a specific breed’s size, coat and health traits change its flea, worming and grooming routine — with the real reasons, not a find-and-replace of the pet’s name.</p>
        <div className="mt-10 space-y-6">
          {breeds.map((b) => (
            <section className="card p-6" key={b.slug}>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="text-2xl"><Link className="underline" href={`/breeds/${b.slug}`}>{b.name}</Link></h2>
                <span className="mono text-[var(--ink-60)]">{b.species} · {b.size}</span>
              </div>
              <p className="muted mt-3">{b.summary}</p>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                {TOPIC_KEYS.map((k) => <Link className="underline text-[var(--brass-ink)]" href={`/breeds/${topicSlug(b.slug, k)}`} key={k}>{topicLabel[k]} →</Link>)}
              </div>
            </section>
          ))}
        </div>
        <p className="muted mt-10">Looking for the general reasoning? Read the <Link className="underline" href="/learn/flea-and-tick-treatment-complete-guide">complete flea &amp; tick guide</Link> and the <Link className="underline" href="/learn/puppy-and-kitten-vaccination-complete-guide">puppy &amp; kitten vaccination guide</Link>.</p>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(graphJson(graph))}} />
    </main>
  );
}
