import Link from 'next/link';
import type {ClusterMember, PillarRef} from '@/content/clusters';

// The internal-linking component: a "Part of [pillar]" backlink and the related
// pages in the same cluster. Used on pillar pages (heading "In this guide") and
// on member pages (heading "Related in this guide") so every page in a cluster
// links to the pillar and the pillar links out to every member.
export function ClusterNav({pillar, siblings, heading = 'In this guide'}: {pillar?: PillarRef; siblings: ClusterMember[]; heading?: string}) {
  if (!pillar && siblings.length === 0) return null;
  return (
    <nav className="card mt-12 p-6 md:p-7" aria-label="Related in this topic cluster">
      {pillar && (
        <p className="mono text-[var(--ink-60)]">
          Part of <Link className="underline" href={pillar.path}>{pillar.title}</Link>
        </p>
      )}
      {siblings.length > 0 && (
        <>
          <p className={`rule-label${pillar ? ' mt-5' : ''}`}>{heading}</p>
          <ul className="mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-2">
            {siblings.map((s) => (
              <li key={s.path}><Link className="underline" href={s.path}>{s.title}</Link></li>
            ))}
          </ul>
        </>
      )}
    </nav>
  );
}
