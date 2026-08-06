// Pillar guides: broad, genuinely comprehensive hubs that anchor a topic cluster.
// These are hand-written and long (1500+ words) — real specificity, decision
// tables and safety detail, not padded filler. The cluster wiring lives in
// content/clusters.ts; each pillar links out to its members and each member
// links back (see components/cluster-nav.tsx).

export type PillarSection = {h: string; body: string[]; table?: {head: string[]; rows: string[][]}};
export type Pillar = {
  slug: string;
  title: string;
  query: string;
  updated: string;
  lede: string;
  citationTags: string;
  sections: PillarSection[];
  faq: {q: string; a: string}[];
};

const updated = '2026-08-06';

export const pillars: Pillar[] = [
  {
    slug: 'flea-and-tick-treatment-complete-guide',
    title: 'Flea & tick treatment: the complete guide',
    query: 'flea and tick treatment complete guide',
    updated,
    citationTags: 'flea tick worm',
    lede:
      'Flea and tick control fails for predictable reasons: treating the pet but not the home, stopping in winter, using the wrong product for the species or weight, or losing track of the date. This guide covers the whole picture — the flea life cycle that dictates the schedule, how the main product types differ, the safety lines that separate dogs from cats, and how to build a routine you can actually keep. It links out to the specific schedules for each pet and breed at the end.',
    sections: [
      {
        h: 'Why the schedule is set by the flea life cycle, not the fleas you see',
        body: [
          'The adult fleas on your pet are a small fraction of the problem. The rest — eggs, larvae and pupae — are in the carpet, the bedding, the car and the sofa. Eggs laid on the animal fall off into the environment within hours, and pupae can wait weeks or months for the vibration and warmth that signal a host is near. This is why an infestation seems to "come back" days after you treat, and why a single dose is rarely a fix.',
          'It also explains the monthly rhythm of most preventives: the product has to keep killing newly emerged adults faster than the environment can produce them, month after month, until the reservoir is exhausted. Skipping a month reopens the cycle. In a genuine infestation, treating the environment — thorough vacuuming (and discarding the bag), hot-washing bedding, and sometimes a household product on veterinary advice — alongside every animal in the home is what actually breaks it.',
        ],
      },
      {
        h: 'The main product types, and how to choose',
        body: [
          'There is no single best product — the right choice depends on the species, weight, lifestyle and any health conditions of the individual animal, which is a conversation for your vet. But it helps to understand the trade-offs before that conversation.',
        ],
        table: {
          head: ['Type', 'How it works', 'Best suited to', 'Watch-outs'],
          rows: [
            ['Oral (tablet/chew)', 'Whole-body via the bloodstream', 'Swimmers, bathed dogs, households wanting nothing on the coat', 'Prescription in many regions; give with food; not all cover ticks'],
            ['Spot-on (topical)', 'Spreads across skin/coat from one site', 'Many dogs and cats; broad availability', 'Frequent swimming/bathing can reduce some; apply to skin, not fur; species-specific'],
            ['Collar', 'Slow release over months', 'Owners wanting long, low-effort cover', 'Fit and removal matter; can irritate skin folds; check the duration claim'],
          ],
        },
      },
      {
        h: 'The safety line that matters most: dogs are not cats',
        body: [
          'The single most important safety point in flea control is that some dog products — particularly certain concentrated permethrin spot-ons — are highly toxic, even fatal, to cats. Cats are exposed not only by direct application but by grooming or close contact with a recently treated dog. Never use a dog product on a cat, keep the two species’ products physically separate, and in a multi-pet home confirm with your vet that a dog’s product is safe around the cats before you apply it.',
          'Product weight bands are the next line. "Up to 4 kg" versus "4–8 kg" is not a suggestion — under-dosing a large animal is a common reason prevention appears to stop working, and over-dosing a small one risks harm. Weigh before dosing, especially for small dogs and large cats that sit near a band boundary, and for growing puppies and kittens whose weight changes month to month.',
        ],
      },
      {
        h: 'Ticks: a different risk on the same schedule',
        body: [
          'Fleas are mostly a welfare and skin problem; ticks are a disease-transmission problem. A tick can transmit disease before an owner notices it is attached, so for dogs with outdoor, woodland or long-grass exposure, tick cover is not optional and checking to the skin after walks — head, ears, neck, armpits, groin and between the toes — is part of the routine, not a substitute for prevention.',
          'Not every flea product covers ticks, and tick activity is no longer strictly seasonal in many mild climates, so the "do I need year-round cover?" question is really about local risk and your pet’s exposure. That is a per-pet decision to make with your vet, and it is one of the things worth revisiting after travel or a change in where you walk.',
        ],
      },
      {
        h: 'Why prevention "stops working" — and it usually isn’t resistance',
        body: [
          'When owners say a product failed, the cause is far more often a schedule or application problem than genuine resistance. The usual suspects: a missed or late month reopening the cycle; the environment never treated, so the pet is reinfested from the carpet; a topical applied to fur instead of skin, or washed off by swimming; the wrong weight band; or only one of several pets in the home being treated. Work through those before concluding a product is ineffective — and if you have genuinely ruled them out, your vet can advise on switching.',
          'The thread running through all of these is record-keeping. A prevention plan you can prove — exact date, exact product, every animal — is one you can audit when something seems off. A plan you are reconstructing from memory is one where the gap is invisible.',
        ],
      },
      {
        h: 'Puppies, kittens and other special cases',
        body: [
          'Young animals are the most common place a schedule goes wrong, because their weight changes month to month and many products carry a strict minimum age or weight. A pipette that is correct for a 12-week puppy can be the wrong band four weeks later, so growing animals need weighing before each dose, not an assumption carried over from last month. Newborns and very young kittens have specific, limited product options — this is firmly a vet-led decision, not a supermarket one.',
          'Pregnant and nursing animals, underweight or unwell pets, and animals on other medication are the other cases where the general schedule stops applying. Some parasite products are not licensed in pregnancy; some interact with other drugs. When any of these apply, the right move is to confirm the product and interval with your veterinary practice rather than following a generic calendar. The schedule in this guide is the healthy-adult baseline those exceptions are measured against.',
        ],
      },
      {
        h: 'Building a routine you can actually keep',
        body: [
          'The best flea and tick plan is the one that survives a busy month, and that comes down to three habits. First, treat every animal in the home on the same cadence — a single untreated pet keeps the environment stocked and quietly undermines everyone else’s prevention. Second, decide the season question deliberately with your vet and then stop re-deciding it every month; for most households continuous year-round cover is simpler and safer than starting and stopping. Third, write down the date and product every time, because the failure mode is almost never "the product didn’t work" and almost always "we lost track of when the last dose was".',
          'That last habit is where a record that calculates the next due date earns its place: it turns "I think we did the cat sometime last month" into a specific date you can act on, across every pet in the home, which is exactly the coordination a multi-person household struggles to hold in its head.',
        ],
      },
    ],
    faq: [
      {q: 'Do indoor pets need flea and tick treatment?', a: 'Usually yes for fleas, which travel indoors on people, other pets and second-hand items and breed indoors year-round. Tick risk is lower for a strictly indoor pet. Confirm the right plan for your household with your vet.'},
      {q: 'How long does it take to get rid of a flea infestation?', a: 'Often several weeks to a few months, because you have to outlast the eggs, larvae and pupae already in the environment, not just the adults on the pet. Treat every animal in the home on schedule and treat the environment alongside them.'},
      {q: 'Can I use a dog flea treatment on my cat?', a: 'No. Some dog products — especially certain permethrin spot-ons — are highly toxic to cats, even through close contact with a treated dog. Only ever use a product labelled for the species, and confirm multi-pet safety with your vet.'},
      {q: 'Is year-round flea and tick prevention necessary?', a: 'For many pets, yes — fleas breed indoors year-round and ticks can be active in mild winters — but it depends on your pet’s exposure and local risk. It is a per-pet decision to make with your veterinarian.'},
    ],
  },
  {
    slug: 'puppy-and-kitten-vaccination-complete-guide',
    title: 'Puppy & kitten vaccination: the complete guide',
    query: 'puppy and kitten vaccination complete guide',
    updated,
    citationTags: 'vaccination booster rabies',
    lede:
      'A young animal’s vaccination course is a sequence, not a single event, and the timing is dictated by biology most owners are never told about — fading maternal antibodies, a closing socialisation window, and the difference between core and lifestyle vaccines. This guide explains how the course actually works and why the dates matter, then links out to the specific schedules for puppies, kittens, boosters, rabies and the first year.',
    sections: [
      {
        h: 'Why the first course is spaced out instead of given at once',
        body: [
          'Puppies and kittens are born with some protection borrowed from their mother — maternal antibodies — which fade over the first weeks of life. Those same antibodies can also block a vaccine from working while they are still present, and they fade at an unpredictable rate that differs from animal to animal. There is no way to know the exact day they drop low enough for a vaccine to take, so the early doses are spaced out to catch that window whenever it opens, typically finishing around 16 weeks in puppies and a little later in some kittens.',
          'This is why "just give one and be done" does not work, and why finishing the course on schedule matters: an incomplete course can leave a gap in protection precisely when maternal cover has faded but vaccine immunity has not fully built.',
        ],
      },
      {
        h: 'Core versus lifestyle vaccines',
        body: [
          'Vaccines fall into two groups. Core vaccines protect against diseases that are severe, common or a public-health risk and are recommended for essentially every animal. Lifestyle (non-core) vaccines are recommended based on the individual’s exposure — boarding, group classes, hunting, travel or local disease pressure. Which vaccines are core varies by country and by current guidelines, so the specific protocol is your vet’s call.',
          'This split is why two healthy puppies on the same street can have slightly different vaccine cards, and why the honest answer to "what does my pet need?" is a conversation about how the animal actually lives, not a fixed list.',
        ],
        table: {
          head: ['Milestone', 'Typical timing', 'What happens'],
          rows: [
            ['First dose', '6–9 weeks', 'Begins the primary course; often given by the breeder or shelter'],
            ['Subsequent doses', 'Every 2–4 weeks', 'Spaced to catch the fading maternal-antibody window'],
            ['Course completes', '~16 weeks (dogs); a little later in some kittens', 'Primary immunity established for core diseases'],
            ['First booster', '6–12 months', 'Consolidates protection; sets the adult schedule'],
            ['Adult boosters', 'Every 1–3 years by vaccine', 'Duration of immunity differs between vaccines'],
          ],
        },
      },
      {
        h: 'Which diseases the core vaccines actually cover',
        body: [
          'It helps to know what the core vaccines are protecting against, because the names on a vaccine card are otherwise opaque. The exact list and terminology vary by country and by current guidelines — your vet’s protocol is authoritative — but the commonly-core diseases are broadly consistent, and they are core precisely because they are severe, widespread or a human-health risk.',
          'The table below is an orientation, not a prescription: whether a given vaccine is core for your pet, and when, is a decision for your veterinarian based on local disease pressure, the law where you live, and how your animal lives.',
        ],
        table: {
          head: ['Species', 'Commonly core', 'Common lifestyle (non-core)'],
          rows: [
            ['Dogs', 'Distemper, adenovirus/infectious hepatitis, parvovirus — plus rabies where required by law', 'Kennel cough (Bordetella/parainfluenza), leptospirosis, Lyme — by exposure'],
            ['Cats', 'Feline panleukopenia, feline herpesvirus, feline calicivirus — plus rabies where required', 'Feline leukaemia (FeLV), especially for cats with outdoor access — by exposure'],
          ],
        },
      },
      {
        h: 'The socialisation window closes on its own schedule',
        body: [
          'Behaviourists treat the first few months as a sensitive period for lifelong temperament — roughly up to 12–16 weeks in puppies and, notably, earlier in kittens, often cited as ending around 7 weeks. That window closes regardless of where the animal is in its vaccine course, which creates a genuine tension: waiting for full immunity before any exposure can mean missing the period that shapes behaviour for life.',
          'Modern guidance increasingly favours careful, controlled socialisation before the course finishes — clean environments, known-healthy animals, positive experiences — rather than total isolation. The exact balance is a per-puppy, per-kitten decision to make with your vet, weighing local disease risk against the behavioural cost of waiting.',
        ],
      },
      {
        h: 'Boosters, rabies and travel: precise dates start to matter legally',
        body: [
          'After the first year, boosters move to a longer interval that differs by vaccine — some core vaccines provide multi-year protection while some lifestyle vaccines are annual. Rabies is a category of its own: where it is required, its validity is defined by law and by the specific product, and travel between countries adds waiting periods and paperwork where the exact date, product and batch matter legally, not just clinically.',
          'This is the point where a reconstructed-from-memory vaccine history stops being good enough. A precise, dated record — ideally one that also flags when the next dose is due — is what a boarding facility, a new vet or a border official can actually rely on.',
        ],
      },
      {
        h: 'Vaccine reactions: what’s normal and when to call',
        body: [
          'Most young animals are mildly off for a day after a vaccine — a little sleepy, a slightly sore injection site, sometimes a reduced appetite for a meal or two. These are expected and settle on their own. Knowing this baseline matters, because it lets you recognise the small number of reactions that are not routine and need a call.',
          'Seek prompt veterinary advice for facial or muzzle swelling, hives, repeated vomiting or diarrhoea, difficulty breathing, collapse or marked lethargy, especially in the minutes to hours after a vaccination. True vaccine reactions are uncommon, but they are time-sensitive, so it is worth noting the date and time of each dose and keeping the practice number to hand for the rest of that day rather than waiting to "see how it goes".',
        ],
      },
      {
        h: 'Boosters, titre testing and the over-vaccination question',
        body: [
          'Owners increasingly ask whether annual boosters are always necessary, and it is a reasonable question — the answer is that it depends on the vaccine. Some core vaccines provide several years of protection, which is why modern schedules space them out rather than repeating everything yearly, while some lifestyle vaccines genuinely are annual. Blanket statements in either direction ("boost everything every year" or "never boost again") both miss this distinction.',
          'Titre testing — a blood test that estimates existing antibody levels for certain core diseases — is one tool some owners and vets use to inform booster timing for those specific vaccines. It does not apply to every vaccine (rabies validity, for instance, is defined by law and product, not by a titre), and interpreting it is a veterinary judgement. Rescue animals and those with unknown history are a related case: with no reliable record, a vet may restart part of a course rather than assume prior protection. In all of these, the underlying need is the same — a trustworthy, dated record so decisions are made on evidence rather than guesswork.',
        ],
      },
    ],
    faq: [
      {q: 'Why does my puppy or kitten need several vaccine doses?', a: 'Because maternal antibodies fade at an unpredictable rate and can block a vaccine while present. Spacing the doses catches the window when protection can take, wherever it falls, so the course usually finishes around 16 weeks in puppies.'},
      {q: 'Can my puppy go outside before the vaccination course is finished?', a: 'The socialisation window closes around 12–16 weeks regardless of vaccine status, so many vets now recommend careful, controlled exposure to clean environments and known-healthy animals before the course ends. Balance this against local disease risk with your vet.'},
      {q: 'How often are adult boosters needed?', a: 'It depends on the vaccine — some core vaccines protect for several years, while some lifestyle vaccines are annual. Your vet sets the schedule based on which vaccines your pet has and how it lives.'},
      {q: 'Why do rabies dates matter so much for travel?', a: 'Where rabies vaccination is required, its legal validity is defined by the product and the exact date, and cross-border travel adds waiting periods and paperwork. A precise dated record is essential for travel, not just good practice.'},
      {q: 'Can I vaccinate a rescue puppy or kitten with no medical history?', a: 'Yes, and it is common. With no reliable record a vet cannot assume prior protection, so they will typically start or restart the appropriate course rather than guess. Keep a precise dated record from that first visit so the animal never has to be treated as an unknown again.'},
      {q: 'My pet missed a booster by a few months — do we start over?', a: 'Not always, but it depends on the vaccine and how overdue it is, so it is a call for your vet rather than a fixed rule. Bring the last confirmed date; that single piece of information is what lets the practice decide whether to resume or restart part of the course.'},
    ],
  },
];

export const pillar = (slug: string) => pillars.find((p) => p.slug === slug);

// Rough visible word count for the SEO gate / reporting.
export function pillarWordCount(p: Pillar): number {
  const parts = [p.lede, ...p.sections.flatMap((s) => [s.h, ...s.body, ...(s.table ? [...s.table.head, ...s.table.rows.flat()] : [])]), ...p.faq.flatMap((f) => [f.q, f.a])];
  return parts.join(' ').trim().split(/\s+/).length;
}
