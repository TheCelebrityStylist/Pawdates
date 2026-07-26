import {notFound} from 'next/navigation';import {admin} from '@/lib/supabase';import {birthdayMilestones} from '@/lib/milestones';

export async function generateMetadata({params}:{params:Promise<{token:string}>}){
const {token}=await params;
const db=admin();
const {data:pet}=await db.from('pets').select('name,share_enabled').eq('share_token',token).maybeSingle();
if(!pet||!pet.share_enabled)return {title:'Tailtend',robots:{index:false,follow:false}};
return {title:`${pet.name}'s story · Tailtend`,description:`The record kept for ${pet.name} — milestones, treatments, and years of care.`,robots:{index:false,follow:false}};
}

export default async function RecapPage({params}:{params:Promise<{token:string}>}){
const {token}=await params;
const db=admin();
const {data:pet}=await db.from('pets').select('id,name,species,birth_date,created_at,share_enabled').eq('share_token',token).maybeSingle();
if(!pet||!pet.share_enabled)notFound();

const {data:milestones}=await db.from('milestones').select('title,occurred_on').eq('pet_id',pet.id).order('occurred_on',{ascending:false}).limit(8);
const daysTracked=Math.max(1,Math.round((Date.now()-new Date(pet.created_at).getTime())/86400000));
const years=Math.floor(daysTracked/365);
const durationLabel=years>=1?`${years} year${years===1?'':'s'} with Tailtend`:`${daysTracked} day${daysTracked===1?'':'s'} with Tailtend`;
const birthdays=birthdayMilestones(pet.birth_date);
const all=[...(milestones||[]).map(m=>({title:m.title,date:m.occurred_on})),...birthdays.map(b=>({title:`🎂 ${b.title}`,date:b.date}))].sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime());

return <main className="min-h-screen bg-[var(--paper)] px-5 py-16"><div className="mx-auto max-w-xl text-center">
<p className="mono text-[var(--health)]">Tailtend · {pet.name}&apos;s story</p>
<h1 className="mt-4 text-5xl">{durationLabel}</h1>
{all.length>0&&<div className="card mt-8 p-6 text-left">{all.slice(0,8).map((m,i)=><div key={i} className="flex items-center justify-between border-b border-dashed border-[var(--rule)] py-2 text-sm last:border-0"><span>{m.title}</span><span className="mono text-[var(--ink-60)]">{new Date(m.date).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</span></div>)}</div>}
<p className="muted mt-8">Every pet deserves a record like this.</p>
<a href="/app/signup" className="btn mt-4 inline-block">Start free on the web</a>
</div></main>}
