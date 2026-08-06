// The topic-cluster graph. Maps each pillar to its cluster members (existing
// schedules/guides + new breed pages) and provides the reverse lookup a member
// page uses to link back to its pillar. Titles are resolved from source so they
// never drift. This IS the internal-linking structure — rendered by
// components/cluster-nav.tsx on both pillar and member pages.
import {schedule} from './schedules';
import {guides} from './guides';
import {breeds, topicSlug} from './breeds';
import {pillar} from './pillars';

export type ClusterMember = {path: string; title: string};

const cap = (s: string) => s.replace(/^./, (c) => c.toUpperCase());
const sched = (slug: string): ClusterMember => ({path: `/schedules/${slug}`, title: cap(schedule(slug)?.query || slug)});
const guide = (slug: string): ClusterMember => ({path: `/guides/${slug}`, title: guides.find((g) => g.slug === slug)?.title || slug});

type ClusterDef = {pillarSlug: string; members: () => ClusterMember[]};

const clusterDefs: ClusterDef[] = [
  {
    pillarSlug: 'flea-and-tick-treatment-complete-guide',
    members: () => [
      sched('dog-flea-treatment-schedule'),
      sched('cat-flea-treatment-schedule'),
      sched('puppy-flea-treatment-schedule'),
      sched('kitten-flea-treatment-schedule'),
      sched('tick-treatment-schedule-dog'),
      ...breeds.map((b) => ({path: `/breeds/${topicSlug(b.slug, 'flea')}`, title: cap(b.topics.flea.query)})),
    ],
  },
  {
    pillarSlug: 'puppy-and-kitten-vaccination-complete-guide',
    members: () => [
      sched('puppy-vaccination-schedule'),
      sched('kitten-vaccination-schedule'),
      sched('adult-dog-booster-schedule'),
      sched('adult-cat-booster-schedule'),
      sched('dog-rabies-vaccination-schedule'),
      sched('cat-rabies-vaccination-schedule'),
      sched('dog-kennel-cough-vaccination-schedule'),
      guide('puppy-first-year-schedule'),
      guide('kitten-first-year-schedule'),
    ],
  },
];

export function pillarMembers(pillarSlug: string): ClusterMember[] {
  return clusterDefs.find((c) => c.pillarSlug === pillarSlug)?.members() || [];
}

export type PillarRef = {slug: string; title: string; path: string};

// Which pillar (if any) a given member page belongs to — drives the "Part of…" backlink.
export function pillarForPath(path: string): PillarRef | null {
  for (const c of clusterDefs) {
    if (c.members().some((m) => m.path === path)) {
      const p = pillar(c.pillarSlug);
      if (p) return {slug: p.slug, title: p.title, path: `/learn/${p.slug}`};
    }
  }
  return null;
}

// Sibling members of a page within its cluster (excludes the page itself).
export function siblingsOf(path: string, limit = 6): ClusterMember[] {
  for (const c of clusterDefs) {
    const members = c.members();
    if (members.some((m) => m.path === path)) return members.filter((m) => m.path !== path).slice(0, limit);
  }
  return [];
}
