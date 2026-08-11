'use client';
import {useEffect,useMemo,useState} from 'react';import Image from 'next/image';import {useRouter} from 'next/navigation';import {Logo} from './logo';import {PaywallSheet,type PaywallTrigger} from './paywall-sheet';
import {daysUntil,protectionSegments,protectionStatus,type TreatmentLite} from '@/lib/protection';
import {completeness,type CompletenessInput} from '@/lib/completeness';
import {pickSuggestion} from '@/lib/suggestions';
import {ObservationLog} from './observation-log';
import {SeasonalAlert} from './seasonal-alert';
import {MilestoneAdd} from './milestone-add';
import {GuidanceCard,GuidanceTeaser} from './guidance-card';
import type {LifeEvent} from '@/app/app/page';
import type {Behaviour,Feeding,HouseAccess,HouseLogistics,PlayEnrichment,RoutineNotes,ToiletHygiene} from '@/lib/care-profile';
import {dailyMoodTags,observationTagLabel} from '@/lib/care-profile';

type Pet={id:string;name:string;species:string;birth_date:string|null;weight_kg:number|null;photo_path:string|null;created_at:string;photoUrl:string|null};
type ProfileRow={pet_id:string;essentials_flag:string|null;forbidden_foods:string[];feeding:Feeding;routine_notes:RoutineNotes;toilet_hygiene:ToiletHygiene;behaviour:Behaviour;house_logistics:HouseLogistics;house_access:HouseAccess;play_enrichment:PlayEnrichment};

// Simple paw-print motif — the one illustrated touch on the warm daily view,
// so the screen reads as "pet app" even at a glance. Archive stays illustration-free.
function PawMark({className='',style}:{className?:string;style?:React.CSSProperties}){
return <svg viewBox="0 0 64 64" aria-hidden className={className} style={style} fill="currentColor"><ellipse cx="32" cy="43" rx="15" ry="12"/><ellipse cx="13" cy="29" rx="6" ry="8"/><ellipse cx="25" cy="18" rx="6" ry="8.5"/><ellipse cx="39" cy="18" rx="6" ry="8.5"/><ellipse cx="51" cy="29" rx="6" ry="8"/></svg>;
}
// Warm, filled tints for the daily mood buttons (soft, never alarming).
const moodTone:Record<string,{bg:string;fg:string;border:string}>={
bright_day:{bg:'rgba(79,109,87,.14)',fg:'var(--sage)',border:'rgba(79,109,87,.4)'},
quiet_day:{bg:'rgba(169,124,47,.14)',fg:'var(--brass-ink)',border:'rgba(169,124,47,.4)'},
off_day:{bg:'rgba(190,65,51,.12)',fg:'var(--coral)',border:'rgba(190,65,51,.35)'},
};
function ageLabel(birth:string|null):string{
if(!birth)return '';
const now=new Date();const b=new Date(`${birth}T00:00:00`);
let years=now.getFullYear()-b.getFullYear();let months=now.getMonth()-b.getMonth();
if(now.getDate()<b.getDate())months--;
if(months<0){years--;months+=12}
if(years<1)return `${months} month${months===1?'':'s'}`;
return `${years} year${years===1?'':'s'}${months?` ${months} month${months===1?'':'s'}`:''}`;
}

function isBirthdayToday(birth:string|null):boolean{if(!birth)return false;const now=new Date();const b=new Date(`${birth}T00:00:00`);return now.getMonth()===b.getMonth()&&now.getDate()===b.getDate()}

function useCountUp(target:number,key:string,duration=400){
const [value,setValue]=useState(0);
useEffect(()=>{let raf=0;const start=performance.now();setValue(0);
function tick(now:number){const t=Math.min(1,(now-start)/duration);setValue(Math.round(t*target));if(t<1)raf=requestAnimationFrame(tick)}
raf=requestAnimationFrame(tick);
return ()=>cancelAnimationFrame(raf);
// eslint-disable-next-line react-hooks/exhaustive-deps
},[key]);
return value;
}

function StatusHeadline({petName,treatments}:{petName:string;treatments:TreatmentLite[]}){
const status=protectionStatus(treatments);
const animatedDays=useCountUp(status.days,`${petName}-${status.status}-${status.days}`);
if(status.status==='none')return <p className="mt-4 text-2xl">Add a treatment to start {petName}&apos;s protection record.</p>;
if(status.status==='overdue')return <p className="mt-4 text-2xl" style={{color:'var(--stamp)'}}>{petName}&apos;s {status.treatmentName} is <span className="mono">{animatedDays}</span> day{status.days===1?'':'s'} overdue.</p>;
if(status.status==='soon')return <p className="mt-4 text-2xl">{petName}&apos;s {status.treatmentName} is due {status.dateLabel}.</p>;
return <p className="mt-4 text-2xl">{petName} is fully protected until {status.dateLabel}.</p>;
}

// An official status mark, not a loading bar: a wax-seal ring whose colour
// encodes state (sage=valid, brass=due soon / neutral, coral=overdue).
function Seal({pct,tone,num,cap}:{pct:number;tone:'brass'|'valid'|'overdue';num:React.ReactNode;cap:string}){
return <div className={`seal${tone==='valid'?' valid':tone==='overdue'?' overdue':''}`} style={{['--pct' as string]:`${Math.max(0,Math.min(100,pct))}%`} as React.CSSProperties}><div className="text-center"><div className="num">{num}</div><div className="cap">{cap}</div></div></div>;
}

function StatusMarks({treatments,percent,items,onTimePercent}:{treatments:TreatmentLite[];percent:number;items:{key:string;label:string;met:boolean}[];onTimePercent:number|null}){
const status=protectionStatus(treatments);
const segments=protectionSegments(treatments);
const missing=items.filter(i=>!i.met);
const [open,setOpen]=useState(false);
const protection=status.status==='overdue'
  ?{tone:'overdue' as const,pct:100,num:status.days,cap:`DAY${status.days===1?'':'S'} OVERDUE`}
  :status.status==='soon'
  ?{tone:'brass' as const,pct:Math.max(12,100-Math.min(100,status.days*12)),num:status.days,cap:`DAY${status.days===1?'':'S'} TO GO`}
  :status.status==='ok'
  ?{tone:'valid' as const,pct:100,num:'✓',cap:'VALID'}
  :null;
// One dominant status (the protection SEAL — the one earned "official" mark kept
// on the warm view). Everything else is soft, sentence-case, warm — no mono.
return <div className="mt-5 flex flex-wrap items-center gap-5">
{protection&&<Seal tone={protection.tone} pct={protection.pct} num={protection.num} cap={protection.cap}/>}
<div className="min-w-[150px] flex-1">
{segments.length>0&&<div className="flex flex-wrap gap-2">{segments.map(s=>{const tint=s.status==='overdue'?{bg:'rgba(190,65,51,.12)',fg:'var(--coral)'}:s.status==='soon'?{bg:'rgba(169,124,47,.14)',fg:'var(--brass-ink)'}:{bg:'rgba(79,109,87,.14)',fg:'var(--sage)'};return <span key={s.type} className="rounded-full px-3 py-1 text-sm capitalize" style={{background:tint.bg,color:tint.fg}}>{s.label}</span>})}</div>}
<p className="mt-3 text-sm text-[var(--ink-60)]">Profile {percent}% complete{onTimePercent!==null?` · ${onTimePercent}% on time`:''}</p>
{missing.length>0&&<button type="button" className="mt-1 text-sm text-[var(--brass-ink)] underline" onClick={()=>setOpen(v=>!v)} aria-expanded={open}>{open?'Hide':`Add ${missing.length} more detail${missing.length===1?'':'s'}`}</button>}
{open&&missing.length>0&&<ul className="mt-2 space-y-1.5">{missing.map(i=><li className="muted text-sm" key={i.key}>· {i.label}</li>)}</ul>}
</div>
</div>;
}

function TodayAction({pet,treatments,suggestion,onDone,stamped}:{pet:Pet;treatments:TreatmentLite[];suggestion:{text:string;href:string}|null;onDone:(t:TreatmentLite)=>void;stamped:string|null}){
const status=protectionStatus(treatments);
const due=treatments.find(t=>daysUntil(t.next_due)<=3);
if(due)return <div className="ledger-row relative"><div><b>{due.name}</b><p className="mono mt-1 text-[var(--ink-60)]">{status.status==='overdue'?`Overdue by ${status.days} day${status.days===1?'':'s'}`:`Due ${status.dateLabel}`}</p></div>{stamped===due.id?<span className="stamp hit">Done · today</span>:<button onClick={()=>onDone(due)} className="btn ghost">Mark as done</button>}</div>;
if(suggestion)return <a href={suggestion.href} className="ledger-row block"><span className="muted">{suggestion.text}</span></a>;
return <p className="muted mt-2">{pet.name}&apos;s record is fully up to date.</p>;
}

// Every earned record entry renders as a date-stamped visa stamp. Rotation is
// hashed from the id so it's deterministic (stable across renders / hydration).
const kindGlyph:Record<LifeEvent['kind'],string>={treatment:'✚',visit:'⚕',weight:'⚖',checkoff:'✓',milestone:'★'};
function stampRotation(id:string){let h=0;for(let i=0;i<id.length;i++)h=(h*31+id.charCodeAt(i))|0;return ((h%13)-6);}
function VisaStamp({event}:{event:LifeEvent}){
const tone=event.kind==='checkoff'||(event.kind==='treatment'&&event.wasOverdue===false)?'valid':event.wasOverdue?'overdue':'';
return <div className={`visa${tone?` ${tone}`:''}`} style={{['--rot' as string]:`${stampRotation(event.id)}deg`} as React.CSSProperties} title={`${event.label} · ${event.detail}`}>
<span className="glyph" aria-hidden>{kindGlyph[event.kind]}</span>
<span className="lbl">{event.label}</span>
<span className="dt">{new Date(event.date).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}</span>
</div>;
}

// Stamps fill a passport a page at a time rather than an endless grid — so a
// pet with 50+ records reads as a stack of pages you leaf through, in motif.
const STAMPS_PER_PAGE=12;
function LifeStrip({pet,events,treatmentCount,onTimePercent}:{pet:Pet;events:LifeEvent[];treatmentCount:number;onTimePercent:number|null}){
const daysTracked=Math.max(0,Math.round((Date.now()-new Date(pet.created_at).getTime())/86400000));
const pageCount=Math.max(1,Math.ceil(events.length/STAMPS_PER_PAGE));
const [page,setPage]=useState(0);
// Reset to the first page whenever the selected pet changes.
useEffect(()=>{setPage(0)},[pet.id]);
const current=Math.min(page,pageCount-1);
const shown=events.slice(current*STAMPS_PER_PAGE,current*STAMPS_PER_PAGE+STAMPS_PER_PAGE);
return <section className="mt-10">
<p className="rule-label">Record · {events.length} stamp{events.length===1?'':'s'}</p>
<p className="mono mt-3 text-[var(--ink-60)]">Kept for {daysTracked} day{daysTracked===1?'':'s'} · {treatmentCount} treatment{treatmentCount===1?'':'s'}{onTimePercent!==null?` · ${onTimePercent}% on time`:''}</p>
{events.length>0
?<>
<div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4">{shown.map(e=><VisaStamp key={e.id} event={e}/>)}</div>
{pageCount>1&&<div className="mt-5 flex items-center justify-between gap-3">
<button type="button" className="btn ghost" onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={current===0} aria-label="Previous page of stamps">← Newer</button>
<span className="mono text-xs text-[var(--ink-60)]">Page {current+1} of {pageCount}</span>
<button type="button" className="btn ghost" onClick={()=>setPage(p=>Math.min(pageCount-1,p+1))} disabled={current>=pageCount-1} aria-label="Next page of stamps">Older →</button>
</div>}
</>
:<p className="muted mt-4 text-sm">Mark a treatment done to earn {pet.name}&apos;s first stamp.</p>}
</section>;
}

type PetStatus={label:string;tone:'valid'|'soon'|'overdue'|'none';detail:string;percent:number;attention:boolean};
// At-a-glance status for every pet, so a multi-pet household sees what needs
// attention without switching between pets one at a time.
function AllPetsOverview({pets,selectedId,onSelect,statuses}:{pets:Pet[];selectedId:string;onSelect:(id:string)=>void;statuses:Record<string,PetStatus>}){
const needs=pets.filter(p=>statuses[p.id]?.attention).length;
return <section className="mt-6">
<p className="rule-label">All pets · {pets.length}{needs>0?` · ${needs} need${needs===1?'s':''} attention`:' · all on track'}</p>
<div className="mt-3 space-y-2">{pets.map(p=>{const s=statuses[p.id];const sel=p.id===selectedId;return (
<button type="button" key={p.id} onClick={()=>onSelect(p.id)} aria-pressed={sel} className={`card flex w-full items-center gap-4 p-3 text-left transition ${sel?'ring-2 ring-[var(--brass)]':''}`}>
<span className="passport-photo relative h-12 w-11 shrink-0">{p.photoUrl?<Image src={p.photoUrl} alt="" fill sizes="44px" className="object-cover"/>:<span className="initial text-lg">{p.name[0]}</span>}</span>
<span className="min-w-0 flex-1"><b className="block truncate">{p.name}</b><span className="mono block truncate text-xs text-[var(--ink-60)]">{s?.detail}</span></span>
<span className={`chip shrink-0 ${s?.tone==='overdue'?'overdue':s?.tone==='valid'?'health':''}`}>{s?.label}</span>
<span className="mono w-10 shrink-0 text-right text-xs text-[var(--ink-60)]">{s?.percent}%</span>
</button>)})}</div>
</section>;
}

export function AppShell({email,pets,treatments,profiles,premium,lifeEventsByPet,latestWeightByPet,latestVisitByPet,treatmentCountByPet,onTimeByPet,feedingByPet={},observedTodayByPet={},puppyByPet={},initialNotice=''}:{
email:string;
pets:Pet[];
treatments:{id:string;name:string;type:string;next_due:string;pet_id:string}[];
profiles:ProfileRow[];
premium:boolean;
lifeEventsByPet:Record<string,LifeEvent[]>;
latestWeightByPet:Record<string,string|null>;
latestVisitByPet:Record<string,string|null>;
treatmentCountByPet:Record<string,number>;
onTimeByPet:Record<string,number|null>;
feedingByPet?:Record<string,{slots:string[];fed:Record<string,string>}>;
observedTodayByPet?:Record<string,boolean>;
puppyByPet?:Record<string,{enabled:boolean;band:string|null;suggested:string|null;total:number;done:number}>;
initialNotice?:string;
}){
const router=useRouter();
const [selectedId,setSelectedId]=useState(pets[0]?.id||'');
const [allTreatments,setAllTreatments]=useState(treatments);
const [stamped,setStamped]=useState<string|null>(null);
const [notice,setNotice]=useState(initialNotice);
const [paywall,setPaywall]=useState<PaywallTrigger|null>(null);
const [fedLocal,setFedLocal]=useState<Record<string,Record<string,string>>>({});
const [moodLocal,setMoodLocal]=useState<Record<string,boolean>>({});
const [busyFeed,setBusyFeed]=useState<string|null>(null);
const [weightVal,setWeightVal]=useState('');
const [weightSaved,setWeightSaved]=useState(false);
const [busyWeight,setBusyWeight]=useState(false);

const pet=pets.find(p=>p.id===selectedId)||pets[0];
const petTreatments=useMemo(()=>allTreatments.filter(t=>t.pet_id===pet?.id),[allTreatments,pet?.id]);
const profile=profiles.find(p=>p.pet_id===pet?.id)||null;
const statuses=useMemo(()=>Object.fromEntries(pets.map(p=>{
const pts=allTreatments.filter(t=>t.pet_id===p.id);
const st=protectionStatus(pts);
const prof=profiles.find(x=>x.pet_id===p.id)||null;
const {percent}=completeness({pet:{photo_path:p.photo_path,birth_date:p.birth_date,weight_kg:p.weight_kg},hasWeightLog:!!latestWeightByPet[p.id],hasTreatment:(treatmentCountByPet[p.id]||0)>0||pts.length>0,profile:prof,lastVetVisit:latestVisitByPet[p.id]||null});
const s:PetStatus=st.status==='overdue'?{label:'OVERDUE',tone:'overdue',detail:`${st.treatmentName} · ${st.days}d overdue`,percent,attention:true}
:st.status==='soon'?{label:'DUE SOON',tone:'soon',detail:`${st.treatmentName} · due ${st.dateLabel}`,percent,attention:true}
:st.status==='ok'?{label:'VALID',tone:'valid',detail:`Protected until ${st.dateLabel}`,percent,attention:false}
:{label:'NO CARE',tone:'none',detail:'Add a treatment to start',percent,attention:true};
return [p.id,s];
})) as Record<string,PetStatus>,[pets,allTreatments,profiles,latestWeightByPet,treatmentCountByPet,latestVisitByPet]);

async function done(t:TreatmentLite){
setStamped(t.id);
try{
const r=await fetch(`/api/treatments/${t.id}/done`,{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
const json=await r.json();
if(!r.ok)throw new Error();
setAllTreatments(v=>v.map(x=>x.id===t.id?{...x,next_due:json.nextDue.slice(0,10)}:x));
setNotice(`${t.name} is recorded and rescheduled.`);
}catch{setNotice('The record could not be saved. Check your connection and try again.')}
finally{setTimeout(()=>setStamped(null),600)}
}

async function markFed(petId:string,slot:string){
setBusyFeed(`${petId}-${slot}`);
try{
const r=await fetch(`/api/pets/${petId}/feeding`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({slot})});
const json=await r.json();
if(!r.ok)throw new Error();
setFedLocal(v=>({...v,[petId]:{...(v[petId]||{}),[slot]:json.feeding?.fed_by||'You'}}));
setNotice(json.alreadyFed?`${slot} was already logged as fed today.`:`Logged — ${slot} fed.`);
}catch{setNotice('Could not save the feeding. Check your connection and try again.')}
finally{setBusyFeed(null)}
}

async function logWeight(petId:string){
const kg=Number(weightVal);
if(!(kg>0)||kg>500)return;
setBusyWeight(true);
try{
const r=await fetch(`/api/pets/${petId}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({logWeight:true,weightKg:kg})});
if(!r.ok)throw new Error();
setWeightSaved(true);setWeightVal('');
setNotice(`Logged — ${pet?.name} weighs ${kg} kg today.`);
}catch{setNotice('Could not save the weight just now — try again.')}
finally{setBusyWeight(false)}
}

async function undoFed(petId:string,slot:string){
setBusyFeed(`${petId}-${slot}`);
try{
await fetch(`/api/pets/${petId}/feeding?slot=${encodeURIComponent(slot)}`,{method:'DELETE'});
setFedLocal(v=>{const next={...(v[petId]||{})};delete next[slot];return {...v,[petId]:next}});
}finally{setBusyFeed(null)}
}

async function logMood(petId:string,tag:string,petName:string){
setMoodLocal(v=>({...v,[petId]:true}));
try{
const r=await fetch(`/api/pets/${petId}/observations`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tag})});
if(!r.ok)throw new Error();
setNotice(`Noted how ${petName} was today — it builds up for the vet.`);
}catch{setMoodLocal(v=>({...v,[petId]:false}));setNotice('Could not save that just now — try again.')}
}

if(!pet)return <main className="min-h-screen bg-[var(--paper)] px-5 py-8"><div className="mx-auto max-w-[620px]"><header className="flex items-center justify-between border-b border-[var(--rule)] pb-5"><Logo/><a href="/app/settings" className="mono" title={email}>Settings</a></header><div className="mt-16 text-center"><h1 className="text-3xl">No pets yet.</h1><p className="muted mt-3">Add the first — it takes 30 seconds.</p><a href="/app/onboarding" className="btn mt-6 inline-block">Add a pet</a></div></div></main>;

const completenessInput:CompletenessInput={
pet:{photo_path:pet.photo_path,birth_date:pet.birth_date,weight_kg:pet.weight_kg},
hasWeightLog:!!latestWeightByPet[pet.id],
hasTreatment:(treatmentCountByPet[pet.id]||0)>0||petTreatments.length>0,
profile,
lastVetVisit:latestVisitByPet[pet.id]||null
};
const {percent,items}=completeness(completenessInput);
const dueSoon=petTreatments.some(t=>daysUntil(t.next_due)<=3);
const suggestion=dueSoon?null:pickSuggestion(pet.id,pet.name,completenessInput,latestWeightByPet[pet.id]||null,new Date().getDate());

// Daily-use state for the Today card.
const feedInfo=feedingByPet[pet.id]||{slots:[],fed:{}};
const fedToday={...feedInfo.fed,...(fedLocal[pet.id]||{})};
const moodDone=!!(observedTodayByPet[pet.id]||moodLocal[pet.id]);
const lastWeight=latestWeightByPet[pet.id]||null;
const daysSinceWeight=lastWeight?Math.floor((Date.now()-new Date(lastWeight).getTime())/86400000):null;
const weightNudge=daysSinceWeight===null?!!pet.birth_date:daysSinceWeight>=7; // weekly cadence
// Brand-new record: nothing logged yet. Show one inviting "first page" instead
// of three disconnected empty lines. (Populated records are untouched.)
const isNewRecord=petTreatments.length===0&&!lastWeight&&(lifeEventsByPet[pet.id]||[]).length===0;

return <main className="min-h-screen bg-[var(--paper)] px-5 py-8"><div className="mx-auto max-w-[620px]">
<header className="flex items-center justify-between border-b border-[var(--rule)] pb-5"><Logo/><a href="/app/settings" className="mono" title={email}>Settings</a></header>
{notice&&<p role="status" className="mt-5 border-l-2 border-[var(--health)] bg-[var(--card)] p-3 text-sm">{notice}</p>}

{pets.length>1&&<AllPetsOverview pets={pets} selectedId={pet.id} onSelect={setSelectedId} statuses={statuses}/>}

{/* ── Today / home: warm, photo-led register (Record/archive keeps the passport) ── */}
<section className="mt-6">
<div className="flex items-center gap-5">
{pet.photoUrl
?<div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-[28px]" style={{boxShadow:'0 8px 26px rgba(22,35,59,.16)'}}><Image src={pet.photoUrl} alt={pet.name} fill sizes="128px" className="object-cover"/></div>
:<a href={`/app/pets/${pet.id}/edit`} className="grid h-32 w-32 shrink-0 place-items-center rounded-[28px] border-2 border-dashed border-[var(--brass)] text-center transition hover:bg-[rgba(169,124,47,.07)]"><span className="px-2"><PawMark className="mx-auto h-8 w-8" style={{color:'var(--brass)'}}/><span className="mt-1.5 block text-xs text-[var(--brass-ink)]">Add a photo of {pet.name}</span></span></a>}
<div className="min-w-0">
<h1 className="text-4xl">{pet.name}</h1>
<p className="mt-1 text-[var(--ink-60)]"><span className="capitalize">{pet.species}</span>{ageLabel(pet.birth_date)?` · ${ageLabel(pet.birth_date)}`:''}{pet.weight_kg?` · ${pet.weight_kg} kg`:''}</p>
{isBirthdayToday(pet.birth_date)&&<p className="mt-1 text-sm" style={{color:'var(--brass-ink)'}}>🎂 {pet.name} is {ageLabel(pet.birth_date).split(' ')[0]} today!</p>}
</div>
</div>
<div className="card mt-6 p-6">
<StatusHeadline petName={pet.name} treatments={petTreatments}/>
<StatusMarks treatments={petTreatments} percent={percent} items={items} onTimePercent={onTimeByPet[pet.id]??null}/>
<SeasonalAlert petName={pet.name} species={pet.species} careProfile={profile}/>
</div>
</section>

<div className="card mt-8 p-6"><div className="flex items-center gap-2"><PawMark className="h-5 w-5" style={{color:'var(--brass)'}}/><h2 className="text-2xl">Today with {pet.name}</h2></div>
{isNewRecord?<div className="mt-4">
<p className="text-[var(--brass-ink)]">Let&apos;s bring {pet.name}&apos;s page to life.</p>
<p className="muted mt-1 text-sm">Three quick things to start — each one grows on its own from here.</p>
<ol className="mt-5 space-y-3">
<li className="flex items-center gap-4"><span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-dashed border-[var(--rule)]" style={{fontFamily:'var(--font-display)',color:'var(--ink-60)'}}>1</span><span className="min-w-0 flex-1"><b className="block">Add {pet.name}&apos;s first treatment</b><span className="block text-xs text-[var(--ink-60)]">Flea, worming or a vaccine — reminders start here</span></span><a href={`/app/pets/${pet.id}/edit`} className="shrink-0 rounded-full px-5 py-2 text-sm font-medium text-white transition hover:brightness-110" style={{background:'var(--brass)'}}>Add</a></li>
<li className="flex items-center gap-4"><span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-dashed border-[var(--rule)]" style={{fontFamily:'var(--font-display)',color:'var(--ink-60)'}}>2</span><span className="min-w-0 flex-1"><b className="block">Log {pet.name}&apos;s first weight</b><span className="block text-xs text-[var(--ink-60)]">Starts the weight trend the vet will want</span></span><a href={`/app/pets/${pet.id}/weight`} className="shrink-0 rounded-full px-5 py-2 text-sm font-medium text-white transition hover:brightness-110" style={{background:'var(--brass)'}}>Weigh</a></li>
<li className="flex items-start gap-4"><span aria-hidden className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 ${moodDone?'border-[var(--sage)] text-[var(--sage)]':'border-dashed border-[var(--rule)] text-[var(--ink-60)]'}`} style={{fontFamily:'var(--font-display)'}}>{moodDone?'✓':'3'}</span><span className="min-w-0 flex-1"><b className="block">Tell us how {pet.name} is today</b>{moodDone?<span className="block text-xs" style={{color:'var(--sage)'}}>Logged — the first of many 🐾</span>:<><div className="mt-2 flex flex-wrap gap-2">{dailyMoodTags.map(t=>{const tone=moodTone[t];return <button type="button" key={t} className="rounded-full px-4 py-2 text-sm font-medium transition hover:brightness-105" style={{background:tone.bg,color:tone.fg,border:`1px solid ${tone.border}`,cursor:'pointer'}} onClick={()=>logMood(pet.id,t,pet.name)}>{observationTagLabel[t]}</button>})}</div><span className="mt-1.5 block text-xs text-[var(--ink-60)]">One tap — no typing</span></>}</span></li>
</ol>
</div>:<>
<div className="mt-4"><TodayAction pet={pet} treatments={petTreatments} suggestion={suggestion} onDone={done} stamped={stamped}/></div>

{feedInfo.slots.length>0&&<div className="mt-5 border-t border-[var(--rule)] pt-5"><p className="font-medium">Meals today</p>
{feedInfo.slots.map(slot=>{const by=fedToday[slot];return <div key={slot} className="mt-3 flex items-center justify-between gap-3">
<div><b>{slot}</b>{by?<p className="mt-0.5 text-sm text-[var(--ink-60)]">Fed by {by}</p>:null}</div>
{by?<button type="button" className="stamp" title="Tap to undo" disabled={busyFeed===`${pet.id}-${slot}`} onClick={()=>undoFed(pet.id,slot)}>Fed · today</button>
:<button type="button" className="rounded-full px-5 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50" style={{background:'var(--sage)'}} disabled={busyFeed===`${pet.id}-${slot}`} onClick={()=>markFed(pet.id,slot)}>{busyFeed===`${pet.id}-${slot}`?'…':'Mark fed'}</button>}
</div>})}</div>}

{weightNudge&&<div className="mt-5 border-t border-[var(--rule)] pt-5">
<div className="flex items-baseline justify-between gap-3"><p className="font-medium">Log a weight</p><span className="text-xs text-[var(--ink-60)]">{daysSinceWeight===null?'None recorded yet':`Last ${daysSinceWeight} day${daysSinceWeight===1?'':'s'} ago`}</span></div>
{weightSaved?<p className="mt-2 text-sm" style={{color:'var(--sage)'}}>✓ Saved — nice one.</p>
:<div className="mt-3 flex items-center gap-2">
<div className="flex items-center rounded-full border border-[var(--rule)] bg-[var(--paper)] px-4 py-2 transition focus-within:border-[var(--brass)]">
<input type="number" inputMode="decimal" step="0.1" min="0" value={weightVal} onChange={e=>setWeightVal(e.target.value)} placeholder="0.0" aria-label={`${pet.name}'s weight in kilograms`} className="w-16 bg-transparent text-right outline-none"/>
<span className="ml-2 text-sm text-[var(--ink-60)]">kg</span>
</div>
<button type="button" disabled={busyWeight||!(Number(weightVal)>0)} onClick={()=>logWeight(pet.id)} className="rounded-full px-5 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-40" style={{background:'var(--brass)'}}>{busyWeight?'…':'Save'}</button>
</div>}</div>}

{!moodDone
?<div className="mt-5 border-t border-[var(--rule)] pt-5"><p className="font-medium">How&apos;s {pet.name} doing today?</p>
<div className="mt-3 flex flex-wrap gap-2">{dailyMoodTags.map(t=>{const tone=moodTone[t];return <button type="button" key={t} className="rounded-full px-4 py-2 text-sm font-medium transition hover:brightness-105" style={{background:tone.bg,color:tone.fg,border:`1px solid ${tone.border}`,cursor:'pointer'}} onClick={()=>logMood(pet.id,t,pet.name)}>{observationTagLabel[t]}</button>})}</div>
<p className="muted mt-2 text-xs">A quick daily note builds real material for the next vet visit.</p></div>
:<p className="mt-5 border-t border-[var(--rule)] pt-5" style={{color:'var(--sage)'}}>✓ Logged how {pet.name} was today</p>}
</>}
</div>

{premium?<GuidanceCard petId={pet.id} petName={pet.name}/>:<GuidanceTeaser petName={pet.name}/>}

{(()=>{const puppy=puppyByPet[pet.id];if(!puppy||(!puppy.enabled&&!puppy.suggested))return null;
return puppy.enabled
?<a href={`/app/pets/${pet.id}/puppy`} className="card mt-6 flex items-center gap-4 p-5 transition hover:brightness-[1.02]">
<span aria-hidden className="text-3xl">🐶</span>
<span className="min-w-0 flex-1"><b className="block">Puppy tracker</b><span className="mono block text-xs text-[var(--ink-60)]">{puppy.total>0?`${puppy.done} of ${puppy.total} of today's routine done`:'Open today’s routine'}</span></span>
<span className="mono shrink-0 text-[var(--brass-ink)]">Open →</span></a>
:<a href={`/app/pets/${pet.id}/puppy`} className="card mt-6 flex items-center gap-4 p-5 transition hover:brightness-[1.02]">
<span aria-hidden className="text-3xl">🐶</span>
<span className="min-w-0 flex-1"><b className="block">{pet.name} is still growing up</b><span className="mono block text-xs text-[var(--ink-60)]">Start a daily routine &amp; socialization checklist</span></span>
<span className="mono shrink-0 text-[var(--brass-ink)]">Set up →</span></a>;
})()}

{/* ── page break: today's page ↕ the archive ── */}
<div className="perforation mt-12"/>

{/* ── Zone 3: the archive — the passport's stamped pages. Stamps are the one
     dominant element here; milestones + daily notes tuck behind a "more". ── */}
<section className="mt-8">
<LifeStrip pet={pet} events={lifeEventsByPet[pet.id]||[]} treatmentCount={treatmentCountByPet[pet.id]||0} onTimePercent={onTimeByPet[pet.id]??null}/>
<details className="mt-6">
<summary className="mono cursor-pointer text-[var(--brass-ink)]">Milestones &amp; daily notes</summary>
<div className="mt-4"><MilestoneAdd petId={pet.id} onAdded={()=>router.refresh()}/><ObservationLog petId={pet.id}/></div>
</details>
</section>

<details className="mt-10 border-t border-[var(--rule)] pt-6">
<summary className="mono cursor-pointer text-[var(--brass-ink)]">More actions</summary>
<div className="mt-4 flex flex-wrap gap-4"><a href={`/app/pets/${pet.id}/edit`} className="mono text-[var(--brass-ink)]">Edit {pet.name}</a><a href={`/app/pets/${pet.id}/care-profile`} className="mono text-[var(--brass-ink)]">Care profile</a><a href={`/app/pets/${pet.id}/weight`} className="mono text-[var(--brass-ink)]">Weight trend</a><a href={`/app/pets/${pet.id}/travel-check`} className="mono text-[var(--brass-ink)]">EU travel check</a><a href="/app/settings" className="mono text-[var(--brass-ink)]">Share &amp; export</a><button type="button" className="mono text-[var(--brass-ink)]" onClick={()=>pets.length&&!premium?setPaywall('second_pet'):location.assign('/app/onboarding')}>Add a pet</button></div>
</details>

</div>{paywall&&<PaywallSheet trigger={paywall} petName={pets[1]?.name||'Luna'} onClose={()=>setPaywall(null)}/>}</main>}
