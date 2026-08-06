import {redirect} from 'next/navigation';import {isPremium} from '@/lib/premium';import {supabase,user} from '@/lib/supabase';import type {Profile} from '@/lib/supabase';import {AppShell} from '@/components/app-shell';import {birthdayMilestones} from '@/lib/milestones';

export type LifeEvent={id:string;date:string;kind:'treatment'|'visit'|'weight'|'checkoff'|'milestone';label:string;detail:string;wasOverdue:boolean|null;photoUrl?:string|null};

export default async function Dashboard({searchParams}:{searchParams:Promise<{onboarded?:string;upgraded?:string}>}){
const u=await user();if(!u)redirect('/app/login');
const s=await supabase();
const [{data:profile},{data:pets},{data:treatments},query]=await Promise.all([
s.from('profiles').select('*').single(),
s.from('pets').select('id,name,species,birth_date,weight_kg,photo_path,created_at').order('created_at'),
s.from('treatments').select('id,name,type,next_due,pet_id').order('next_due'),
searchParams
]);

const petIds=(pets||[]).map(p=>p.id);
const [{data:profiles},{data:weightLogs},{data:vetVisits},{data:treatmentLogs},{data:routineChecks},milestonesResult]=petIds.length?await Promise.all([
s.from('pet_profile').select('*').in('pet_id',petIds),
s.from('weight_log').select('pet_id,recorded_at,weight_kg').in('pet_id',petIds).order('recorded_at',{ascending:false}),
s.from('vet_visits').select('pet_id,date,reason,cost_cents').in('pet_id',petIds).order('date',{ascending:false}),
s.from('treatment_log').select('done_at,was_overdue,treatment:treatments(name,pet_id)').order('done_at',{ascending:false}).limit(60),
s.from('routine_checks').select('checked_at,checked_by,pet_id,routine_item:routine_items(label)').order('checked_at',{ascending:false}).limit(30),
s.from('milestones').select('pet_id,title,note,photo_path,occurred_on').in('pet_id',petIds).order('occurred_on',{ascending:false})
]):[{data:[]},{data:[]},{data:[]},{data:[]},{data:[]},{data:[]}];
const milestones=milestonesResult.data||[];

// Daily-use data (migrations 0017/0018 may be unapplied → fall back to empty).
const today=new Date().toISOString().slice(0,10);
const [nutR,feedR,obsR]=petIds.length?await Promise.all([
s.from('nutrition_plans').select('pet_id,feeding_times').in('pet_id',petIds),
s.from('feeding_log').select('pet_id,meal_time_slot,fed_by').in('pet_id',petIds).eq('fed_for_date',today),
s.from('observation_log').select('pet_id,created_at').in('pet_id',petIds).gte('created_at',`${today}T00:00:00`)
]):[{data:[],error:null},{data:[],error:null},{data:[],error:null}];
const nutritionRows=(nutR.error?[]:nutR.data||[]) as {pet_id:string;feeding_times:string[]}[];
const feedRows=(feedR.error?[]:feedR.data||[]) as {pet_id:string;meal_time_slot:string;fed_by:string}[];
const obsRows=(obsR.error?[]:obsR.data||[]) as {pet_id:string;created_at:string}[];
const feedingByPet=Object.fromEntries((pets||[]).map(p=>{const times=(nutritionRows.find(n=>n.pet_id===p.id)?.feeding_times)||[];const fed=Object.fromEntries(feedRows.filter(f=>f.pet_id===p.id).map(f=>[f.meal_time_slot,f.fed_by]));return [p.id,{slots:[...times].sort(),fed}]}));
const observedTodayByPet=Object.fromEntries((pets||[]).map(p=>[p.id,obsRows.some(o=>o.pet_id===p.id)]));

const photoUrls=Object.fromEntries((pets||[]).filter(p=>p.photo_path).map(p=>[p.id,s.storage.from('pet-photos').getPublicUrl(p.photo_path!).data.publicUrl]));

const lifeEventsByPet:Record<string,LifeEvent[]>={};
for(const pet of pets||[]){
const events:LifeEvent[]=[];
for(const w of (weightLogs||[]).filter(w=>w.pet_id===pet.id).slice(0,15))events.push({id:`w-${pet.id}-${w.recorded_at}`,date:w.recorded_at,kind:'weight',label:'Weight logged',detail:`${w.weight_kg} kg`,wasOverdue:null});
for(const v of (vetVisits||[]).filter(v=>v.pet_id===pet.id).slice(0,15))events.push({id:`v-${pet.id}-${v.date}`,date:v.date,kind:'visit',label:v.reason,detail:v.cost_cents?`€${(v.cost_cents/100).toFixed(2)}`:'Vet visit',wasOverdue:null});
for(const t of (treatmentLogs||[]).filter(t=>{const tr=Array.isArray(t.treatment)?t.treatment[0]:t.treatment;return tr?.pet_id===pet.id}).slice(0,15)){const tr=Array.isArray(t.treatment)?t.treatment[0]:t.treatment;events.push({id:`t-${pet.id}-${t.done_at}`,date:t.done_at,kind:'treatment',label:tr?.name||'Treatment',detail:'Marked done',wasOverdue:t.was_overdue})}
for(const c of (routineChecks||[]).filter(c=>c.pet_id===pet.id).slice(0,15)){const item=Array.isArray(c.routine_item)?c.routine_item[0]:c.routine_item;events.push({id:`c-${pet.id}-${c.checked_at}`,date:c.checked_at,kind:'checkoff',label:item?.label||'Checked off',detail:`By ${c.checked_by}`,wasOverdue:null})}
for(const m of milestones.filter(m=>m.pet_id===pet.id))events.push({id:`m-${pet.id}-${m.occurred_on}-${m.title}`,date:m.occurred_on,kind:'milestone',label:m.title,detail:m.note||'Milestone',wasOverdue:null,photoUrl:m.photo_path?s.storage.from('pet-photos').getPublicUrl(m.photo_path).data.publicUrl:null});
for(const b of birthdayMilestones(pet.birth_date))events.push({id:`b-${pet.id}-${b.date}`,date:b.date,kind:'milestone',label:`🎂 ${b.title}`,detail:'Birthday',wasOverdue:null});
lifeEventsByPet[pet.id]=events.sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime()).slice(0,20);
}

const latestWeightByPet=Object.fromEntries((pets||[]).map(p=>[p.id,(weightLogs||[]).find(w=>w.pet_id===p.id)?.recorded_at||null]));
const latestVisitByPet=Object.fromEntries((pets||[]).map(p=>[p.id,(vetVisits||[]).find(v=>v.pet_id===p.id)?.date||null]));
const treatmentCountByPet=Object.fromEntries((pets||[]).map(p=>[p.id,(treatmentLogs||[]).filter(t=>{const tr=Array.isArray(t.treatment)?t.treatment[0]:t.treatment;return tr?.pet_id===p.id}).length]));
const onTimeByPet=Object.fromEntries((pets||[]).map(p=>{const known=(treatmentLogs||[]).filter(t=>{const tr=Array.isArray(t.treatment)?t.treatment[0]:t.treatment;return tr?.pet_id===p.id&&t.was_overdue!==null});if(!known.length)return [p.id,null];const onTime=known.filter(t=>!t.was_overdue).length;return [p.id,Math.round(onTime/known.length*100)]}));

return <AppShell
email={u.email||''}
pets={(pets||[]).map(p=>({...p,photoUrl:photoUrls[p.id]||null}))}
treatments={(treatments||[]) as never}
profiles={(profiles||[]) as never}
premium={isPremium(profile as Profile)}
lifeEventsByPet={lifeEventsByPet}
latestWeightByPet={latestWeightByPet}
latestVisitByPet={latestVisitByPet}
treatmentCountByPet={treatmentCountByPet}
onTimeByPet={onTimeByPet}
feedingByPet={feedingByPet}
observedTodayByPet={observedTodayByPet}
initialNotice={query.upgraded==='1'?'Thank you — Premium is active. Every treatment record is unlocked.':query.onboarded?`${query.onboarded}'s record is running. Next up is already on the calendar.`:''}
/>}
