import Link from 'next/link';
import {pillars} from '@/content/pillars';
import {pillarMembers} from '@/content/clusters';
import {baseGraph, buildMetadata, canonicalHost, graphJson} from '@/lib/seo';

export const revalidate = 86400;
export function generateMetadata() {
  return buildMetadata({title: 'Learn: complete pet-care guides', description: 'In-depth, vet-referenced guides to the core pet-care topics — flea & tick treatment, puppy & kitten vaccination — each linking to the specific schedules underneath.', path: '/learn'});
}

export default function LearnIndex() {
  const graph = [...baseGraph('/learn'), {'@type': 'CollectionPage', '@id': `${canonicalHost}/learn#collection`, name: 'Complete pet-care guides', hasPart: pillars.map((p) => ({'@type': 'Article', name: p.title, url: `${canonicalHost}/learn/${p.slug}`}))}];
  return (
    <main className="min-h-screen bg-[var(--paper)]">
      <div className="mx-auto max-w-3xl px-5 py-16 md:py-20">
        <nav className="mono"><Link href="/">Home</Link> / Learn</nav>
        <h1 className="mt-8 text-4xl md:text-5xl">Complete pet-care guides</h1>
        <p className="muted mt-5 text-xl">The comprehensive guides behind our schedules. Each pillar explains the reasoning for a whole topic, then links to every specific schedule and breed page underneath it.</p>
        <div className="mt-10 space-y-6">
          {pillars.map((p) => (
            <section className="card p-6 md:p-7" key={p.slug}>
              <h2 className="text-2xl"><Link className="underline" href={`/learn/${p.slug}`}>{p.title}</Link></h2>
              <p className="muted mt-3">{p.lede}</p>
              <p className="mono mt-4 text-[var(--ink-60)]">{pillarMembers(p.slug).length} schedules in this guide</p>
            </section>
          ))}
        </div>
        <p className="muted mt-10">Prefer to browse by pet? See <Link className="underline" href="/breeds">breed care schedules</Link> and the <Link className="underline" href="/schedules">full schedule library</Link>.</p>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(graphJson(graph))}} />
    </main>
  );
}
