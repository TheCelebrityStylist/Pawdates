import Link from 'next/link';import {notFound} from 'next/navigation';import {admin} from '@/lib/supabase';import type {Behaviour,Feeding,HouseAccess,HouseLogistics,PlayEnrichment,RoutineNotes,ToiletHygiene} from '@/lib/care-profile';import {goodWithLabel} from '@/lib/care-profile';import {SitterCheckoff} from '@/components/sitter-checkoff';

function dueLabel(date:string){const today=new Date();today.setHours(0,0,0,0);const due=new Date(`${date}T00:00:00`);const days=Math.round((due.getTime()-today.getTime())/86400000);if(days<0)return {text:`Overdue by ${Math.abs(days)} day${days===-1?'':'s'}`,overdue:true};if(days===0)return {text:'Due today',overdue:false};if(days===1)return {text:'Due tomorrow',overdue:false};return {text:`Due in ${days} days`,overdue:false}}
function ageLabel(birth?:string|null){if(!birth)return null;const days=Math.floor((Date.now()-new Date(birth).getTime())/86400000);if(days<0)return null;if(days<365)return `${Math.max(1,Math.floor(days/30))} month${Math.floor(days/30)===1?'':'s'} old`;return `${Math.floor(days/365)} year${Math.floor(days/365)===1?'':'s'} old`}
function hasAny(obj:Record<string,unknown>|undefined|null){return !!obj&&Object.values(obj).some(v=>v!==undefined&&v!==null&&v!=='')}

export async function generateMetadata(){return {title:'Shared pet record',robots:{index:false,follow:false}}}

export default async function SharePage({params}:{params:Promise<{token:string}>}){
const {token}=await params;
const db=admin();
const {data:pet}=await db.from('pets').select('id,name,species,birth_date,share_enabled,user_id').eq('share_token',token).single();
if(!pet||!pet.share_enabled)notFound();

const [{data:treatments},{data:profileRow},{data:items},{data:checksToday},{data:owner}]=await Promise.all([
db.from('treatments').select('id,name,type,next_due').eq('pet_id',pet.id).order('next_due'),
db.from('pet_profile').select('*').eq('pet_id',pet.id).maybeSingle(),
db.from('routine_items').select('*').eq('pet_id',pet.id).order('sort_order').order('time'),
db.from('routine_checks').select('routine_item_id,checked_by,checked_at').eq('pet_id',pet.id).eq('checked_for_date',new Date().toISOString().slice(0,10)),
db.from('profiles').select('email').eq('user_id',pet.user_id).maybeSingle()
]);

const profile=profileRow;
const feeding=(profile?.feeding||{}) as Feeding;
const routineNotes=(profile?.routine_notes||{}) as RoutineNotes;
const toiletHygiene=(profile?.toilet_hygiene||{}) as ToiletHygiene;
const behaviour=(profile?.behaviour||{}) as Behaviour;
const houseLogistics=(profile?.house_logistics||{}) as HouseLogistics;
const houseAccess=(profile?.house_access||{}) as HouseAccess;
const playEnrichment=(profile?.play_enrichment||{}) as PlayEnrichment;
const forbiddenFoods=profile?.forbidden_foods||[];
const showHouseAccess=!!profile?.house_access_shared&&hasAny(houseAccess);
const nextMed=(treatments||[]).find(t=>t.type==='medication');
const checksMap=new Map((checksToday||[]).map(c=>[c.routine_item_id,c]));
const timelineItems=(items||[]).map(i=>{const check=checksMap.get(i.id);return {...i,checked:!!check,checkedBy:check?.checked_by,checkedAt:check?.checked_at}});

return <main className="min-h-screen bg-[var(--paper)] px-5 py-10"><div className="mx-auto max-w-2xl">
<p className="mono text-[var(--health)]">Sitter mode · read-only, shared by the owner</p>

<div className="card mt-6 p-6 md:p-8">
<header className="flex flex-wrap items-center gap-6 border-b border-[var(--rule)] pb-6"><span className="tag"><span>{pet.name[0]}</span></span><div><h1 className="text-3xl">{pet.name}</h1><p className="mono mt-2 text-[var(--ink-60)] capitalize">{pet.species}{ageLabel(pet.birth_date)?` · ${ageLabel(pet.birth_date)}`:''}</p></div></header>
{profile?.essentials_flag&&<div className="mt-5 rounded-lg p-4" style={{background:'rgba(190,61,42,.08)',border:'1px solid var(--stamp)'}}><p className="mono text-sm" style={{color:'var(--stamp)'}}>Read this first</p><p className="mt-1 font-medium">{profile.essentials_flag}</p></div>}
<div className="mt-5 grid gap-3 sm:grid-cols-2">
{houseLogistics.vetName&&<div className="ledger-row"><div><b>Vet</b><p className="mono mt-1 text-[var(--ink-60)]">{houseLogistics.vetName}</p></div>{houseLogistics.vetPhone&&<a className="btn ghost" href={`tel:${houseLogistics.vetPhone}`}>Call</a>}</div>}
{nextMed&&<div className="ledger-row"><div><b>Next medication</b><p className="mono mt-1 text-[var(--ink-60)]">{nextMed.name}</p></div><span className={`chip ${dueLabel(nextMed.next_due).overdue?'overdue':'health'}`}>{dueLabel(nextMed.next_due).text}</span></div>}
{(feeding.feedingTimes||[]).length>0&&<div className="ledger-row"><div><b>Feeding times</b></div><span className="mono">{(feeding.feedingTimes||[]).join(' · ')}</span></div>}
</div>
{owner?.email&&<a className="mt-5 inline-block text-sm underline" href={`mailto:${owner.email}?subject=${encodeURIComponent(`About ${pet.name}`)}`}>Message the owner</a>}
</div>

{timelineItems.length>0&&<section className="card mt-6 p-6 md:p-8">
<h2 className="text-2xl">Today&apos;s timeline</h2>
<div className="mt-4 space-y-2">{timelineItems.filter(i=>!i.sitter_can_check).map(i=><div className="ledger-row" key={i.id}><b>{i.time} · {i.label}</b><span className="mono text-[var(--ink-60)]">{i.category}</span></div>)}</div>
<SitterCheckoff token={token} items={timelineItems} petSlug={pet.id}/>
</section>}

{forbiddenFoods.length>0&&<section className="mt-6 rounded-lg p-5" style={{background:'rgba(190,61,42,.08)',border:'1px solid var(--stamp)'}}>
<p className="mono text-sm" style={{color:'var(--stamp)'}}>Strictly no</p>
<p className="mt-2 font-medium">{forbiddenFoods.join(', ')}</p>
</section>}

{hasAny(feeding)&&<section className="card mt-6 p-6 md:p-8"><h2 className="text-2xl">Food &amp; feeding</h2>
{feeding.brand&&<p className="muted mt-3">{feeding.product?`${feeding.brand} — ${feeding.product}`:feeding.brand}</p>}
{feeding.amountPerMeal&&<p className="muted mt-2">{feeding.amountPerMeal}{feeding.mealsPerDay?` · ${feeding.mealsPerDay}x per day`:''}</p>}
{feeding.serveNotes&&<p className="muted mt-2">{feeding.serveNotes}</p>}
{feeding.treatsAllowed&&<p className="muted mt-2"><b>Treats:</b> {feeding.treatsAllowed}</p>}
{feeding.waterNotes&&<p className="muted mt-2"><b>Water:</b> {feeding.waterNotes}</p>}
{feeding.supplements&&<p className="muted mt-2"><b>Supplements:</b> {feeding.supplements}</p>}
{feeding.whereKept&&<p className="muted mt-2"><b>Kept:</b> {feeding.whereKept}</p>}
{feeding.restockBrand&&<p className="muted mt-2"><b>Running low?</b> {feeding.restockBrand}</p>}
</section>}

{hasAny(routineNotes)&&<section className="card mt-6 p-6 md:p-8"><h2 className="text-2xl">Exercise &amp; alone time</h2>
{routineNotes.favouriteRoute&&<p className="muted mt-3">{routineNotes.favouriteRoute}</p>}
{routineNotes.aloneTimeTolerance&&<p className="muted mt-2"><b>Alone time:</b> {routineNotes.aloneTimeTolerance}</p>}
{routineNotes.aloneTimeBehaviour&&<p className="muted mt-2">{routineNotes.aloneTimeBehaviour}</p>}
</section>}

{hasAny(toiletHygiene)&&<section className="card mt-6 p-6 md:p-8"><h2 className="text-2xl">Toilet &amp; hygiene</h2>
{toiletHygiene.dogWalkSchedule&&<p className="muted mt-3">{toiletHygiene.dogWalkSchedule}</p>}
{toiletHygiene.dogSignals&&<p className="muted mt-2"><b>Signals:</b> {toiletHygiene.dogSignals}</p>}
{toiletHygiene.dogAccidentsProtocol&&<p className="muted mt-2">{toiletHygiene.dogAccidentsProtocol}</p>}
{toiletHygiene.catLitterType&&<p className="muted mt-2">{toiletHygiene.catLitterType}</p>}
{toiletHygiene.catBoxLocations&&<p className="muted mt-2"><b>Box locations:</b> {toiletHygiene.catBoxLocations}</p>}
{toiletHygiene.catCleaningRoutine&&<p className="muted mt-2">{toiletHygiene.catCleaningRoutine}</p>}
{toiletHygiene.grooming&&<p className="muted mt-2"><b>Grooming:</b> {toiletHygiene.grooming}</p>}
</section>}

{hasAny(behaviour)&&<section className="card mt-6 p-6 md:p-8"><h2 className="text-2xl">Behaviour &amp; temperament</h2>
{behaviour.personality&&<p className="muted mt-3">{behaviour.personality}</p>}
{behaviour.fearsTriggers&&<p className="muted mt-2"><b>Fears &amp; triggers:</b> {behaviour.fearsTriggers}</p>}
{behaviour.commandsKnown&&<p className="muted mt-2"><b>Commands:</b> {behaviour.commandsKnown}</p>}
<div className="mt-3 flex flex-wrap gap-2">
{behaviour.goodWithKids&&<span className="chip">Kids: {goodWithLabel[behaviour.goodWithKids]}</span>}
{behaviour.goodWithDogs&&<span className="chip">Dogs: {goodWithLabel[behaviour.goodWithDogs]}</span>}
{behaviour.goodWithCats&&<span className="chip">Cats: {goodWithLabel[behaviour.goodWithCats]}</span>}
{behaviour.goodWithStrangers&&<span className="chip">Strangers: {goodWithLabel[behaviour.goodWithStrangers]}</span>}
</div>
{behaviour.handling&&<p className="muted mt-3"><b>Handling:</b> {behaviour.handling}</p>}
{behaviour.comfort&&<p className="muted mt-2"><b>What calms them:</b> {behaviour.comfort}</p>}
</section>}

{(hasAny(houseLogistics)||showHouseAccess)&&<section className="card mt-6 p-6 md:p-8"><h2 className="text-2xl">House &amp; logistics</h2>
{houseLogistics.whereThingsLive&&<p className="muted mt-3">{houseLogistics.whereThingsLive}</p>}
{houseLogistics.houseRules&&<p className="muted mt-2"><b>House rules:</b> {houseLogistics.houseRules}</p>}
{houseLogistics.otherPets&&<p className="muted mt-2"><b>Other pets:</b> {houseLogistics.otherPets}</p>}
{showHouseAccess&&<div className="mt-4 border-t border-[var(--rule)] pt-4">
{houseAccess.entryNotes&&<p className="muted"><b>Getting in:</b> {houseAccess.entryNotes}</p>}
{houseAccess.alarmNotes&&<p className="muted mt-2"><b>Alarm:</b> {houseAccess.alarmNotes}</p>}
{houseAccess.whichDoor&&<p className="muted mt-2"><b>Door:</b> {houseAccess.whichDoor}</p>}
{houseAccess.backupContactName&&<p className="muted mt-2"><b>Backup contact:</b> {houseAccess.backupContactName}{houseAccess.backupContactPhone?` · ${houseAccess.backupContactPhone}`:''}</p>}
</div>}
</section>}

{hasAny(playEnrichment)&&<section className="card mt-6 p-6 md:p-8"><h2 className="text-2xl">Play &amp; enrichment</h2>
{playEnrichment.favouriteGames&&<p className="muted mt-3">{playEnrichment.favouriteGames}</p>}
{playEnrichment.goodDayLooksLike&&<p className="muted mt-2"><b>A good day:</b> {playEnrichment.goodDayLooksLike}</p>}
</section>}

{(treatments||[]).length>0&&<section className="card mt-6 p-6 md:p-8"><h2 className="text-2xl">Treatment record</h2>
{(treatments||[]).map(t=>{const due=dueLabel(t.next_due);return <div className="ledger-row" key={t.id}><div><b>{t.name}</b><p className="mono mt-1 text-[var(--ink-60)]">Next due {new Date(t.next_due).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</p></div><span className={`chip ${due.overdue?'overdue':'health'}`}>{due.text}</span></div>})}
</section>}

<footer className="card mt-6 p-6 text-center"><p className="muted">Tracked with Tailtend — start your pet&apos;s record.</p><Link className="btn mt-4" href="/app/signup">Start free on the web</Link></footer>
</div></main>}
