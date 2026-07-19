import Link from 'next/link';import {notFound} from 'next/navigation';import {admin} from '@/lib/supabase';
function dueLabel(date:string){const today=new Date();today.setHours(0,0,0,0);const due=new Date(`${date}T00:00:00`);const days=Math.round((due.getTime()-today.getTime())/86400000);if(days<0)return {text:`Overdue by ${Math.abs(days)} day${days===-1?'':'s'}`,overdue:true};if(days===0)return {text:'Due today',overdue:false};if(days===1)return {text:'Due tomorrow',overdue:false};return {text:`Due in ${days} days`,overdue:false}}

export async function generateMetadata(){return {title:'Shared pet record',robots:{index:false,follow:false}}}

export default async function SharePage({params}:{params:Promise<{token:string}>}){
const {token}=await params;
const db=admin();
const {data:pet}=await db.from('pets').select('id,name,species,share_enabled').eq('share_token',token).single();
if(!pet||!pet.share_enabled)notFound();
const {data:treatments}=await db.from('treatments').select('id,name,next_due').eq('pet_id',pet.id).order('next_due');

return <main className="min-h-screen bg-[var(--paper)] px-5 py-16"><div className="mx-auto max-w-2xl">
<p className="mono text-[var(--health)]">Shared record · read-only</p>
<div className="card mt-8 p-6 md:p-10">
<header className="flex flex-wrap items-center gap-6 border-b border-[var(--rule)] pb-8"><span className="tag"><span>{pet.name[0]}</span></span><div><h1 className="text-3xl">{pet.name}&apos;s treatment record</h1><p className="mono mt-2 text-[var(--ink-60)] capitalize">{pet.species}</p></div></header>
{(treatments||[]).length?(treatments||[]).map(t=>{const due=dueLabel(t.next_due);return <div className="ledger-row" key={t.id}><div><b>{t.name}</b><p className="mono mt-1 text-[var(--ink-60)]">Next due {new Date(t.next_due).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</p></div><span className={`chip ${due.overdue?'overdue':'health'}`}>{due.text}</span></div>}):<p className="muted mt-8">No treatments on this record yet.</p>}
</div>
<footer className="card mt-8 p-6 text-center"><p className="muted">Tracked with Tailtend — start your pet&apos;s record.</p><Link className="btn mt-4" href="/app/signup">Start free on the web</Link></footer>
</div></main>}
