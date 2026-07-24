import {notFound,redirect} from 'next/navigation';import {sessionProfile} from '@/lib/access';import {WeightTrend} from '@/components/weight-trend';import {PremiumGate} from '@/components/premium-gate';

export default async function WeightTrendPage({params}:{params:Promise<{id:string}>}){
const {id}=await params;
const session=await sessionProfile();if(!session)redirect(`/app/login?next=/app/pets/${id}/weight`);
const {data:pet}=await session.client.from('pets').select('id,name').eq('id',id).maybeSingle();
if(!pet)notFound();
const points=session.premium?(await session.client.from('weight_log').select('recorded_at,weight_kg').eq('pet_id',id).order('recorded_at')).data||[]:[];
return <main className="min-h-screen bg-paper px-5 py-10 text-[#272621] [color-scheme:light]"><div className="mx-auto max-w-[480px]"><a className="text-clay" href="/app">← Dashboard</a><h1 className="mt-8 text-3xl">{pet.name}&apos;s weight trend</h1>{session.premium?<WeightTrend petName={pet.name} points={points}/>:<PremiumGate trigger="weight_trend" petName={pet.name} description={`See ${pet.name}'s weight history charted over time, not just the latest number.`}/>}</div></main>}
