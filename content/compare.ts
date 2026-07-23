export type Compare={slug:string;title:string;query:string;updated:string;intro:string;columns:string[];rows:{feature:string;values:string[]}[];why:string;verdict:string;caveat:string;faq:{q:string;a:string}[];related:string[]};
const updated='2026-07-19';

export const compares:Compare[]=[
{slug:'pet-reminder-app-vs-calendar',title:'Pet reminder app vs. calendar app',query:'pet reminder app vs calendar app',updated,
intro:'A phone calendar is the default choice for tracking a pet’s flea, worming and vaccination dates — it’s already installed, and setting up a recurring event takes a minute. A dedicated pet reminder app is a smaller, newer category. Here’s an honest look at where each one actually wins.',
columns:['Tailtend','A generic calendar app'],
rows:[
{feature:'Setup for a new pet',values:['Species-specific presets (flea/tick, worming, heartworm, vaccination, grooming, vet check-up) already loaded','You build every recurring event yourself, from a blank canvas']},
{feature:'What happens when you mark a treatment done late',values:['The next date recalculates from the date you actually did it','A fixed-rule recurring event keeps firing on the original schedule, so a late dose quietly compresses the next interval']},
{feature:'What’s stored per treatment',values:['A structured record: product, date, pet, species','A calendar title and maybe a note field — no structured pet data']},
{feature:'Sharing with a vet or sitter',values:['Vet-ready PDF export and an iCal feed (Premium)','Share your whole personal calendar, or nothing']},
{feature:'Reminder style',values:['One calm email per due date','A push notification indistinguishable from every other calendar alert — easy to mute or miss']},
{feature:'Cost',values:['Free for 1 pet / 4 treatments, then €9.99/yr web or €4.99 once on iOS','Free — it’s the calendar app you already have']}],
why:'The real difference shows up after the first missed date, not before it. A calendar event fires on a fixed rule the moment you create it — if a flea treatment is actually given four days late, the calendar has no idea and keeps counting from the original date, so the gap either gets absorbed silently or someone has to remember to manually edit the next occurrence. A tool built around "mark it done, get the next date" recalculates from the real date every time, which matters most for exactly the treatments — worming, heartworm prevention — where drift compounds over a year of small delays.',
verdict:'A generic calendar app’s honest strength is that it’s already on your phone, already synced with the rest of your life, and costs nothing extra to try — for someone with one pet on a simple, rarely-missed schedule, that’s a completely reasonable choice and probably enough. A dedicated app like Tailtend earns its place once you’re tracking more than one pet, more than one treatment type, or you’ve ever found yourself unsure whether you actually did the flea treatment this month or just meant to.',
caveat:'Neither a calendar nor a reminder app replaces your veterinarian’s advice for your specific pet — both are organisational tools for keeping to a plan your vet has already set, not a source of that plan.',
faq:[
{q:'Can I just use a calendar app for one pet?',a:'Yes — for a single pet on a simple schedule, a recurring calendar event is a reasonable, free option. The gap shows up with multiple pets, multiple treatment types, or when doses start drifting from the original date.'},
{q:'Does Tailtend replace my calendar?',a:'No — it’s built specifically for pet treatment dates, not general scheduling. Most owners keep both and only use Tailtend for the pet-care side.'},
{q:'What actually breaks in a calendar-only setup?',a:'Fixed-rule recurrence: if a dose is given a few days early or late, the calendar keeps firing on the original interval rather than recalculating from the real date, so small delays compound over months.'}],
related:['best-pet-medication-reminder-apps-2026']},

{slug:'best-pet-medication-reminder-apps-2026',title:'Best pet medication reminder apps in 2026',query:'best pet medication reminder apps 2026',updated,
intro:'Pet medication and treatment reminder apps range from clinic-branded tools bundled by your vet practice to detailed multi-pet record-keepers. Here’s an honest comparison of three different approaches, including where each one is genuinely the better choice.',
columns:['Tailtend','PetDesk','11Pets'],
rows:[
{feature:'Works with any vet',values:['Yes — fully independent of any clinic','Best experience requires your clinic to be an enrolled PetDesk practice; the app still works standalone but appointment booking and clinic messaging depend on that','Yes — independent of any clinic']},
{feature:'Setup',values:['Species presets, ready in about 30 seconds','Often provided pre-branded by your veterinary practice','Manual entry with more fields per record']},
{feature:'Vet appointment booking',values:['No — organisational tool only, not a booking system','Yes — 24/7 appointment requests and clinic messaging are a core feature','No']},
{feature:'Record depth',values:['Focused: treatment type, date, next-due date, vet-cost log','Medical records plus a loyalty/rewards program tied to participating providers','Very detailed — hygiene tracking, supply management, weight and growth charts, exportable reports']},
{feature:'Price',values:['Free for 1 pet / 4 treatments, then €9.99/yr web or €4.99 once on iOS','Usually free to the pet owner — the subscription is typically paid by the enrolled veterinary practice','Freemium, with more advanced tracking behind a paid tier']},
{feature:'Best for',values:['Owners who want one calm reminder without extra admin, regardless of which vet they use','Owners already registered with a PetDesk-enrolled clinic who also want appointment booking in the same app','Owners who want the most granular, detailed multi-pet record and don’t mind more data entry']}],
why:'These three tools are solving slightly different problems, which is why "best" depends on what you actually want. PetDesk’s strength is real: if your clinic already uses it, you get appointment booking, clinic messaging and reminders in one free app, tied to a practice you already trust. 11Pets’ strength is also real: for an owner who wants to log hygiene routines, supply stock and detailed growth charts, its depth is hard to match. Tailtend trades that depth and the clinic tie-in for being fast to set up with any vet and staying narrowly focused on the one job of not missing a date.',
verdict:'If your vet practice already runs PetDesk, it’s a genuinely strong free option and worth using for the appointment booking alone. If you want the deepest possible multi-pet record and don’t mind more manual entry, 11Pets is built for that. If you want something that works the same way regardless of which vet you see, sets up in under a minute, and does one job — tracking treatment dates and reminding you — without extra admin, that’s what Tailtend is built for.',
caveat:'Feature sets and pricing for third-party apps change; check the current app store listing before deciding, and none of these tools substitute for your veterinarian’s specific medical advice.',
faq:[
{q:'Is PetDesk free?',a:'Usually yes for the pet owner — PetDesk’s model is typically that the enrolled veterinary practice covers the subscription, though some features work best when your specific clinic participates.'},
{q:'Is 11Pets harder to set up than Tailtend?',a:'It has more fields and tracking categories, which means more initial data entry — that depth is the trade-off for more detailed records.'},
{q:'Does Tailtend book vet appointments?',a:'No — Tailtend is an organisational reminder tool, not an appointment or clinic-messaging system.'},
{q:'Can I switch between these apps later without losing data?',a:'Generally not directly — none of the three currently offer a one-click import from a competitor, so switching means re-entering each pet’s treatment history by hand. Worth weighing before you commit to one.'}],
related:['pet-reminder-app-vs-calendar']}
];

export const compare=(slug:string)=>compares.find(item=>item.slug===slug);
for(const item of compares){const words=[item.intro,item.why,item.verdict,item.caveat,...item.faq.flatMap(f=>[f.q,f.a])].join(' ').trim().split(/\s+/).length;if(words<350||item.rows.length<4||item.faq.length<3)throw new Error(`SEO quality gate failed for ${item.slug}: ${words} words`)}
