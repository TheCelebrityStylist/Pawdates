'use client';
import {useEffect,useRef,useState} from 'react';import Link from 'next/link';import {useRouter} from 'next/navigation';import {annualCost,missedRange,type ProductType,type WeightBand} from '@/lib/pet-cost';import {writePrefill} from '@/lib/prefill';import {trackToolCtaClicked,trackToolShared,trackToolUsed} from '@/lib/track';

const bands:{value:WeightBand;label:string}[]=[{value:'small',label:'Small (under 10kg)'},{value:'medium',label:'Medium (10–25kg)'},{value:'large',label:'Large (over 25kg)'}];
const products:{value:ProductType;label:string}[]=[{value:'flea',label:'Flea & tick only'},{value:'worming',label:'Worming only'},{value:'both',label:'Both'}];

export function Calculator({initial}:{initial:{species:string;band:string;product:string;name:string}}){
const router=useRouter();
const [species,setSpecies]=useState<'dog'|'cat'>(initial.species==='cat'?'cat':'dog');
const [band,setBand]=useState<WeightBand>((['small','medium','large'] as const).includes(initial.band as WeightBand)?initial.band as WeightBand:'medium');
const [product,setProduct]=useState<ProductType>((['flea','worming','both'] as const).includes(initial.product as ProductType)?initial.product as ProductType:'both');
const [name,setName]=useState(initial.name||'');
const [copied,setCopied]=useState(false);
const annual=annualCost(species,band,product);const [missLow,missHigh]=missedRange(annual);
const tracked=useRef('');

useEffect(()=>{const params=new URLSearchParams();params.set('species',species);if(species==='dog')params.set('band',band);params.set('product',product);if(name)params.set('name',name);router.replace(`?${params.toString()}`,{scroll:false})},[species,band,product,name,router]);

useEffect(()=>{const key=`${species}-${band}-${product}`;if(tracked.current!==key){tracked.current=key;trackToolUsed('flea-worming-cost-calculator',{species,band,product})}},[species,band,product]);

function share(){const url=window.location.href;if(navigator.share){navigator.share({title:'Flea & worming cost calculator',url}).catch(()=>{})}else{navigator.clipboard?.writeText(url);setCopied(true);setTimeout(()=>setCopied(false),2000)}trackToolShared('flea-worming-cost-calculator',{species,band,product})}

function addToTailtend(){writePrefill({name:name||undefined,species,type:product==='worming'?'worming':'flea_tick',date:new Date().toISOString().slice(0,10)});trackToolCtaClicked('flea-worming-cost-calculator',{species,band,product});router.push('/app/signup')}

return <div>
<div className="card mt-10 p-7">
<label className="mono block" htmlFor="pet-name">Their name (optional)</label>
<input id="pet-name" className="rule-input mt-2" value={name} onChange={e=>setName(e.target.value)} placeholder="Luna"/>
<div className="mt-6 grid grid-cols-2 gap-3">
{(['dog','cat'] as const).map(value=><button type="button" key={value} aria-pressed={species===value} onClick={()=>setSpecies(value)} className={`card p-4 text-center capitalize ${species===value?'ring-2 ring-[var(--health)]':''}`}>{value}</button>)}
</div>
{species==='dog'&&<div className="mt-6"><label className="mono block" htmlFor="band">Weight</label><select id="band" className="rule-input mt-2" value={band} onChange={e=>setBand(e.target.value as WeightBand)}>{bands.map(b=><option key={b.value} value={b.value}>{b.label}</option>)}</select></div>}
<div className="mt-6"><label className="mono block" htmlFor="product">What are you budgeting for?</label><select id="product" className="rule-input mt-2" value={product} onChange={e=>setProduct(e.target.value as ProductType)}>{products.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}</select></div>
</div>
<div className="card mt-8 p-7 text-center">
<p className="mono text-[var(--health)]">Estimated yearly cost</p>
<p className="mt-3 text-6xl">€{annual}</p>
<p className="muted mt-3">A lapsed schedule that turns into a home infestation routinely costs <b>€{missLow}–€{missHigh}</b> to put right — several times the prevention cost. See <Link className="underline" href="/blog/missed-flea-treatment">what a missed treatment actually costs</Link>.</p>
<div className="mt-6 flex flex-wrap justify-center gap-3">
<button type="button" className="btn" onClick={addToTailtend}>Never miss {name||'their'} dose again</button>
<button type="button" className="chip px-4 py-3" onClick={share}>{copied?'Link copied':'Share this estimate'}</button>
</div>
</div>
<p className="muted mt-6 text-sm">Indicative European ranges consistent with our <Link className="underline" href="/blog/annual-pet-care-costs">annual pet care cost breakdown</Link> — your product, region and vet will move the exact numbers.</p>
</div>}
