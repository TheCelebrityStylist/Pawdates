import Link from 'next/link';
import {notFound} from 'next/navigation';
import {breeds, resolveBreedPage, topicSlug, topicLabel, sharedGuidance, breedUpdated, type BreedTopicKey} from '@/content/breeds';
import {baseGraph, buildMetadata, canonicalHost, graphJson} from '@/lib/seo';
import {citationsFor, reviewerNode, veterinaryReviewer} from '@/lib/eeat';
import {pillarForPath} from '@/content/clusters';
import {ClusterNav} from '@/components/cluster-nav';
import {ContentDisclaimer} from '@/components/content-disclaimer';

export const revalidate = 86400;
const TOPIC_KEYS: BreedTopicKey[] = ['flea', 'worming', 'grooming'];
const cap = (s: string) => s.replace(/^./, (c) => c.toUpperCase());

export function generateStaticParams() {
  const out: {slug: string}[] = [];
  for (const b of breeds) {
    out.push({slug: b.slug});
    for (const k of TOPIC_KEYS) out.push({slug: topicSlug(b.slug, k)});
  }
  return out;
}

export async function generateMetadata({params}: {params: Promise<{slug: string}>}) {
  const slug = (await params).slug;
  const page = resolveBreedPage(slug);
  if (!page) return {};
  const path = `/breeds/${slug}`;
  const title = cap(page.kind === 'hub' ? page.breed.hubQuery : page.topic.query);
  const description = page.kind === 'hub' ? page.breed.summary : page.topic.intro;
  return {
    ...buildMetadata({title, description, path}),
    alternates: {canonical: `${canonicalHost}${path}`, languages: {en: `${canonicalHost}${path}`, 'x-default': `${canonicalHost}${path}`}},
  };
}

// Siblings within a breed (hub + its topic pages), excluding the current page.
function breedSiblings(breedSlug: string, currentPath: string) {
  const b = breeds.find((x) => x.slug === breedSlug)!;
  const all = [
    {path: `/breeds/${b.slug}`, title: cap(b.hubQuery)},
    ...TOPIC_KEYS.map((k) => ({path: `/breeds/${topicSlug(b.slug, k)}`, title: cap(b.topics[k].query)})),
  ];
  return all.filter((m) => m.path !== currentPath);
}

export default async function BreedPage({params}: {params: Promise<{slug: string}>}) {
  const slug = (await params).slug;
  const page = resolveBreedPage(slug);
  if (!page) notFound();
  const path = `/breeds/${slug}`;
  const b = page.breed;
  const title = cap(page.kind === 'hub' ? b.hubQuery : page.topic.query);
  const rNode = reviewerNode();
  const reviewerLine = veterinaryReviewer ? `Medically reviewed by ${veterinaryReviewer.name}, ${veterinaryReviewer.qualification} · ` : '';

  const breadcrumb = {
    '@type': 'BreadcrumbList',
    '@id': `${canonicalHost}${path}#breadcrumbs`,
    itemListElement: [
      {'@type': 'ListItem', position: 1, name: 'Home', item: canonicalHost},
      {'@type': 'ListItem', position: 2, name: 'Breeds', item: `${canonicalHost}/breeds`},
      ...(page.kind === 'topic' ? [{'@type': 'ListItem', position: 3, name: b.name, item: `${canonicalHost}/breeds/${b.slug}`}, {'@type': 'ListItem', position: 4, name: topicLabel[page.topic.key], item: `${canonicalHost}${path}`}] : [{'@type': 'ListItem', position: 3, name: b.name, item: `${canonicalHost}${path}`}]),
    ],
  };
  const articleNode = {
    '@type': 'Article',
    '@id': `${canonicalHost}${path}#article`,
    headline: title,
    description: page.kind === 'hub' ? b.summary : page.topic.intro,
    datePublished: breedUpdated,
    dateModified: breedUpdated,
    inLanguage: 'en',
    isPartOf: {'@id': `${canonicalHost}/#website`},
    author: {'@id': `${canonicalHost}/#organization`},
    publisher: {'@id': `${canonicalHost}/#organization`},
    about: b.name,
    ...(rNode ? {reviewedBy: {'@id': rNode['@id']}} : {}),
  };

  if (page.kind === 'hub') {
    const graph = [...baseGraph(path), breadcrumb, articleNode, ...(rNode ? [rNode] : [])];
    const siblings = TOPIC_KEYS.map((k) => ({path: `/breeds/${topicSlug(b.slug, k)}`, title: cap(b.topics[k].query)}));
    return (
      <main className="min-h-screen bg-[var(--paper)]">
        <article className="mx-auto max-w-3xl px-5 py-16 md:py-20">
          <nav className="mono"><Link href="/">Home</Link> / <Link href="/breeds">Breeds</Link></nav>
          <h1 className="mt-8 text-4xl md:text-5xl">{title}</h1>
          <p className="muted mt-5 text-xl">{b.summary}</p>
          <p className="mono mt-5 text-[var(--ink-60)]">{reviewerLine}Last reviewed {breedUpdated}</p>

          <div className="card mt-10 overflow-auto">
            <table className="w-full text-left">
              <thead><tr><th className="p-4">Trait</th><th className="p-4">Why it changes the routine</th></tr></thead>
              <tbody>
                <tr className="border-t border-[var(--rule)]"><td className="p-4">Size</td><td className="p-4">{b.size}</td></tr>
                <tr className="border-t border-[var(--rule)]"><td className="p-4">Coat</td><td className="p-4">{b.coat}</td></tr>
                <tr className="border-t border-[var(--rule)]"><td className="p-4">Typical lifespan</td><td className="p-4">{b.lifespan}</td></tr>
                {b.traits.map((t) => <tr className="border-t border-[var(--rule)]" key={t.label}><td className="p-4">{t.label}</td><td className="p-4">{t.detail}</td></tr>)}
              </tbody>
            </table>
          </div>

          <section className="mt-12">
            <h2 className="text-3xl">How {b.name} care differs</h2>
            {b.hubBody.map((para) => <p className="muted mt-4" key={para.slice(0, 24)}>{para}</p>)}
          </section>

          <section className="mt-12">
            <h2 className="text-3xl">{b.name} schedules</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {TOPIC_KEYS.map((k) => <Link className="card p-5" href={`/breeds/${topicSlug(b.slug, k)}`} key={k}><b>{topicLabel[k]}</b><p className="muted mt-1 text-sm">{cap(b.topics[k].query)}</p></Link>)}
            </div>
            <p className="muted mt-5">See also the full <Link className="underline" href="/learn/flea-and-tick-treatment-complete-guide">flea &amp; tick treatment guide</Link> for the reasoning behind every parasite schedule.</p>
          </section>

          <ContentDisclaimer className="mt-12" />
          <ClusterNav siblings={siblings} heading={`${b.name} schedules`} />

          <section className="mt-12">
            <h2 className="text-2xl">Free tools</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Link className="card p-5" href="/tools/is-my-pet-treatment-overdue">Is a treatment overdue?</Link>
              <Link className="card p-5" href="/tools/pet-age-calculator">Pet age calculator</Link>
            </div>
          </section>
          <aside className="card mt-8 p-7">
            <h2 className="text-2xl">Keep {b.name} care on schedule, free.</h2>
            <p className="muted mt-2">Add your {b.name.toLowerCase()} once and Tailtend tracks every flea, worm and grooming date for you.</p>
            <Link className="btn mt-5" href="/app/signup">Start free</Link>
          </aside>
        </article>
        <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(graphJson(graph))}} />
      </main>
    );
  }

  // Topic page
  const t = page.topic;
  const citations = citationsFor(t.citationTag);
  const pillarRef = pillarForPath(path);
  const siblings = breedSiblings(b.slug, path);
  const howTo = {
    '@type': 'HowTo',
    '@id': `${canonicalHost}${path}#howto`,
    name: title,
    description: t.intro,
    step: t.rows.map((r, i) => ({'@type': 'HowToStep', position: i + 1, name: r.when, text: r.what})),
  };
  const faqNode = {'@type': 'FAQPage', '@id': `${canonicalHost}${path}#faq`, mainEntity: t.faq.map((f) => ({'@type': 'Question', name: f.q, acceptedAnswer: {'@type': 'Answer', text: f.a}}))};
  const graph = [...baseGraph(path), breadcrumb, articleNode, howTo, faqNode, ...(rNode ? [rNode] : [])];

  return (
    <main className="min-h-screen bg-[var(--paper)]">
      <article className="mx-auto max-w-3xl px-5 py-16 md:py-20">
        <nav className="mono"><Link href="/">Home</Link> / <Link href="/breeds">Breeds</Link> / <Link href={`/breeds/${b.slug}`}>{b.name}</Link></nav>
        <h1 className="mt-8 text-4xl md:text-5xl">{title}</h1>
        <p className="muted mt-5 text-xl">{t.intro}</p>
        <p className="mono mt-5 text-[var(--ink-60)]">{reviewerLine}Last reviewed {breedUpdated}</p>

        <div className="card mt-10 overflow-auto">
          <table className="w-full text-left">
            <thead><tr><th className="p-4">Stage</th><th className="p-4">Interval</th><th className="p-4">What to do</th></tr></thead>
            <tbody>{t.rows.map((row) => <tr className="border-t border-[var(--rule)]" key={row.when}><td className="p-4">{row.when}</td><td className="p-4 text-[var(--health)]">{row.interval}</td><td className="p-4">{row.what}</td></tr>)}</tbody>
          </table>
        </div>

        <section className="mt-12">
          <h2 className="text-3xl">Why {b.name}s are different</h2>
          <p className="muted mt-4">{t.why}</p>
        </section>

        <section className="mt-12">
          <h2 className="text-3xl">Key points for {b.name} owners</h2>
          <ul className="mt-4 space-y-3">{t.keyPoints.map((k) => <li className="muted flex gap-3" key={k.slice(0, 20)}><span className="text-[var(--brass)]">◆</span><span>{k}</span></li>)}</ul>
        </section>

        <section className="mt-12">
          <h2 className="text-3xl">Using the schedule safely</h2>
          {sharedGuidance.map((para) => <p className="muted mt-4" key={para.slice(0, 24)}>{para}</p>)}
        </section>

        <section className="mt-12">
          <h2 className="text-3xl">Frequently asked questions</h2>
          {t.faq.map((f) => <details className="border-b border-[var(--rule)] py-5" key={f.q}><summary>{f.q}</summary><p className="muted mt-3">{f.a}</p></details>)}
        </section>

        <ContentDisclaimer className="mt-12" />

        <section className="mt-12">
          <h2 className="text-2xl">References</h2>
          <ul className="muted mt-4 space-y-2">{citations.map((c) => <li key={c.url}><a className="underline" href={c.url} target="_blank" rel="noopener noreferrer">{c.label}</a></li>)}</ul>
          <p className="mono mt-4 text-sm"><Link className="underline" href="/about">About Tailtend&apos;s editorial process</Link></p>
        </section>

        <ClusterNav pillar={pillarRef || undefined} siblings={siblings} heading={`More ${b.name} care`} />

        <section className="mt-12">
          <h2 className="text-2xl">Free tools</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Link className="card p-5" href="/tools/is-my-pet-treatment-overdue">Is this treatment overdue?</Link>
            <Link className="card p-5" href="/tools/vaccination-schedule-generator">Vaccination schedule generator</Link>
          </div>
        </section>
        <aside className="card mt-8 p-7">
          <h2 className="text-2xl">Track {title.toLowerCase()} automatically.</h2>
          <p className="muted mt-2">Add the treatment once. Tailtend remembers every next date and reminds you — free.</p>
          <Link className="btn mt-5" href="/app/signup">Start free</Link>
        </aside>
      </article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(graphJson(graph))}} />
    </main>
  );
}
