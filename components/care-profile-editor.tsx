'use client';
import {useState} from 'react';import type {Behaviour,Feeding,HouseAccess,HouseLogistics,PlayEnrichment,RoutineCategory,RoutineNotes,ToiletHygiene} from '@/lib/care-profile';import {routineCategories} from '@/lib/care-profile';

type Profile={
essentials_flag:string|null;forbidden_foods:string[];feeding:Feeding;routine_notes:RoutineNotes;toilet_hygiene:ToiletHygiene;behaviour:Behaviour;house_logistics:HouseLogistics;house_access:HouseAccess;play_enrichment:PlayEnrichment;house_access_shared:boolean;live_checkoff_enabled:boolean
}|null;
type RoutineItem={id:string;time:string;label:string;category:RoutineCategory;sitter_can_check:boolean};

const empty:NonNullable<Profile>={essentials_flag:'',forbidden_foods:[],feeding:{},routine_notes:{},toilet_hygiene:{},behaviour:{},house_logistics:{},house_access:{},play_enrichment:{},house_access_shared:false,live_checkoff_enabled:false};

function Field({label,value,onChange,placeholder}:{label:string;value:string;onChange:(v:string)=>void;placeholder?:string}){return <label className="mt-3 block text-sm"><span className="text-black/60">{label}</span><input className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></label>}
function Area({label,value,onChange,placeholder}:{label:string;value:string;onChange:(v:string)=>void;placeholder?:string}){return <label className="mt-3 block text-sm"><span className="text-black/60">{label}</span><textarea className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2" rows={2} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></label>}
function GoodWith({label,value,onChange}:{label:string;value:string;onChange:(v:'yes'|'some'|'no')=>void}){return <div className="mt-3 flex items-center justify-between text-sm"><span className="text-black/60">{label}</span><div className="flex gap-1">{(['yes','some','no'] as const).map(v=><button type="button" key={v} onClick={()=>onChange(v)} className={`rounded-full border px-3 py-1 ${value===v?'border-clay bg-clay/10':'border-black/15'}`}>{v}</button>)}</div></div>}
function Section({title,children}:{title:string;children:React.ReactNode}){return <section className="mt-4 rounded-2xl border border-black/10 bg-white p-5"><h2 className="font-medium">{title}</h2>{children}</section>}

export function CareProfileEditor({petId,initialProfile,initialItems}:{petId:string;initialProfile:Profile;initialItems:RoutineItem[]}){
const [p,setP]=useState<NonNullable<Profile>>(initialProfile||empty);
const [foodsText,setFoodsText]=useState((initialProfile?.forbidden_foods||[]).join(', '));
const [items,setItems]=useState(initialItems);
const [newItem,setNewItem]=useState<{time:string;label:string;category:RoutineCategory;sitterCanCheck:boolean}>({time:'08:00',label:'',category:'meal',sitterCanCheck:false});
const [saving,setSaving]=useState(false);
const [saved,setSaved]=useState(false);

function set<K extends keyof NonNullable<Profile>>(key:K,value:NonNullable<Profile>[K]){setP(v=>({...v,[key]:value}))}
function setSection<S extends 'feeding'|'routine_notes'|'toilet_hygiene'|'behaviour'|'house_logistics'|'house_access'|'play_enrichment'>(section:S,key:string,value:string){setP(v=>({...v,[section]:{...v[section],[key]:value}}))}

async function save(){setSaving(true);setSaved(false);try{const forbiddenFoods=foodsText.split(',').map(s=>s.trim()).filter(Boolean);const r=await fetch(`/api/pets/${petId}/care-profile`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({essentialsFlag:p.essentials_flag||undefined,forbiddenFoods,feeding:p.feeding,routineNotes:p.routine_notes,toiletHygiene:p.toilet_hygiene,behaviour:p.behaviour,houseLogistics:p.house_logistics,houseAccess:p.house_access,playEnrichment:p.play_enrichment,houseAccessShared:p.house_access_shared,liveCheckoffEnabled:p.live_checkoff_enabled})});if(r.ok)setSaved(true)}finally{setSaving(false)}}

async function addItem(){if(!newItem.label.trim())return;const r=await fetch(`/api/pets/${petId}/routine-items`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(newItem)});if(r.ok){const json=await r.json();setItems(v=>[...v,json.item]);setNewItem({time:'08:00',label:'',category:'meal',sitterCanCheck:false})}}
async function removeItem(id:string){setItems(v=>v.filter(i=>i.id!==id));await fetch(`/api/pets/${petId}/routine-items/${id}`,{method:'DELETE'})}

return <div>
<Section title="Essentials"><Area label="The one line a sitter must see first" value={p.essentials_flag||''} onChange={v=>set('essentials_flag',v)} placeholder="e.g. Bolts if the front door opens — leash on FIRST"/></Section>

<Section title="Strictly no — forbidden foods">
<Area label="Comma-separated (chocolate, grapes, …)" value={foodsText} onChange={setFoodsText} placeholder="chocolate, grapes, onions"/>
</Section>

<Section title="Food & feeding">
<Field label="Brand" value={p.feeding.brand||''} onChange={v=>setSection('feeding','brand',v)}/>
<Field label="Exact product" value={p.feeding.product||''} onChange={v=>setSection('feeding','product',v)}/>
<Field label="Amount per meal" value={p.feeding.amountPerMeal||''} onChange={v=>setSection('feeding','amountPerMeal',v)} placeholder="1 cup"/>
<Area label="How it's served" value={p.feeding.serveNotes||''} onChange={v=>setSection('feeding','serveNotes',v)} placeholder="Dry, with a warm topper at dinner"/>
<Area label="Treats: what's allowed" value={p.feeding.treatsAllowed||''} onChange={v=>setSection('feeding','treatsAllowed',v)}/>
<Area label="Water notes" value={p.feeding.waterNotes||''} onChange={v=>setSection('feeding','waterNotes',v)}/>
<Area label="Supplements" value={p.feeding.supplements||''} onChange={v=>setSection('feeding','supplements',v)}/>
<Field label="Where food is kept" value={p.feeding.whereKept||''} onChange={v=>setSection('feeding','whereKept',v)}/>
<Field label="Running low? Buy this" value={p.feeding.restockBrand||''} onChange={v=>setSection('feeding','restockBrand',v)}/>
</Section>

<Section title="Daily routine">
<Area label="Exercise" value={p.routine_notes.favouriteRoute||''} onChange={v=>setSection('routine_notes','favouriteRoute',v)} placeholder="Two 30-minute walks, off-lead at the park, loves the river loop"/>
<Area label="Alone-time tolerance" value={p.routine_notes.aloneTimeTolerance||''} onChange={v=>setSection('routine_notes','aloneTimeTolerance',v)} placeholder="Fine up to 4 hours; settles on the sofa"/>
<div className="mt-4 border-t border-black/10 pt-3">
<p className="text-sm text-black/60">Timeline</p>
{items.map(i=><div key={i.id} className="mt-2 flex items-center justify-between text-sm"><span>{i.time} · {i.label} <span className="text-black/40">({i.category}{i.sitter_can_check?' · sitter can check off':''})</span></span><button type="button" className="text-clay" onClick={()=>removeItem(i.id)}>Remove</button></div>)}
<div className="mt-3 flex flex-wrap items-center gap-2">
<input type="time" className="rounded-lg border border-black/15 px-2 py-1 text-sm" value={newItem.time} onChange={e=>setNewItem(v=>({...v,time:e.target.value}))}/>
<input className="min-w-[140px] flex-1 rounded-lg border border-black/15 px-2 py-1 text-sm" placeholder="Breakfast" value={newItem.label} onChange={e=>setNewItem(v=>({...v,label:e.target.value}))}/>
<select className="rounded-lg border border-black/15 px-2 py-1 text-sm" value={newItem.category} onChange={e=>setNewItem(v=>({...v,category:e.target.value as RoutineCategory}))}>{routineCategories.map(c=><option key={c} value={c}>{c}</option>)}</select>
<label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={newItem.sitterCanCheck} onChange={e=>setNewItem(v=>({...v,sitterCanCheck:e.target.checked}))}/>Sitter can check off</label>
<button type="button" className="text-sm text-clay" onClick={addItem}>Add</button>
</div>
</div>
</Section>

<Section title="Toilet & hygiene">
<Area label="Dog: walk schedule for toileting" value={p.toilet_hygiene.dogWalkSchedule||''} onChange={v=>setSection('toilet_hygiene','dogWalkSchedule',v)}/>
<Area label="Signals they give" value={p.toilet_hygiene.dogSignals||''} onChange={v=>setSection('toilet_hygiene','dogSignals',v)}/>
<Area label="Cat: litter type & box locations" value={p.toilet_hygiene.catLitterType||''} onChange={v=>setSection('toilet_hygiene','catLitterType',v)}/>
<Area label="Grooming during a stay" value={p.toilet_hygiene.grooming||''} onChange={v=>setSection('toilet_hygiene','grooming',v)}/>
</Section>

<Section title="Behaviour & temperament">
<Area label="Personality, in your words" value={p.behaviour.personality||''} onChange={v=>setSection('behaviour','personality',v)}/>
<Area label="Fears & triggers" value={p.behaviour.fearsTriggers||''} onChange={v=>setSection('behaviour','fearsTriggers',v)} placeholder="Fireworks — hides under the bed, leave a radio on"/>
<Area label="Commands & cues" value={p.behaviour.commandsKnown||''} onChange={v=>setSection('behaviour','commandsKnown',v)}/>
<GoodWith label="Good with kids" value={p.behaviour.goodWithKids||''} onChange={v=>setSection('behaviour','goodWithKids',v)}/>
<GoodWith label="Good with dogs" value={p.behaviour.goodWithDogs||''} onChange={v=>setSection('behaviour','goodWithDogs',v)}/>
<GoodWith label="Good with cats" value={p.behaviour.goodWithCats||''} onChange={v=>setSection('behaviour','goodWithCats',v)}/>
<GoodWith label="Good with strangers" value={p.behaviour.goodWithStrangers||''} onChange={v=>setSection('behaviour','goodWithStrangers',v)}/>
<Area label="Handling — how they like to be approached" value={p.behaviour.handling||''} onChange={v=>setSection('behaviour','handling',v)}/>
<Area label="What calms them" value={p.behaviour.comfort||''} onChange={v=>setSection('behaviour','comfort',v)}/>
</Section>

<Section title="House & logistics">
<Field label="Vet — name/clinic" value={p.house_logistics.vetName||''} onChange={v=>setSection('house_logistics','vetName',v)}/>
<Field label="Vet — phone (emergency contact)" value={p.house_logistics.vetPhone||''} onChange={v=>setSection('house_logistics','vetPhone',v)}/>
<Area label="Where things live" value={p.house_logistics.whereThingsLive||''} onChange={v=>setSection('house_logistics','whereThingsLive',v)} placeholder="Leash by the front door, meds in the kitchen drawer"/>
<Area label="House rules" value={p.house_logistics.houseRules||''} onChange={v=>setSection('house_logistics','houseRules',v)}/>
<Area label="Other pets in the home" value={p.house_logistics.otherPets||''} onChange={v=>setSection('house_logistics','otherPets',v)}/>
</Section>

<Section title="House access — kept separate on purpose">
<p className="mt-2 text-sm text-black/60">Lockbox, alarm and key notes are only ever shown on a share link if you explicitly turn this on below — the general share toggle in Settings does not include these.</p>
<Area label="Getting in/out" value={p.house_access.entryNotes||''} onChange={v=>setSection('house_access','entryNotes',v)}/>
<Area label="Alarm" value={p.house_access.alarmNotes||''} onChange={v=>setSection('house_access','alarmNotes',v)}/>
<Field label="Which door" value={p.house_access.whichDoor||''} onChange={v=>setSection('house_access','whichDoor',v)}/>
<Field label="Backup contact — name" value={p.house_access.backupContactName||''} onChange={v=>setSection('house_access','backupContactName',v)}/>
<Field label="Backup contact — phone" value={p.house_access.backupContactPhone||''} onChange={v=>setSection('house_access','backupContactPhone',v)}/>
<label className="mt-4 flex items-center justify-between rounded-lg border border-black/10 p-3 text-sm"><span>Include house-access notes on the share link</span><input type="checkbox" checked={p.house_access_shared} onChange={e=>set('house_access_shared',e.target.checked)}/></label>
</Section>

<Section title="Play & enrichment">
<Area label="Favourite games & toys" value={p.play_enrichment.favouriteGames||''} onChange={v=>setSection('play_enrichment','favouriteGames',v)}/>
<Area label="What a good day looks like" value={p.play_enrichment.goodDayLooksLike||''} onChange={v=>setSection('play_enrichment','goodDayLooksLike',v)}/>
</Section>

<Section title="Live check-off">
<label className="mt-2 flex items-center justify-between text-sm"><span>Let the sitter tick off today&apos;s timeline — you&apos;ll see it happen with a timestamp and who did it</span><input type="checkbox" checked={p.live_checkoff_enabled} onChange={e=>set('live_checkoff_enabled',e.target.checked)}/></label>
</Section>

<button type="button" className="btn mt-6 w-full" disabled={saving} onClick={save}>{saving?'Saving…':'Save care profile'}</button>
{saved&&<p role="status" className="mt-3 text-center text-sm text-black/60">Saved.</p>}
</div>}
