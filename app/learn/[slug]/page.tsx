import Link from 'next/link';
import {notFound} from 'next/navigation';
import {pillar, pillars} from '@/content/pillars';
import {pillarMembers} from '@/content/clusters';
import {baseGraph, buildMetadata, canonicalHost, graphJson} from '@/lib/seo';
import {citationsFor, reviewerNode, veterinaryReviewer} from '@/lib/eeat';
import {ClusterNav} from '@/components/cluster-nav';
import {ContentDisclaimer} from '@/components/content-disclaimer';

export const revalidate = 86400;
export function generateStaticParams() {
  return pillars.map((p) => ({slug: p.slug}));
}
export async function generateMetadata({params}: {params: Promise<{slug: string}>}) {
  const p = pillar((await params).slug);
  if (!p) return {};
  const path = `/learn/${p.slug}`;
  return {...buildMetadata({title: p.title, description: p.lede, path}), alternates: {canonical: `${canonicalHost}${path}`, languages: {en: `${canonicalHost}${path}`, 'x-default': `${canonicalHost}${path}`}}};
}

export default async function PillarPage({params}: {params: Promise<{slug: string}>}) {
  const p = pillar((await params).slug);
  if (!p) notFound();
  const path = `/learn/${p.slug}`;
  const members = pillarMembers(p.slug);
  const citations = citationsFor(p.citationTags);
  const rNode = reviewerNode();
  const reviewerLine = veterinaryReviewer ? `Medically reviewed by ${veterinaryReviewer.name}, ${veterinaryReviewer.qualification} · ` : '';

  const graph = [
    ...baseGraph(path),
    {'@type': 'BreadcrumbList', '@id': `${canonicalHost}${path}#breadcrumbs`, itemListElement: [
      {'@type': 'ListItem', position: 1, name: 'Home', item: canonicalHost},
      {'@type': 'ListItem', position: 2, name: 'Learn', item: `${canonicalHost}/learn`},
      {'@type': 'ListItem', position: 3, name: p.title, item: `${canonicalHost}${path}`},
    ]},
    {'@type': 'Article', '@id': `${canonicalHost}${path}#article`, headline: p.title, description: p.lede, datePublished: p.updated, dateModified: p.updated, inLanguage: 'en', author: {'@id': `${canonicalHost}/#organization`}, publisher: {'@id': `${canonicalHost}/#organization`}, isPartOf: {'@id': `${canonicalHost}/#website`}, ...(rNode ? {reviewedBy: {'@id': rNode['@id']}} : {})},
    {'@type': 'FAQPage', '@id': `${canonicalHost}${path}#faq`, mainEntity: p.faq.map((f) => ({'@type': 'Question', name: f.q, acceptedAnswer: {'@type': 'Answer', text: f.a}}))},
    ...(rNode ? [rNode] : []),
  ];

  return (
    <main className="min-h-screen bg-[var(--paper)]">
      <article className="mx-auto max-w-3xl px-5 py-16 md:py-20">
        <nav className="mono"><Link href="/">Home</Link> / <Link href="/learn">Learn</Link></nav>
        <p className="mono mt-8 text-[var(--brass-ink)]">Complete guide</p>
        <h1 className="mt-2 text-4xl md:text-5xl">{p.title}</h1>
        <p className="muted mt-5 text-xl">{p.lede}</p>
        <p className="mono mt-5 text-[var(--ink-60)]">{reviewerLine}Last reviewed {p.updated}</p>

        {p.sections.map((s) => (
          <section className="mt-12" key={s.h}>
            <h2 className="text-3xl">{s.h}</h2>
            {s.body.map((para) => <p className="muted mt-4" key={para.slice(0, 24)}>{para}</p>)}
            {s.table && (
              <div className="card mt-6 overflow-auto">
                <table className="w-full text-left">
                  <thead><tr>{s.table.head.map((h) => <th className="p-4" key={h}>{h}</th>)}</tr></thead>
                  <tbody>{s.table.rows.map((row) => <tr className="border-t border-[var(--rule)]" key={row[0]}>{row.map((cell, i) => <td className="p-4" key={i}>{cell}</td>)}</tr>)}</tbody>
                </table>
              </div>
            )}
          </section>
        ))}

        <section className="mt-12">
          <h2 className="text-3xl">Frequently asked questions</h2>
          {p.faq.map((f) => <details className="border-b border-[var(--rule)] py-5" key={f.q}><summary>{f.q}</summary><p className="muted mt-3">{f.a}</p></details>)}
        </section>

        <ContentDisclaimer className="mt-12" />

        <section className="mt-12">
          <h2 className="text-2xl">References</h2>
          <ul className="muted mt-4 space-y-2">{citations.map((c) => <li key={c.url}><a className="underline" href={c.url} target="_blank" rel="noopener noreferrer">{c.label}</a></li>)}</ul>
          <p className="mono mt-4 text-sm"><Link className="underline" href="/about">About Tailtend&apos;s editorial process</Link></p>
        </section>

        <ClusterNav siblings={members} heading="Schedules in this guide" />

        <aside className="card mt-12 p-7">
          <h2 className="text-2xl">Stop tracking this in your head.</h2>
          <p className="muted mt-2">Tailtend keeps every flea, worm, vaccination and grooming date for each pet, and reminds you before they’re due — free to start.</p>
          <Link className="btn mt-5" href="/app/signup">Start free</Link>
        </aside>
      </article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(graphJson(graph))}} />
    </main>
  );
}
