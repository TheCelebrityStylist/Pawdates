'use client';
import {useEffect,useRef,useState} from 'react';import Link from 'next/link';import {useRouter} from 'next/navigation';import {humanYears,type DogSize} from '@/lib/pet-age';import {writePrefill} from '@/lib/prefill';import {trackToolCtaClicked,trackToolShared,trackToolUsed} from '@/lib/track';

const sizes:{value:DogSize;label:string}[]=[{value:'small',label:'Small (under 9kg)'},{value:'medium',label:'Medium (9–23kg)'},{value:'large',label:'Large (23–41kg)'},{value:'giant',label:'Giant (over 41kg)'}];

export function Calculator({initial}:{initial:{species:string;size:string;age:string;name:string}}){
const router=useRouter();
const [species,setSpecies]=useState<'dog'|'cat'>(initial.species==='cat'?'cat':'dog');
const [size,setSize]=useState<DogSize>((['small','medium','large','giant'] as const).includes(initial.size as DogSize)?initial.size as DogSize:'medium');
const [age,setAge]=useState(initial.age||'4');
const [name,setName]=useState(initial.name||'');
const [copied,setCopied]=useState(false);
const ageNum=Math.max(0,Math.min(30,Number(age)||0));
const result=humanYears(species,size,ageNum);
const tracked=useRef('');

useEffect(()=>{const params=new URLSearchParams();params.set('species',species);if(species==='dog')params.set('size',size);params.set('age',age);if(name)params.set('name',name);router.replace(`?${params.toString()}`,{scroll:false})},[species,size,age,name,router]);

useEffect(()=>{const key=`${species}-${size}-${age}`;if(ageNum>0&&tracked.current!==key){tracked.current=key;trackToolUsed('pet-age-calculator',{species,size,age})}},[species,size,age,ageNum]);

function share(){const url=window.location.href;if(navigator.share){navigator.share({title:'Pet age calculator',url}).catch(()=>{})}else{navigator.clipboard?.writeText(url);setCopied(true);setTimeout(()=>setCopied(false),2000)}trackToolShared('pet-age-calculator',{species,size,age})}

function addToTailtend(){writePrefill({name:name||undefined,species,type:'vet_checkup',date:new Date().toISOString().slice(0,10)});trackToolCtaClicked('pet-age-calculator',{species,size,age});router.push('/app/signup')}

return <div>
<div className="card mt-10 p-7">
<label className="mono block" htmlFor="pet-name">Their name (optional)</label>
<input id="pet-name" className="rule-input mt-2" value={name} onChange={e=>setName(e.target.value)} placeholder="Rex"/>
<div className="mt-6 grid grid-cols-2 gap-3">
{(['dog','cat'] as const).map(value=><button type="button" key={value} aria-pressed={species===value} onClick={()=>setSpecies(value)} className={`card p-4 text-center capitalize ${species===value?'ring-2 ring-[var(--health)]':''}`}>{value}</button>)}
</div>
{species==='dog'&&<div className="mt-6"><label className="mono block" htmlFor="size">Size</label><select id="size" className="rule-input mt-2" value={size} onChange={e=>setSize(e.target.value as DogSize)}>{sizes.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select></div>}
<div className="mt-6"><label className="mono block" htmlFor="age">Age in years</label><input id="age" type="number" min={0} max={30} step={0.5} className="rule-input mt-2" value={age} onChange={e=>setAge(e.target.value)}/></div>
</div>
{ageNum>0&&<div className="card mt-8 p-7 text-center">
<p className="mono text-[var(--health)]">In human years</p>
<p className="mt-3 text-6xl">{result}</p>
<p className="muted mt-3">{name||'Your pet'} is about {ageNum} {species} {ageNum===1?'year':'years'} old — roughly {result} in human years.</p>
<div className="mt-6 flex flex-wrap justify-center gap-3">
<button type="button" className="btn" onClick={addToTailtend}>Track {name||'their'} care on Tailtend</button>
<button type="button" className="chip px-4 py-3" onClick={share}>{copied?'Link copied':'Share this result'}</button>
</div>
</div>}
<p className="muted mt-6 text-sm">Uses the size-adjusted guideline published by the AVMA and AKC: year one ≈ 15 human years, year two adds 9 more, then each year after adds 4–7 depending on size — not the old ×7 rule. <Link className="underline" href="/about">More on how we source guidance</Link>.</p>
</div>}
