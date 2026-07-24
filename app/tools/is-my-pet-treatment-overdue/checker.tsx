'use client';
import {useEffect,useRef,useState} from 'react';import Link from 'next/link';import {useRouter} from 'next/navigation';import {checkOverdue} from '@/lib/overdue';import {presets} from '@/lib/presets';import {writePrefill} from '@/lib/prefill';import {trackToolCtaClicked,trackToolShared,trackToolUsed} from '@/lib/track';

export function Checker({initial}:{initial:{type:string;last:string;name:string;species:string}}){
const router=useRouter();
const today=new Date().toISOString().slice(0,10);
const [type,setType]=useState(presets.some(p=>p.type===initial.type)?initial.type:'flea_tick');
const [last,setLast]=useState(initial.last||'');
const [name,setName]=useState(initial.name||'');
const species=initial.species||'dog';
const [copied,setCopied]=useState(false);
const verdict=last?checkOverdue(type,last):null;
const tracked=useRef('');

useEffect(()=>{const params=new URLSearchParams();params.set('type',type);if(last)params.set('last',last);if(name)params.set('name',name);params.set('species',species);router.replace(`?${params.toString()}`,{scroll:false})},[type,last,name,species,router]);

useEffect(()=>{const key=`${type}-${last}`;if(verdict&&tracked.current!==key){tracked.current=key;trackToolUsed('is-my-pet-treatment-overdue',{type,status:verdict.status})}},[type,last,verdict]);

function share(){const url=window.location.href;if(navigator.share){navigator.share({title:'Is my pet’s treatment overdue?',url}).catch(()=>{})}else{navigator.clipboard?.writeText(url);setCopied(true);setTimeout(()=>setCopied(false),2000)}trackToolShared('is-my-pet-treatment-overdue',{type})}

function addToTailtend(){writePrefill({name:name||undefined,species,type,date:last||today});trackToolCtaClicked('is-my-pet-treatment-overdue',{type});router.push('/app/signup')}

return <div>
<div className="card mt-10 p-7">
<label className="mono block" htmlFor="pet-name">Their name (optional)</label>
<input id="pet-name" className="rule-input mt-2" value={name} onChange={e=>setName(e.target.value)} placeholder="Bella"/>
<div className="mt-6"><label className="mono block" htmlFor="type">Treatment</label><select id="type" className="rule-input mt-2" value={type} onChange={e=>setType(e.target.value)}>{presets.map(p=><option key={p.type} value={p.type}>{p.name}</option>)}</select></div>
<div className="mt-6"><label className="mono block" htmlFor="last">Last given</label><input id="last" type="date" max={today} className="rule-input mt-2" value={last} onChange={e=>setLast(e.target.value)}/></div>
</div>
{verdict&&<div className={`card mt-8 p-7 text-center ${verdict.status==='overdue'?'ring-2 ring-[var(--stamp)]':''}`}>
<p className="mono text-[var(--health)]">Verdict</p>
{verdict.status==='overdue'&&<p className="mt-3 text-5xl">Overdue by {verdict.days} {verdict.days===1?'day':'days'}</p>}
{verdict.status==='due-today'&&<p className="mt-3 text-5xl">Due today</p>}
{verdict.status==='upcoming'&&<p className="mt-3 text-5xl">Due in {verdict.days} {verdict.days===1?'day':'days'}</p>}
<p className="muted mt-3">Next due date: {verdict.nextDue}, based on the standard interval for this treatment type.</p>
<div className="mt-6 flex flex-wrap justify-center gap-3">
<button type="button" className="btn" onClick={addToTailtend}>Never wonder again — track {name||'this'} on Tailtend</button>
<button type="button" className="chip px-4 py-3" onClick={share}>{copied?'Link copied':'Share this result'}</button>
</div>
</div>}
<p className="muted mt-6 text-sm">A missed date is a gap, not a reason to double up — read the product label before giving anything late, and call your vet for vaccines, prescription medicine or high-risk situations. See our <Link className="underline" href="/blog/missed-flea-treatment">missed flea treatment guide</Link> for what to do next.</p>
</div>}
