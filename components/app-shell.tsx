'use client';
import {useEffect,useMemo,useState} from 'react';import Image from 'next/image';import {Logo} from './logo';import {PaywallSheet,type PaywallTrigger} from './paywall-sheet';
import {daysUntil,protectionSegments,protectionStatus,type TreatmentLite} from '@/lib/protection';
import {completeness,type CompletenessInput} from '@/lib/completeness';
import {pickSuggestion} from '@/lib/suggestions';
import type {LifeEvent} from '@/app/app/page';
import type {Behaviour,Feeding,HouseAccess,HouseLogistics,PlayEnrichment,RoutineNotes,ToiletHygiene} from '@/lib/care-profile';

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

function ProtectionBar({treatments}:{treatments:TreatmentLite[]}){
const segments=protectionSegments(treatments);
if(!segments.length)return null;
return <div className="mt-5"><div className="flex h-2 overflow-hidden rounded-full border border-[var(--rule)]">{segments.map(s=><div key={s.type} className="flex-1 transition-all duration-500" style={{background:s.status==='overdue'?'var(--stamp)':s.status==='soon'?'#D8B24C':'var(--health)'}} title={`${s.label}: ${s.status}`}/>)}</div><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">{segments.map(s=><span className="mono text-xs text-[var(--ink-60)]" key={s.type}>{s.label}</span>)}</div></div>;
}

function TodayAction({pet,treatments,suggestion,onDone,stamped}:{pet:Pet;treatments:TreatmentLite[];suggestion:{text:string;href:string}|null;onDone:(t:TreatmentLite)=>void;stamped:string|null}){
const status=protectionStatus(treatments);
const due=treatments.find(t=>daysUntil(t.next_due)<=3);
if(due)return <div className="ledger-row relative"><div><b>{due.name}</b><p className="mono mt-1 text-[var(--ink-60)]">{status.status==='overdue'?`Overdue by ${status.days} day${status.days===1?'':'s'}`:`Due ${status.dateLabel}`}</p></div>{stamped===due.id?<span className="stamp hit">Done · today</span>:<button onClick={()=>onDone(due)} className="btn ghost">Mark as done</button>}</div>;
if(suggestion)return <a href={suggestion.href} className="ledger-row block"><span className="muted">{suggestion.text}</span></a>;
return <p className="muted mt-2">{pet.name}&apos;s record is fully up to date.</p>;
}

function CompletenessDisclosure({percent,items}:{percent:number;items:{key:string;label:string;met:boolean}[]}){
const [open,setOpen]=useState(false);
const missing=items.filter(i=>!i.met);
return <div className="mt-8 border-t border-[var(--rule)] pt-5"><button type="button" className="mono text-[var(--ink-60)]" onClick={()=>setOpen(v=>!v)}>RECORD {percent}% COMPLETE</button>{open&&missing.length>0&&<ul className="mt-3 space-y-2">{missing.map(i=><li className="muted text-sm" key={i.key}>· {i.label}</li>)}</ul>}</div>;
}

function LifeStrip({pet,events,treatmentCount,onTimePercent}:{pet:Pet;events:LifeEvent[];treatmentCount:number;onTimePercent:number|null}){
const daysTracked=Math.max(0,Math.round((Date.now()-new Date(pet.created_at).getTime())/86400000));
return <section className="mt-10"><p className="mono text-[var(--ink-60)]">You&apos;ve kept {pet.name}&apos;s record for {daysTracked} day{daysTracked===1?'':'s'} · {treatmentCount} treatment{treatmentCount===1?'':'s'}{onTimePercent!==null?` · ${onTimePercent}% on time`:''}</p>{events.length>0&&<div className="mt-4 space-y-3">{events.map(e=><div className="flex items-center justify-between border-b border-dashed border-[var(--rule)] pb-3 text-sm" key={e.id}><div><b>{e.label}</b><p className="mono mt-1 text-[var(--ink-60)]">{e.detail}</p></div><span className="mono text-[var(--ink-60)]">{new Date(e.date).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}</span></div>)}</div>}</section>;
}

export function AppShell({email,pets,treatments,profiles,premium,lifeEventsByPet,latestWeightByPet,latestVisitByPet,treatmentCountByPet,onTimeByPet,initialNotice=''}:{
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
initialNotice?:string;
}){
const [selectedId,setSelectedId]=useState(pets[0]?.id||'');
const [allTreatments,setAllTreatments]=useState(treatments);
const [stamped,setStamped]=useState<string|null>(null);
const [notice,setNotice]=useState(initialNotice);
const [paywall,setPaywall]=useState<PaywallTrigger|null>(null);

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

return <main className="min-h-screen bg-[var(--paper)] px-5 py-8"><div className="mx-auto max-w-[620px]">
<header className="flex items-center justify-between border-b border-[var(--rule)] pb-5"><Logo/><a href="/app/settings" className="mono" title={email}>Settings</a></header>
{notice&&<p role="status" className="mt-5 border-l-2 border-[var(--health)] bg-[var(--card)] p-3 text-sm">{notice}</p>}

{pets.length>1&&<div className="mt-6 flex gap-3">{pets.map(p=><button type="button" key={p.id} onClick={()=>setSelectedId(p.id)} className={`relative h-10 w-10 overflow-hidden rounded-full border ${p.id===pet.id?'border-[var(--health)]':'border-[var(--rule)]'}`}>{p.photoUrl?<Image src={p.photoUrl} alt="" fill sizes="40px" className="object-cover"/>:<span className="grid h-full w-full place-items-center text-sm font-semibold">{p.name[0]}</span>}</button>)}</div>}

<section className="mt-8 flex items-center gap-5">
<div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-[var(--brass)] bg-[var(--card)]">
{pet.photoUrl?<Image src={pet.photoUrl} alt="" fill sizes="96px" className="object-cover"/>:<span className="grid h-full w-full place-items-center text-3xl font-bold text-[var(--ink-60)]">{pet.name[0]}</span>}
</div>
<div>
<h1 className="text-4xl">{pet.name}</h1>
<p className="mono mt-1 text-[var(--ink-60)]">{pet.species.toUpperCase()}{ageLabel(pet.birth_date)?` · ${ageLabel(pet.birth_date).toUpperCase()}`:''}{pet.weight_kg?` · ${pet.weight_kg} KG`:''}</p>
{isBirthdayToday(pet.birth_date)&&<p className="mono mt-1" style={{color:'var(--brass)'}}>★ {pet.name} is {ageLabel(pet.birth_date).split(' ')[0]} today.</p>}
</div>
</section>

<StatusHeadline petName={pet.name} treatments={petTreatments}/>
<ProtectionBar treatments={petTreatments}/>

<div className="card mt-6 p-6"><h2 className="mono text-[var(--ink-60)]">Today</h2><div className="mt-3"><TodayAction pet={pet} treatments={petTreatments} suggestion={suggestion} onDone={done} stamped={stamped}/></div></div>

<CompletenessDisclosure percent={percent} items={items}/>

<LifeStrip pet={pet} events={lifeEventsByPet[pet.id]||[]} treatmentCount={treatmentCountByPet[pet.id]||0} onTimePercent={onTimeByPet[pet.id]??null}/>

<div className="mt-10 flex flex-wrap gap-4 border-t border-[var(--rule)] pt-6"><a href={`/app/pets/${pet.id}/edit`} className="mono text-[var(--health)]">Edit {pet.name}</a><a href={`/app/pets/${pet.id}/care-profile`} className="mono text-[var(--health)]">Care profile</a><button type="button" className="mono text-[var(--health)]" onClick={()=>pets.length&&!premium?setPaywall('second_pet'):location.assign('/app/onboarding')}>Add a pet</button></div>

</div>{paywall&&<PaywallSheet trigger={paywall} petName={pets[1]?.name||'Luna'} onClose={()=>setPaywall(null)}/>}</main>}
