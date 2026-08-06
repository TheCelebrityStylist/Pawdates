'use client';
import {useEffect,useMemo,useState} from 'react';import Image from 'next/image';import {useRouter} from 'next/navigation';import {Logo} from './logo';import {PaywallSheet,type PaywallTrigger} from './paywall-sheet';
import {daysUntil,protectionSegments,protectionStatus,type TreatmentLite} from '@/lib/protection';
import {completeness,type CompletenessInput} from '@/lib/completeness';
import {pickSuggestion} from '@/lib/suggestions';
import {ObservationLog} from './observation-log';
import {SeasonalAlert} from './seasonal-alert';
import {MilestoneAdd} from './milestone-add';
import type {LifeEvent} from '@/app/app/page';
import type {Behaviour,Feeding,HouseAccess,HouseLogistics,PlayEnrichment,RoutineNotes,ToiletHygiene} from '@/lib/care-profile';
import {dailyMoodTags,observationTagLabel} from '@/lib/care-profile';

type Pet={id:string;name:string;species:string;birth_date:string|null;weight_kg:number|null;photo_path:string|null;created_at:string;photoUrl:string|null};
type ProfileRow={pet_id:string;essentials_flag:string|null;forbidden_foods:string[];feeding:Feeding;routine_notes:RoutineNotes;toilet_hygiene:ToiletHygiene;behaviour:Behaviour;house_logistics:HouseLogistics;house_access:HouseAccess;play_enrichment:PlayEnrichment};

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
return <div className="mt-6">
<div className="flex flex-wrap items-center gap-6">
{protection&&<Seal tone={protection.tone} pct={protection.pct} num={protection.num} cap={protection.cap}/>}
<Seal tone="brass" pct={percent} num={percent} cap="RECORD"/>
{onTimePercent!==null&&<Seal tone="valid" pct={onTimePercent} num={`${onTimePercent}%`} cap="ON TIME"/>}
{segments.length>0&&<div className="min-w-[120px] flex-1"><p className="mono text-[var(--ink-60)]">Protection</p><div className="mt-2 flex flex-wrap gap-1.5">{segments.map(s=><span key={s.type} className={`chip${s.status==='overdue'?' overdue':s.status==='soon'?'':' health'}`}>{s.label}</span>)}</div></div>}
</div>
{missing.length>0&&<div className="mt-4"><button type="button" className="mono text-[var(--brass-ink)]" onClick={()=>setOpen(v=>!v)} aria-expanded={open}>{open?'Hide':'Complete the record'} · {missing.length} left</button>{open&&<ul className="mt-3 space-y-2">{missing.map(i=><li className="muted text-sm" key={i.key}>· {i.label}</li>)}</ul>}</div>}
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

function LifeStrip({pet,events,treatmentCount,onTimePercent}:{pet:Pet;events:LifeEvent[];treatmentCount:number;onTimePercent:number|null}){
const daysTracked=Math.max(0,Math.round((Date.now()-new Date(pet.created_at).getTime())/86400000));
return <section className="mt-10">
<p className="rule-label">Record · {events.length} stamp{events.length===1?'':'s'}</p>
<p className="mono mt-3 text-[var(--ink-60)]">Kept for {daysTracked} day{daysTracked===1?'':'s'} · {treatmentCount} treatment{treatmentCount===1?'':'s'}{onTimePercent!==null?` · ${onTimePercent}% on time`:''}</p>
{events.length>0
?<div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4">{events.map(e=><VisaStamp key={e.id} event={e}/>)}</div>
:<p className="muted mt-4 text-sm">Mark a treatment done to earn {pet.name}&apos;s first stamp.</p>}
</section>;
}

export function AppShell({email,pets,treatments,profiles,premium,lifeEventsByPet,latestWeightByPet,latestVisitByPet,treatmentCountByPet,onTimeByPet,feedingByPet={},observedTodayByPet={},initialNotice=''}:{
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

const pet=pets.find(p=>p.id===selectedId)||pets[0];
const petTreatments=useMemo(()=>allTreatments.filter(t=>t.pet_id===pet?.id),[allTreatments,pet?.id]);
const profile=profiles.find(p=>p.pet_id===pet?.id)||null;

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

return <main className="min-h-screen bg-[var(--paper)] px-5 py-8"><div className="mx-auto max-w-[620px]">
<header className="flex items-center justify-between border-b border-[var(--rule)] pb-5"><Logo/><a href="/app/settings" className="mono" title={email}>Settings</a></header>
{notice&&<p role="status" className="mt-5 border-l-2 border-[var(--health)] bg-[var(--card)] p-3 text-sm">{notice}</p>}

{pets.length>1&&<div className="mt-6 flex gap-3">{pets.map(p=><button type="button" key={p.id} onClick={()=>setSelectedId(p.id)} className={`relative h-10 w-10 overflow-hidden rounded-full border ${p.id===pet.id?'border-[var(--health)]':'border-[var(--rule)]'}`}>{p.photoUrl?<Image src={p.photoUrl} alt="" fill sizes="40px" className="object-cover"/>:<span className="grid h-full w-full place-items-center text-sm font-semibold">{p.name[0]}</span>}</button>)}</div>}

<p className="mono mt-6 text-[var(--ink-40)]">Pet record · No. {pet.id.slice(0,8).toUpperCase()}</p>
<section className="mt-3 flex items-start gap-5">
<div className="passport-photo h-28 w-24 shrink-0">
{pet.photoUrl?<Image src={pet.photoUrl} alt="" fill sizes="96px" className="object-cover"/>:<span className="initial text-4xl">{pet.name[0]}</span>}
<span className="mrz">Tailtend</span>
</div>
<div className="pt-1">
<h1 className="text-4xl">{pet.name}</h1>
<p className="mono mt-2 text-[var(--ink-60)]">{pet.species.toUpperCase()}{ageLabel(pet.birth_date)?` · ${ageLabel(pet.birth_date).toUpperCase()}`:''}{pet.weight_kg?` · ${pet.weight_kg} KG`:''}</p>
{isBirthdayToday(pet.birth_date)&&<p className="mono mt-1" style={{color:'var(--brass-ink)'}}>★ {pet.name} is {ageLabel(pet.birth_date).split(' ')[0]} today.</p>}
</div>
</section>

<SeasonalAlert petName={pet.name} species={pet.species} careProfile={profile}/>
<StatusHeadline petName={pet.name} treatments={petTreatments}/>
<StatusMarks treatments={petTreatments} percent={percent} items={items} onTimePercent={onTimeByPet[pet.id]??null}/>

<div className="card mt-8 p-6"><h2 className="rule-label">Today</h2>
<div className="mt-4"><TodayAction pet={pet} treatments={petTreatments} suggestion={suggestion} onDone={done} stamped={stamped}/></div>

{feedInfo.slots.length>0&&<div className="mt-4 border-t border-[var(--rule)] pt-4"><p className="mono text-[var(--ink-60)]">Feeding</p>
{feedInfo.slots.map(slot=>{const by=fedToday[slot];return <div key={slot} className="mt-2 flex items-center justify-between gap-3">
<div><b>{slot}</b>{by?<p className="mono mt-1 text-[var(--ink-60)]">Fed by {by}</p>:null}</div>
{by?<button type="button" className="stamp" title="Tap to undo" disabled={busyFeed===`${pet.id}-${slot}`} onClick={()=>undoFed(pet.id,slot)}>Fed · today</button>
:<button type="button" className="btn ghost" disabled={busyFeed===`${pet.id}-${slot}`} onClick={()=>markFed(pet.id,slot)}>{busyFeed===`${pet.id}-${slot}`?'…':'Mark fed'}</button>}
</div>})}</div>}

{weightNudge&&<div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--rule)] pt-4">
<div><b>Log a weight</b><p className="mono mt-1 text-[var(--ink-60)]">{daysSinceWeight===null?'None recorded yet':`Last ${daysSinceWeight} day${daysSinceWeight===1?'':'s'} ago`}</p></div>
<a href={`/app/pets/${pet.id}/weight`} className="btn ghost">Weigh {pet.name}</a></div>}

{!moodDone
?<div className="mt-4 border-t border-[var(--rule)] pt-4"><p className="mono text-[var(--ink-60)]">How was {pet.name} today?</p>
<div className="mt-3 flex flex-wrap gap-2">{dailyMoodTags.map(t=><button type="button" key={t} className="chip" style={{border:'1px solid var(--rule)',cursor:'pointer',padding:'8px 12px'}} onClick={()=>logMood(pet.id,t,pet.name)}>{observationTagLabel[t]}</button>)}</div>
<p className="muted mt-2 text-xs">A quick daily note builds real material for the next vet visit.</p></div>
:<p className="mono mt-4 border-t border-[var(--rule)] pt-4" style={{color:'var(--sage)'}}>✓ Logged how {pet.name} was today</p>}
</div>

<LifeStrip pet={pet} events={lifeEventsByPet[pet.id]||[]} treatmentCount={treatmentCountByPet[pet.id]||0} onTimePercent={onTimeByPet[pet.id]??null}/>
<MilestoneAdd petId={pet.id} onAdded={()=>router.refresh()}/>

<ObservationLog petId={pet.id}/>

<div className="mt-10 flex flex-wrap gap-4 border-t border-[var(--rule)] pt-6"><a href={`/app/pets/${pet.id}/edit`} className="mono text-[var(--brass-ink)]">Edit {pet.name}</a><a href={`/app/pets/${pet.id}/care-profile`} className="mono text-[var(--brass-ink)]">Care profile</a><a href={`/app/pets/${pet.id}/weight`} className="mono text-[var(--brass-ink)]">Weight trend</a><a href={`/app/pets/${pet.id}/travel-check`} className="mono text-[var(--brass-ink)]">EU travel check</a><a href="/app/settings" className="mono text-[var(--brass-ink)]">Share &amp; export</a><button type="button" className="mono text-[var(--brass-ink)]" onClick={()=>pets.length&&!premium?setPaywall('second_pet'):location.assign('/app/onboarding')}>Add a pet</button></div>

</div>{paywall&&<PaywallSheet trigger={paywall} petName={pets[1]?.name||'Luna'} onClose={()=>setPaywall(null)}/>}</main>}
