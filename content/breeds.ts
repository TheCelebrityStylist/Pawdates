// Programmatic breed × topic content. The template is structural; the content
// is hand-written per (breed, topic) so each page is genuinely differentiated by
// real breed anatomy/health facts — not a find-replace of the pet name. Adding a
// breed means filling in real facts, not cloning a string.

export type BreedTopicKey = 'flea' | 'worming' | 'grooming';

export type BreedTopic = {
  key: BreedTopicKey;
  query: string;                 // exact long-tail query the page targets
  intro: string;                 // breed + topic specific lede
  why: string;                   // THE differentiator — why this breed changes the routine
  rows: {when: string; interval: string; what: string}[];
  keyPoints: string[];           // breed-specific do/don't bullets
  faq: {q: string; a: string}[]; // breed-specific FAQ
  citationTag: string;           // feeds the shared citation resolver
};

export type Breed = {
  slug: string;                  // e.g. 'french-bulldog'
  name: string;                  // 'French Bulldog'
  species: 'Dog' | 'Cat';
  hubQuery: string;              // 'french bulldog care schedule'
  size: string;
  coat: string;
  lifespan: string;
  summary: string;               // hub lede
  traits: {label: string; detail: string}[];   // physical/health traits that drive care
  hubBody: string[];             // deep hub paragraphs
  topics: Record<BreedTopicKey, BreedTopic>;
};

export const topicLabel: Record<BreedTopicKey, string> = {
  flea: 'Flea & tick treatment',
  worming: 'Worming',
  grooming: 'Grooming',
};

// Shared, breed-agnostic guidance appended at render — the responsible-use frame
// every page carries. It is clearly generic and separated from the breed-specific
// body, so it deepens the page without diluting the differentiated content.
export const sharedGuidance = [
  'Whatever the breed, the treatment date that matters is the one you can prove. Record the exact date and the exact product each time — two products sold for the same purpose can carry different minimum ages, weight bands and repeat windows, and "sometime last month" is not precise enough for a vet to audit later. Photograph the label or keep the packaging so the active ingredient and batch can be recovered.',
  'Read the label before giving anything late. A missed date is a gap to close carefully, never a reason to double a dose, and never a reason to combine products to "catch up". If another product may have been used in between, or the animal is young, pregnant, elderly, underweight or unwell, confirm the last given date with your veterinary practice before resuming.',
];

const updated = '2026-08-06';

export const breeds: Breed[] = [
  {
    slug: 'french-bulldog',
    name: 'French Bulldog',
    species: 'Dog',
    hubQuery: 'french bulldog care schedule',
    size: 'Small (9–13 kg)',
    coat: 'Short, single, low-shedding',
    lifespan: '10–12 years',
    summary:
      'A French Bulldog’s care calendar is shaped by three things a generic dog schedule ignores: a brachycephalic (flat-faced) airway that makes heat and stress genuinely risky, facial and tail-pocket skin folds that trap moisture and parasites, and a small body where a few kilos change which product dose band is safe.',
    traits: [
      {label: 'Brachycephalic airway', detail: 'A short muzzle means heat, exertion and stress are handled poorly — relevant to when and how you time treatments, grooming and vet visits.'},
      {label: 'Skin folds', detail: 'Facial rope and the tail pocket trap moisture, debris and flea dirt, so parasite and skin routines need a fold-cleaning step most breeds don’t.'},
      {label: 'Small weight bands', detail: 'At 9–13 kg a Frenchie often sits near the edge of a product’s weight band; a small weight change can move the correct dose.'},
    ],
    hubBody: [
      'The single most useful habit for a French Bulldog is to weigh before you dose. Many spot-on and oral parasite products are sold in weight bands — for example "up to 10 kg" versus "10–25 kg" — and a Frenchie carrying a little extra weight can cross that line without looking any bigger. Weighing at the same time each month, ideally logged so you can see the trend, keeps every dose in the right band and doubles as an early warning for the weight gain the breed is prone to.',
      'Skin folds change almost every routine. The facial rope and, in many dogs, a tail pocket, hold moisture and debris where flea dirt, yeast and bacteria accumulate. A flea check that works on a smooth-coated dog can miss an infestation living in the folds, and a grooming routine that ignores the folds invites fold dermatitis. Wiping and thoroughly drying the folds a few times a week — more in humid weather — is the through-line across this breed’s flea, skin and grooming schedules.',
      'Finally, plan the calendar around heat and stress rather than fighting them. Vaccination, dental work and any procedure needing sedation carry more anaesthetic risk in brachycephalic dogs, so these are conversations to have early and unhurried with a vet who knows the breed. Grooming and treatments are best done in the cool part of the day, calmly, never right after exertion.',
    ],
    topics: {
      flea: {
        key: 'flea',
        query: 'french bulldog flea treatment schedule',
        intro:
          'French Bulldogs need the same monthly flea rhythm as any dog, but their skin folds and small weight bands change how you check for fleas and which product is safe to give.',
        why:
          'Two Frenchie-specific facts drive this. First, the facial folds and tail pocket trap flea dirt and moisture, so an infestation can smoulder in the folds while the short, smooth coat over the back looks clean — you have to part and inspect the folds, not just comb the topcoat. Second, flea allergy dermatitis lands hard on a breed already prone to skin trouble, so a single missed month tends to flare fold dermatitis rather than cause a few harmless bites. On dosing, a 9–13 kg Frenchie frequently sits near a product weight-band boundary; giving the smaller band to a dog that has crept over it under-doses, so weigh before each dose rather than assuming last month’s band still applies.',
        rows: [
          {when: 'Before first dose', interval: 'Once', what: 'Weigh the dog and check the exact product’s minimum age and weight band. Inspect facial folds and tail pocket, not just the coat.'},
          {when: 'Monthly (typical)', interval: 'Every 4 weeks for monthly products', what: 'Apply on schedule; re-check the folds for flea dirt at each dose. Clean and dry folds if damp.'},
          {when: 'Year-round in most homes', interval: 'No seasonal break unless your vet advises', what: 'Fleas breed indoors year-round; folds make re-infestation easy to miss, so consistency matters more than season.'},
          {when: 'At any skin flare', interval: 'As needed', what: 'Fold redness, odour or head-shaking after a missed dose warrants a vet check for flea-allergy or fold dermatitis, not just more flea product.'},
        ],
        keyPoints: [
          'Part and inspect the facial folds and tail pocket — fleas and flea dirt hide there long before the topcoat shows it.',
          'Weigh before every dose; a Frenchie near a band boundary is easy to under-dose.',
          'Treat a post-lapse skin flare as a skin problem to show the vet, not just a reason for another pipette.',
        ],
        faq: [
          {q: 'Why do I keep finding flea dirt on my French Bulldog even after treating?', a: 'Check the folds and tail pocket specifically. Flea dirt collects in warm, moist skin folds where topcoat combing misses it, and untreated folds can also reinfest the environment. If it persists, ask your vet whether the environment needs treating and whether fold dermatitis has set in.'},
          {q: 'Is a collar, spot-on or tablet best for a French Bulldog?', a: 'All can work, but products applied to or sitting in the fold area can irritate this breed’s sensitive skin, so many Frenchie owners prefer an oral product on veterinary advice. The right choice depends on the individual dog — confirm with your vet.'},
          {q: 'Does my indoor French Bulldog still need flea prevention?', a: 'Usually yes. Fleas travel indoors on people, other pets and second-hand items, and a flea-allergic Frenchie reacts badly to even a light burden. Your vet can advise on interval based on your household.'},
        ],
        citationTag: 'flea',
      },
      worming: {
        key: 'worming',
        query: 'french bulldog worming schedule',
        intro:
          'A French Bulldog’s worming interval follows the same risk-based logic as any dog, with small-breed dosing precision as the main breed-specific catch.',
        why:
          'Worming is driven by exposure — scavenging, raw feeding, hunting, contact with other dogs’ faeces and travel — far more than by breed. Where the Frenchie differs is dosing precision and delivery: at a small body weight, an accurate current weight matters more because the margin between weight bands is proportionally larger, and a flat-faced dog that gulps rather than chews can struggle with large tablets, so a small or palatable formulation given with care reduces the choking and regurgitation risk this breed is prone to. Puppies of any breed need a much tighter fortnightly-then-monthly rhythm early on; an adult Frenchie in a low-risk home typically moves to a vet-guided one-to-three-monthly interval.',
        rows: [
          {when: 'Puppy: 2 weeks–6 months', interval: 'Every 2 weeks, then monthly', what: 'Follow the vet’s puppy protocol; weigh often during rapid growth so each dose stays in band.'},
          {when: 'Adult intake', interval: 'At the first veterinary visit', what: 'Agree a risk-based interval; note scavenging, raw feeding and other pets.'},
          {when: 'Adult ongoing', interval: 'Often every 1–3 months by risk', what: 'Give a size-appropriate, palatable formulation; weigh before dosing to confirm the band.'},
          {when: 'Annual review', interval: 'At least yearly', what: 'Re-check risk with the vet; travel or a new pet can change the interval.'},
        ],
        keyPoints: [
          'Interval is set by lifestyle and risk, not by the breed — be honest about scavenging and raw feeding.',
          'Weigh before dosing; small-breed weight bands are less forgiving.',
          'Use a small or palatable formulation and give it calmly — Frenchies gulp and can regurgitate large tablets.',
        ],
        faq: [
          {q: 'How often should I worm my French Bulldog?', a: 'There is no single breed answer — most low-risk adult dogs are wormed every one to three months, but a raw-fed dog, a scavenger or a multi-pet household may need it more often. Agree the interval with your vet based on your dog’s actual life.'},
          {q: 'My Frenchie spits out or brings up worming tablets — what can I do?', a: 'Brachycephalic dogs can struggle with large tablets. Ask your vet about smaller tablets, palatable or spot-on wormers, and give with a little food, calmly, not straight after exercise.'},
        ],
        citationTag: 'worm',
      },
      grooming: {
        key: 'grooming',
        query: 'french bulldog grooming schedule',
        intro:
          'The French Bulldog’s short coat is low-maintenance, but the folds, nails and ears turn "grooming" into a skin-care routine rather than a haircut.',
        why:
          'This is where the breed diverges most from a generic dog grooming schedule. The coat itself needs little — a weekly brush and occasional bath — but the facial rope and tail pocket need cleaning and, crucially, thorough drying several times a week to prevent the fold dermatitis Frenchies are prone to; a damp fold is the problem, so drying matters as much as wiping. Nails often grow faster than a low-exercise indoor dog wears them down, and overgrown nails change a Frenchie’s already-compromised gait. Bathing is best done in a warm, calm setting and never rushed, because heat and stress are real risks for a flat-faced dog. This is genuinely different work from grooming a double-coated or long-haired breed.',
        rows: [
          {when: 'Weekly', interval: 'Once a week', what: 'Brush the short coat to remove loose hair; check skin for redness or spots.'},
          {when: 'Several times a week', interval: '3–4× weekly, daily in humid weather', what: 'Wipe and thoroughly dry facial folds and the tail pocket; a damp fold is what causes dermatitis.'},
          {when: 'Every 2–4 weeks', interval: 'As nails grow', what: 'Trim nails before they touch the ground at a stand; overgrowth alters an already-compromised gait.'},
          {when: 'Every 4–8 weeks or as needed', interval: 'By skin and smell', what: 'Bathe in a cool, calm setting; dry the folds completely afterwards. Check ears at the same time.'},
        ],
        keyPoints: [
          'Drying the folds matters as much as cleaning them — dampness, not dirt, drives fold dermatitis.',
          'Keep nails short; overgrowth worsens the breed’s gait and posture.',
          'Groom and bathe in the cool part of the day — heat and stress are genuine risks for a flat-faced dog.',
        ],
        faq: [
          {q: 'How often should I clean my French Bulldog’s folds?', a: 'Most Frenchies need their facial folds and tail pocket wiped and dried several times a week, and daily in warm or humid weather. If a fold is red, smelly or sore, have your vet check for infection before it worsens.'},
          {q: 'Do French Bulldogs need professional grooming?', a: 'Rarely for the coat, which is short and low-shedding, but some owners use a groomer for nails, ears and bathing. The fold care is a daily-life routine you do at home between any professional visits.'},
        ],
        citationTag: 'grooming',
      },
    },
  },
  {
    slug: 'labrador-retriever',
    name: 'Labrador Retriever',
    species: 'Dog',
    hubQuery: 'labrador retriever care schedule',
    size: 'Large (25–36 kg)',
    coat: 'Short, dense double coat, water-resistant',
    lifespan: '11–13 years',
    summary:
      'A Labrador’s care schedule is driven by the opposite pressures to a small indoor breed: high outdoor and water exposure that raises parasite risk and washes off some treatments, a dense double coat that hides fleas and sheds seasonally, and a strong tendency to gain weight that quietly moves dosing bands.',
    traits: [
      {label: 'High outdoor & water exposure', detail: 'Swimming, retrieving and scavenging raise flea, tick and worm exposure — and water can reduce the effect of some topical treatments.'},
      {label: 'Dense double coat', detail: 'A water-resistant undercoat hides fleas and ticks and sheds heavily twice a year, so checking and grooming both take more work.'},
      {label: 'Weight gain tendency', detail: 'Labradors are genuinely food-motivated and gain weight easily, which silently moves them up product dose bands and raises joint and health risk.'},
    ],
    hubBody: [
      'For a Labrador, exposure is the organising principle. A dog that swims, retrieves in undergrowth and scavenges meets far more fleas, ticks and worm sources than an indoor pet, so year-round, uninterrupted prevention is the norm rather than a seasonal option — and after travel or a change in activity, it is worth reviewing the interval with a vet rather than assuming last year’s plan still fits.',
      'Water and coat change how treatments and checks actually work. Some topical spot-on products are reduced by frequent swimming or bathing, so a keen swimmer may be better suited to a water-fast or oral product on veterinary advice; the point is to match the product to the dog’s real life, not the average dog’s. The dense double coat also hides parasites, so a proper check means getting fingers down to the skin — especially after walks in tick country — not just looking at the topcoat.',
      'The quiet variable is weight. Labradors gain weight easily, and a dog that has drifted from 30 to 34 kg may cross a product’s dosing band without the owner noticing. Weighing on a regular cadence — and logging it so the trend is visible — keeps every parasite dose correct and catches the weight creep that drives joint disease and shortens the breed’s life.',
    ],
    topics: {
      flea: {
        key: 'flea',
        query: 'labrador retriever flea and tick treatment schedule',
        intro:
          'For a Labrador, flea and tick prevention is really a question of exposure and product choice: an active, water-loving dog needs consistent, year-round cover and a product that survives its lifestyle.',
        why:
          'A Labrador’s life maximises exposure — undergrowth, water, wildlife and scavenging all raise the chance of picking up fleas and, importantly, ticks, which the breed’s outdoor habits make a real disease risk. Two breed-specific factors shape the plan. First, the dense, water-resistant double coat hides fleas and, more seriously, ticks, so a real check means parting the coat to the skin and running fingers over the head, ears, neck and between the toes after walks — a visual glance at the topcoat misses attached ticks. Second, frequent swimming and bathing can reduce the effectiveness of some topical spot-ons, so a keen swimmer is often better on a water-fast or oral product; match the product to the dog, on veterinary advice. Because exposure is continuous, most Labradors stay on year-round prevention with no seasonal break.',
        rows: [
          {when: 'Before first dose', interval: 'Once', what: 'Weigh the dog, confirm the product band, and pick a formulation that suits a swimmer (water-fast topical or oral) with your vet.'},
          {when: 'Monthly (typical)', interval: 'Every 4 weeks for monthly products', what: 'Apply on schedule; after each swim-heavy period, confirm the product is still within its effective window.'},
          {when: 'After every walk in tick habitat', interval: 'Same day', what: 'Check to the skin — head, ears, neck, armpits, groin and between toes. Remove attached ticks promptly and correctly.'},
          {when: 'Year-round', interval: 'No seasonal break unless advised', what: 'Continuous exposure means continuous cover; review interval after travel or a change in activity.'},
        ],
        keyPoints: [
          'Check to the skin, not the topcoat — the double coat hides attached ticks after outdoor walks.',
          'Match the product to a swimmer: frequent water can reduce some topicals, so ask about water-fast or oral options.',
          'Keep it year-round; a Labrador’s exposure doesn’t take a winter break.',
        ],
        faq: [
          {q: 'Does swimming wash off my Labrador’s flea treatment?', a: 'It can reduce the effectiveness of some topical spot-on products if the dog swims or is bathed frequently. If your Labrador is a keen swimmer, ask your vet about water-fast topicals or an oral product, and confirm the re-application interval for the specific product you use.'},
          {q: 'How do I check a thick-coated Labrador for ticks?', a: 'Run your fingers slowly over the skin — not just the topcoat — focusing on the head, ears, neck, armpits, groin and between the toes, ideally after every walk in long grass or woodland. Remove any attached tick promptly with a proper tick tool and monitor the site.'},
          {q: 'Should flea and tick prevention be year-round for a Labrador?', a: 'For most active, outdoor Labradors, yes. Ticks can be active in mild winters and fleas breed indoors year-round, so continuous cover is usually recommended — confirm the plan and product with your vet.'},
        ],
        citationTag: 'flea tick',
      },
      worming: {
        key: 'worming',
        query: 'labrador retriever worming schedule',
        intro:
          'A Labrador’s worming interval sits at the higher-frequency end for adult dogs, because scavenging, hunting and outdoor life keep exposure high.',
        why:
          'Worming frequency is set by exposure, and a Labrador’s exposure is typically high: they scavenge readily, retrieve and mouth things on walks, drink from puddles and streams, and many hunt or work. That lifestyle pushes a lot of adult Labradors toward the more frequent end of the usual one-to-three-monthly range rather than the minimum, and lungworm — carried by slugs and snails a scavenging dog may eat — is a specific reason many vets recommend a product with lungworm cover for dogs like this. Being a large breed, accurate current weight matters for correct dosing, and the breed’s weight-gain tendency means the right band can change between doses, so weigh before worming rather than assuming.',
        rows: [
          {when: 'Puppy: 2 weeks–6 months', interval: 'Every 2 weeks, then monthly', what: 'Follow the vet’s puppy protocol; weigh frequently as a large-breed puppy grows fast.'},
          {when: 'Adult intake', interval: 'At the first veterinary visit', what: 'Agree a risk-based interval; flag scavenging, hunting, raw feeding and slug/snail exposure for lungworm.'},
          {when: 'Adult ongoing', interval: 'Often monthly to quarterly by risk', what: 'Higher-exposure dogs sit at the frequent end; weigh before dosing to keep a large dog in band.'},
          {when: 'Annual review', interval: 'At least yearly', what: 'Reassess with the vet after travel, new activities or a house move.'},
        ],
        keyPoints: [
          'Be honest about scavenging and hunting — it usually pushes the interval to the frequent end.',
          'Ask specifically about lungworm cover; slug and snail contact is a real Labrador risk.',
          'Weigh before dosing; weight creep can move a large dog out of band.',
        ],
        faq: [
          {q: 'How often should a Labrador be wormed?', a: 'Many active, scavenging Labradors are wormed monthly to quarterly, toward the more frequent end of the usual range, because their exposure is high. There is no single correct number — set it with your vet based on your dog’s lifestyle.'},
          {q: 'Does my Labrador need lungworm protection?', a: 'If your dog scavenges, eats grass, or mouths slugs and snails — common in the breed — many vets recommend a wormer with lungworm cover. Ask your practice, since lungworm risk varies by region and can be serious.'},
        ],
        citationTag: 'worm',
      },
      grooming: {
        key: 'grooming',
        query: 'labrador retriever grooming schedule',
        intro:
          'A Labrador’s short coat looks low-maintenance, but the dense double coat, seasonal moult, and floppy ears make grooming more involved than it appears.',
        why:
          'The Labrador’s coat is short but double-layered and water-resistant, and it moults heavily twice a year — the seasonal "coat blow" — when daily brushing with a de-shedding tool genuinely reduces the loose undercoat that otherwise ends up through the house and can mat near the skin. Between moults a weekly brush is enough. The breed’s real grooming risk, though, is the ears: floppy, and often wet from swimming, they trap moisture and are prone to infection, so a Labrador’s grooming routine has to include regular ear checks and careful drying after every swim — a step a prick-eared or non-swimming breed doesn’t need. Frequent bathing is best avoided, as it strips the coat’s natural water resistance; spot-clean and let the coat do its job.',
        rows: [
          {when: 'Weekly (most of the year)', interval: 'Once a week', what: 'Brush the double coat to lift loose undercoat and spread skin oils; check skin and ears.'},
          {when: 'Twice-yearly moult', interval: 'Daily during the coat blow', what: 'Use a de-shedding/undercoat tool daily for a few weeks each spring and autumn.'},
          {when: 'After every swim', interval: 'Same day', what: 'Dry the ears carefully; trapped water is the main driver of the breed’s ear infections.'},
          {when: 'Every 2–4 weeks', interval: 'As needed', what: 'Trim nails; check ears and teeth. Bathe only when genuinely dirty to preserve coat water-resistance.'},
        ],
        keyPoints: [
          'Brush daily during the twice-yearly moult, weekly the rest of the year.',
          'Dry the ears after every swim — floppy wet ears are the breed’s main grooming-linked health risk.',
          'Don’t over-bathe; it strips the double coat’s natural water resistance.',
        ],
        faq: [
          {q: 'How do I manage Labrador shedding?', a: 'Brush weekly year-round and daily during the two big seasonal moults using an undercoat or de-shedding tool. This lifts the dead undercoat before it sheds through the house or mats against the skin. Over-bathing won’t help and can strip the coat.'},
          {q: 'Why does my Labrador keep getting ear infections?', a: 'Floppy ears plus frequent swimming trap moisture, which is a common cause. Dry the ears thoroughly after every swim and check them weekly; if you see redness, odour or head-shaking, have your vet examine them rather than treating blindly.'},
        ],
        citationTag: 'grooming',
      },
    },
  },
  {
    slug: 'maine-coon',
    name: 'Maine Coon',
    species: 'Cat',
    hubQuery: 'maine coon care schedule',
    size: 'Large (5–8 kg, some larger)',
    coat: 'Long, dense, semi-water-resistant',
    lifespan: '12–15 years',
    summary:
      'A Maine Coon’s care schedule differs from a typical cat’s on two fronts: a long, dense coat that mats and hides parasites and demands real grooming, and a large body that can exceed the weight bands many cat products are designed around.',
    traits: [
      {label: 'Long dense coat', detail: 'Mats form behind the ears, in the armpits and around the britches, and the coat hides fleas — so grooming and flea checks both take real work.'},
      {label: 'Large body weight', detail: 'At 5–8 kg (sometimes more) a Maine Coon can sit at or above the top of standard "cat" product weight bands, so dosing must be checked, not assumed.'},
      {label: 'Breed health watch-points', detail: 'The breed has recognised predispositions (including a heart condition, HCM) that make regular vet checks and honest weight tracking worthwhile.'},
    ],
    hubBody: [
      'Grooming is the backbone of a Maine Coon’s routine in a way it simply isn’t for a short-haired cat. The long, dense coat mats in predictable places — behind the ears, in the armpits, along the belly and around the "britches" at the back legs — and a mat that reaches the skin is painful and can hide a parasite or a skin problem. Several sessions a week, not the occasional groom a shorthair needs, keep the coat open and let you feel the skin underneath.',
      'Size quietly changes dosing. Many flea and worming products are banded by weight, and "cat" bands are often designed around a 4–5 kg animal; a large Maine Coon can sit at the top of, or above, that band. That doesn’t mean guessing — it means weighing and checking the product band with a vet, because an under-dosed large cat is a common and avoidable reason prevention "stops working". Weighing regularly also supports the breed’s health watch-points, where a genuine weight change is worth noticing early.',
      'Finally, match the parasite plan to the cat’s real access. An indoor-only Maine Coon and one with garden or hunting access have very different flea and worm exposure, and the long coat makes a light flea burden easy to miss on both. Regular skin-level checks during grooming are the practical way to catch problems the coat would otherwise hide.',
    ],
    topics: {
      flea: {
        key: 'flea',
        query: 'maine coon flea treatment schedule',
        intro:
          'A Maine Coon needs the same monthly flea logic as any cat, but its long coat and large size change how you check for fleas and how you get the dose right.',
        why:
          'Two breed facts matter here. First, the long, dense coat hides fleas and flea dirt completely — combing the topcoat isn’t enough, so you have to part the fur down to the skin, especially at the base of the tail and along the back, and use a fine flea comb the coat would otherwise defeat. A light burden that a shorthair owner would spot early can go unnoticed on a Maine Coon until the cat is itchy or a tapeworm (spread by swallowed fleas) appears. Second, size: at 5–8 kg or more, a Maine Coon can sit above the standard cat weight band a product assumes, so an "up to 4 kg" pipette may under-dose a large individual. Weigh and confirm the band with your vet rather than assuming one cat product fits all. Applying spot-on also means parting the dense fur to reach skin at the base of the skull — product left on the coat doesn’t work.',
        rows: [
          {when: 'Before first dose', interval: 'Once', what: 'Weigh the cat and confirm the product’s weight band — a large Maine Coon may exceed a standard "cat" band.'},
          {when: 'Monthly (typical)', interval: 'Every 4 weeks for monthly products', what: 'Apply spot-on to skin at the base of the skull, parting the dense coat; product on fur won’t absorb.'},
          {when: 'At each groom', interval: 'Several times a week', what: 'Part the coat to the skin and flea-comb the tail base and back; the coat hides a light burden.'},
          {when: 'Year-round in most homes', interval: 'No seasonal break unless advised', what: 'Fleas breed indoors; swallowed fleas can cause tapeworm, so consistency matters even for indoor cats.'},
        ],
        keyPoints: [
          'Part the coat to the skin and flea-comb the tail base — the long coat hides fleas from a topcoat glance.',
          'Weigh and confirm the band; a large Maine Coon can exceed a standard cat product’s weight range.',
          'Apply spot-on to skin at the base of the skull, not onto the fur.',
        ],
        faq: [
          {q: 'How do I check a long-haired Maine Coon for fleas?', a: 'Part the fur down to the skin — a surface look won’t do it — and work a fine-toothed flea comb through the base of the tail and along the back, where flea dirt collects. Do it during your regular grooming sessions so a light burden is caught early.'},
          {q: 'Is a standard cat flea treatment enough for a large Maine Coon?', a: 'Not always. Many cat products are banded for a 4–5 kg cat, and a large Maine Coon can weigh more, so an "up to 4 kg" dose may be too little. Weigh your cat and confirm the correct product and dose with your vet.'},
          {q: 'My indoor Maine Coon has fleas — how?', a: 'Fleas travel indoors on people, other pets and second-hand items, and a dense coat hides them until the burden builds. Indoor cats still benefit from prevention; ask your vet about the right interval for your household.'},
        ],
        citationTag: 'flea',
      },
      worming: {
        key: 'worming',
        query: 'maine coon worming schedule',
        intro:
          'A Maine Coon’s worming interval depends far more on whether it hunts and goes outdoors than on the breed — with large-cat dosing as the main breed-specific point.',
        why:
          'Worming frequency for any cat is set by exposure, and the biggest lever is outdoor and hunting access: a cat that catches prey or roams meets tapeworm and roundworm sources an indoor cat largely avoids, and fleas themselves spread tapeworm, which ties the worming plan to the flea plan. Where the Maine Coon differs is size — a large cat can exceed the weight assumptions built into a standard cat wormer, so the dose must be matched to actual weight, not to "one cat tablet". The long coat also makes it easy to miss the flea burden that drives tapeworm, so effective flea control is part of effective worm control in this breed. A hunting Maine Coon typically needs worming every one to three months; a strictly indoor, flea-controlled one may need it less often, on veterinary advice.',
        rows: [
          {when: 'Kitten: 3 weeks–6 months', interval: 'Every 2 weeks, then monthly', what: 'Follow the vet’s kitten protocol; weigh often as a slow-maturing large breed grows.'},
          {when: 'Adult intake', interval: 'At the first veterinary visit', what: 'Agree an interval based on hunting and outdoor access; pair with flea control for tapeworm.'},
          {when: 'Adult ongoing', interval: 'Every 1–3 months if hunting; less if strictly indoor', what: 'Match the dose to actual weight — a large Maine Coon may exceed a standard cat band.'},
          {when: 'Annual review', interval: 'At least yearly', what: 'Reassess with the vet; new outdoor access or a lapse in flea control changes worm risk.'},
        ],
        keyPoints: [
          'Hunting and outdoor access set the interval — an indoor, flea-controlled cat needs it less often.',
          'Worm control and flea control are linked: fleas spread tapeworm, and the long coat hides fleas.',
          'Dose to actual weight; a large Maine Coon can exceed a standard cat wormer’s band.',
        ],
        faq: [
          {q: 'How often should I worm my Maine Coon?', a: 'A hunting or outdoor Maine Coon is often wormed every one to three months; a strictly indoor cat with good flea control may need it less frequently. Set the interval with your vet based on your cat’s actual access to prey and other animals.'},
          {q: 'My Maine Coon is indoor-only — does it still need worming?', a: 'Often less often, but not never — fleas can still arrive indoors and spread tapeworm, and some worms have indoor routes. Keep flea control consistent and confirm the worming interval with your vet.'},
        ],
        citationTag: 'worm',
      },
      grooming: {
        key: 'grooming',
        query: 'maine coon grooming schedule',
        intro:
          'Grooming is the defining care task for a Maine Coon: the long, dense coat mats in predictable places and needs several sessions a week to stay healthy.',
        why:
          'Unlike most cats, a Maine Coon cannot fully maintain its own coat. The dense, semi-water-resistant fur mats in specific high-friction spots — behind the ears, in the armpits, along the belly and around the britches at the back legs — and a mat that tightens to the skin is painful, hides parasites and skin problems, and often ends in a vet or groomer having to shave it out. Several combing sessions a week, working down to the skin with a comb rather than skimming the surface with a brush, prevent this and let you feel for lumps, flea dirt and sore spots. Seasonal shedding adds to the load in spring and autumn. Long-coated cats also swallow more hair when self-grooming, so regular combing reduces hairballs, and the fur around the back end and paws sometimes needs light trimming for hygiene. This is a real, ongoing commitment, not the occasional groom a shorthair needs.',
        rows: [
          {when: 'Several times a week', interval: '3–4× weekly, minimum', what: 'Comb to the skin at the mat-prone spots — behind ears, armpits, belly, britches — not just the surface.'},
          {when: 'Seasonal moult', interval: 'Daily in spring and autumn', what: 'Increase combing during heavy shedding to control loose coat and reduce hairballs.'},
          {when: 'Every few weeks', interval: 'As needed', what: 'Check and gently trim hygiene areas around the back end and paw pads; check nails and ears.'},
          {when: 'At any tight mat', interval: 'Promptly', what: 'Don’t cut blind at a skin-tight mat — a groomer or vet should remove it to avoid nicking the skin.'},
        ],
        keyPoints: [
          'Comb to the skin several times a week at the mat-prone spots — surface brushing leaves mats forming underneath.',
          'Increase grooming during the seasonal moult; it also cuts hairballs.',
          'Never cut a tight mat blind — have a groomer or vet remove it to avoid injuring the skin.',
        ],
        faq: [
          {q: 'How often does a Maine Coon need grooming?', a: 'Most Maine Coons need combing several times a week, and daily during heavy seasonal shedding. The dense coat mats faster than a cat can manage alone, so a consistent routine — combing down to the skin, not just the surface — is essential.'},
          {q: 'How do I deal with mats on my Maine Coon?', a: 'Prevent them by combing the mat-prone areas (behind the ears, armpits, belly, britches) several times a week. If a mat has tightened to the skin, don’t cut it blind — scissors near matted skin cause frequent injuries — have a groomer or vet remove it safely.'},
        ],
        citationTag: 'grooming',
      },
    },
  },
];

export const breed = (slug: string) => breeds.find((b) => b.slug === slug);

// All breed-page slugs: a hub per breed plus one page per topic.
export type BreedPage =
  | {kind: 'hub'; breed: Breed}
  | {kind: 'topic'; breed: Breed; topic: BreedTopic};

export function breedPageSlugs(): string[] {
  const out: string[] = [];
  for (const b of breeds) {
    out.push(b.slug); // hub
    for (const key of Object.keys(b.topics) as BreedTopicKey[]) out.push(`${b.slug}-${b.topics[key].key === 'flea' ? 'flea-treatment-schedule' : b.topics[key].key === 'worming' ? 'worming-schedule' : 'grooming-schedule'}`);
  }
  return out;
}

// Resolve a URL slug to the breed + optional topic it represents.
export function resolveBreedPage(slug: string): BreedPage | null {
  const b0 = breed(slug);
  if (b0) return {kind: 'hub', breed: b0};
  for (const b of breeds) {
    for (const key of Object.keys(b.topics) as BreedTopicKey[]) {
      const suffix = key === 'flea' ? 'flea-treatment-schedule' : key === 'worming' ? 'worming-schedule' : 'grooming-schedule';
      if (slug === `${b.slug}-${suffix}`) return {kind: 'topic', breed: b, topic: b.topics[key]};
    }
  }
  return null;
}

export function topicSlug(breedSlug: string, key: BreedTopicKey) {
  const suffix = key === 'flea' ? 'flea-treatment-schedule' : key === 'worming' ? 'worming-schedule' : 'grooming-schedule';
  return `${breedSlug}-${suffix}`;
}

export const breedUpdated = updated;
