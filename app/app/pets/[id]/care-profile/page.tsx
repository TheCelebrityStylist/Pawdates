import {notFound,redirect} from 'next/navigation';import {sessionProfile} from '@/lib/access';import {CareProfileEditor} from '@/components/care-profile-editor';

export default async function CareProfilePage({params}:{params:Promise<{id:string}>}){
const {id}=await params;
const session=await sessionProfile();if(!session)redirect(`/app/login?next=/app/pets/${id}/care-profile`);
const {data:pet}=await session.client.from('pets').select('id,name,species').eq('id',id).maybeSingle();
if(!pet)notFound();
const [{data:profile},{data:items},{data:checksToday}]=await Promise.all([
session.client.from('pet_profile').select('*').eq('pet_id',id).maybeSingle(),
session.client.from('routine_items').select('*').eq('pet_id',id).order('sort_order').order('time'),
session.client.from('routine_checks').select('routine_item_id,checked_by,checked_at').eq('pet_id',id).eq('checked_for_date',new Date().toISOString().slice(0,10))
]);
const checkedToday=(checksToday||[]).map(c=>{const item=(items||[]).find(i=>i.id===c.routine_item_id);return {label:item?.label||'Routine item',checkedBy:c.checked_by,checkedAt:c.checked_at}});
return <main className="min-h-screen bg-paper px-5 py-10 text-[#272621] [color-scheme:light]"><div className="mx-auto max-w-[640px]"><a className="text-clay" href="/app/settings">← Settings</a><h1 className="mt-8 text-3xl">{pet.name}&apos;s care profile</h1><p className="mt-2 text-sm text-black/60">The everyday handover a sitter actually needs. Every field is optional — only what you fill in shows on the shared view.</p>
{checkedToday.length>0&&<section className="mt-6 rounded-2xl border border-black/10 bg-white p-5"><h2 className="font-medium">Checked off today</h2>{checkedToday.map((c,i)=><p key={i} className="mt-2 text-sm text-black/60">{c.label} — done by <b>{c.checkedBy}</b> at {new Date(c.checkedAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</p>)}</section>}
<CareProfileEditor petId={pet.id} initialProfile={profile} initialItems={items||[]}/></div></main>}
