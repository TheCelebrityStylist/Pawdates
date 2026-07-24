'use client';
import {useEffect,useRef,useState} from 'react';import Link from 'next/link';import {useRouter} from 'next/navigation';import {planFor} from '@/lib/vaccination-plan';import {writePrefill} from '@/lib/prefill';import {trackToolCtaClicked,trackToolShared,trackToolUsed} from '@/lib/track';

export function Generator({initial}:{initial:{species:string;birth:string;name:string}}){
const router=useRouter();
const today=new Date().toISOString().slice(0,10);
const [species,setSpecies]=useState<'dog'|'cat'>(initial.species==='cat'?'cat':'dog');
const [birth,setBirth]=useState(initial.birth||'');
const [name,setName]=useState(initial.name||'');
const [copied,setCopied]=useState(false);
const plan=birth?planFor(species,birth):[];
const tracked=useRef('');

useEffect(()=>{const params=new URLSearchParams();params.set('species',species);if(birth)params.set('birth',birth);if(name)params.set('name',name);router.replace(`?${params.toString()}`,{scroll:false})},[species,birth,name,router]);

useEffect(()=>{const key=`${species}-${birth}`;if(plan.length&&tracked.current!==key){tracked.current=key;trackToolUsed('vaccination-schedule-generator',{species,birth})}},[species,birth,plan.length]);

function share(){const url=window.location.href;if(navigator.share){navigator.share({title:'Vaccination schedule',url}).catch(()=>{})}else{navigator.clipboard?.writeText(url);setCopied(true);setTimeout(()=>setCopied(false),2000)}trackToolShared('vaccination-schedule-generator',{species,birth})}

function addToTailtend(){writePrefill({name:name||undefined,species,type:'vaccination',date:today});trackToolCtaClicked('vaccination-schedule-generator',{species,birth});router.push('/app/signup')}

return <div>
<div className="card mt-10 p-7">
<label className="mono block" htmlFor="pet-name">Their name (optional)</label>
<input id="pet-name" className="rule-input mt-2" value={name} onChange={e=>setName(e.target.value)} placeholder="Milo"/>
<div className="mt-6 grid grid-cols-2 gap-3">
{(['dog','cat'] as const).map(value=><button type="button" key={value} aria-pressed={species===value} onClick={()=>setSpecies(value)} className={`card p-4 text-center capitalize ${species===value?'ring-2 ring-[var(--health)]':''}`}>{value}</button>)}
</div>
<div className="mt-6"><label className="mono block" htmlFor="birth">Date of birth (or best estimate)</label><input id="birth" type="date" max={today} className="rule-input mt-2" value={birth} onChange={e=>setBirth(e.target.value)}/></div>
</div>
{plan.length>0&&<div className="card mt-8 overflow-auto p-2"><table className="w-full text-left"><thead><tr><th className="p-4">Date</th><th className="p-4">Milestone</th><th className="p-4">Notes</th></tr></thead><tbody>{plan.map(m=><tr className="border-t border-[var(--rule)]" key={m.label}><td className="p-4 text-[var(--health)]">{m.date}</td><td className="p-4">{m.label}</td><td className="p-4 muted">{m.detail}</td></tr>)}</tbody></table></div>}
{plan.length>0&&<div className="mt-6 flex flex-wrap gap-3">
<button type="button" className="btn" onClick={addToTailtend}>Save this to Tailtend so you never miss one</button>
<button type="button" className="chip px-4 py-3" onClick={share}>{copied?'Link copied':'Share this schedule'}</button>
</div>}
<p className="muted mt-6 text-sm">A general first-year timeline, not an individual veterinary protocol — your vet will adjust exact timing for your pet. See our <Link className="underline" href="/guides/puppy-first-year-schedule">puppy</Link> and <Link className="underline" href="/guides/kitten-first-year-schedule">kitten</Link> first-year guides for the full context.</p>
</div>}
