import {notFound} from 'next/navigation';import {admin} from '@/lib/supabase';import {observationTagLabel,type Medical,type ObservationTag} from '@/lib/care-profile';

function fmt(date:string){return new Date(date).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}

export async function generateMetadata(){return {title:'Vet record',robots:{index:false,follow:false}}}

export default async function VetSharePage({params}:{params:Promise<{token:string}>}){
const {token}=await params;
const db=admin();
const {data:pet}=await db.from('pets').select('id,name,species,birth_date,weight_kg,sex,neutered,microchip_number,vet_share_enabled').eq('vet_share_token',token).single();
if(!pet||!pet.vet_share_enabled)notFound();

const [{data:treatments},{data:weights},{data:observations},{data:profile}]=await Promise.all([
db.from('treatments').select('id,name,type,last_given,next_due,cost_cents').eq('pet_id',pet.id).order('next_due'),
db.from('weight_log').select('recorded_at,weight_kg').eq('pet_id',pet.id).order('recorded_at'),
db.from('observation_log').select('tag,note,created_at').eq('pet_id',pet.id).order('created_at',{ascending:false}).limit(15),
db.from('pet_profile').select('medical').eq('pet_id',pet.id).maybeSingle()
]);

const medical=(profile?.medical||{}) as Medical;
const totalCostCents=(treatments||[]).reduce((sum,t)=>sum+(t.cost_cents||0),0);

return <main className="min-h-screen bg-[var(--paper)] px-5 py-10"><div className="mx-auto max-w-2xl">
<p className="mono text-[var(--health)]">Vet record · read-only clinical view, shared by the owner</p>

<div className="card mt-6 p-6 md:p-8">
<header className="flex flex-wrap items-center gap-6 border-b border-[var(--rule)] pb-6"><span className="tag"><span>{pet.name[0]}</span></span><div><h1 className="text-3xl">{pet.name}</h1><p className="mono mt-2 text-[var(--ink-60)] capitalize">{pet.species}{pet.sex&&pet.sex!=='unknown'?` · ${pet.sex}`:''}{pet.neutered!==null?pet.neutered?' · neutered':' · not neutered':''}{pet.weight_kg?` · ${pet.weight_kg} kg`:''}</p>{pet.microchip_number&&<p className="mono mt-1 text-xs text-[var(--ink-60)]">Chip {pet.microchip_number}</p>}</div></header>
</div>

{(medical.conditions||medical.allergies||medical.medications||medical.vaccinationHistory||medical.pastProcedures)&&<section className="card mt-6 p-6 md:p-8"><h2 className="text-2xl">Owner-recorded medical history</h2><p className="muted mt-1 text-xs">Recorded by the owner, not a clinical diagnosis.</p>
{medical.conditions&&<p className="muted mt-3"><b>Conditions:</b> {medical.conditions}</p>}
{medical.allergies&&<p className="muted mt-2"><b>Allergies:</b> {medical.allergies}</p>}
{medical.medications&&<p className="muted mt-2"><b>Current medications:</b> {medical.medications}</p>}
{medical.vaccinationHistory&&<p className="muted mt-2"><b>Vaccination history:</b> {medical.vaccinationHistory}</p>}
{medical.pastProcedures&&<p className="muted mt-2"><b>Past procedures:</b> {medical.pastProcedures}</p>}
</section>}

{(treatments||[]).length>0&&<section className="card mt-6 p-6 md:p-8"><h2 className="text-2xl">Treatment record</h2>
{(treatments||[]).map(t=><div className="ledger-row" key={t.id}><div><b>{t.name}</b><p className="mono mt-1 text-[var(--ink-60)]">Last given {fmt(t.last_given)} · Next due {fmt(t.next_due)}</p></div>{t.cost_cents?<span className="mono text-[var(--ink-60)]">€{(t.cost_cents/100).toFixed(2)}</span>:null}</div>)}
{totalCostCents>0&&<p className="muted mt-3 text-sm">Recorded treatment cost: €{(totalCostCents/100).toFixed(2)}</p>}
</section>}

{(weights||[]).length>0&&<section className="card mt-6 p-6 md:p-8"><h2 className="text-2xl">Weight history</h2>
<div className="mt-3 space-y-1">{(weights||[]).map((w,i)=><div key={i} className="flex items-center justify-between text-sm"><span className="mono text-[var(--ink-60)]">{fmt(w.recorded_at)}</span><span>{w.weight_kg} kg</span></div>)}</div>
</section>}

{(observations||[]).length>0&&<section className="card mt-6 p-6 md:p-8"><h2 className="text-2xl">Observation log</h2><p className="muted mt-1 text-xs">Owner-logged, zero interpretation.</p>
<div className="mt-3 space-y-1">{(observations||[]).map((o,i)=><div key={i} className="flex items-center justify-between text-sm"><span>{observationTagLabel[o.tag as ObservationTag]}{o.note?` — ${o.note}`:''}</span><span className="mono text-[var(--ink-60)]">{fmt(o.created_at)}</span></div>)}</div>
</section>}

<footer className="card mt-6 p-6 text-center"><p className="muted">Tracked with Tailtend.</p></footer>
</div></main>}
