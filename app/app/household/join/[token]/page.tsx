import {notFound,redirect} from 'next/navigation';import {z} from 'zod';import {user,admin} from '@/lib/supabase';import {HouseholdJoin} from '@/components/household-join';

const roleLabel:Record<string,string>={carer:'a carer — you can log care and mark treatments done',view:'a viewer — you can see the record, read-only'};

export default async function JoinHouseholdPage({params}:{params:Promise<{token:string}>}){
const {token}=await params;
if(!z.string().uuid().safeParse(token).success)notFound();
const current=await user();
if(!current)redirect(`/app/login?next=/app/household/join/${token}`);
const db=admin();
const {data:invite}=await db.from('household_members').select('role,owner_user_id,status').eq('invite_token',token).maybeSingle();
if(!invite||invite.status!=='pending')notFound();

if(invite.owner_user_id===current.id)return <main className="min-h-screen bg-paper px-5 py-10 text-[#272621] [color-scheme:light]"><div className="mx-auto max-w-[420px] text-center"><h1 className="text-3xl">That&apos;s your own invite.</h1><p className="mt-3 text-sm text-black/60">You can&apos;t join a household you own.</p><a className="btn mt-6 inline-block" href="/app">Back to dashboard</a></div></main>;

const {data:owner}=await db.from('profiles').select('email').eq('user_id',invite.owner_user_id).maybeSingle();
return <main className="min-h-screen bg-paper px-5 py-10 text-[#272621] [color-scheme:light]"><div className="mx-auto max-w-[420px] text-center">
<h1 className="text-3xl">Join {owner?.email||'this'}&apos;s household?</h1>
<p className="mt-3 text-sm text-black/60">You&apos;ll join as {roleLabel[invite.role]||invite.role}.</p>
<HouseholdJoin token={token}/>
</div></main>}
