import {z} from 'zod';import {sessionProfile} from '@/lib/access';import {fail,ok} from '@/lib/http';

export async function DELETE(_req:Request,{params}:{params:Promise<{memberId:string}>}){
try{
const session=await sessionProfile();if(!session)return fail('unauthorized','Sign in required',401);
const {memberId}=await params;if(!z.string().uuid().safeParse(memberId).success)return fail('invalid_id','Invalid member');
const {error}=await session.client.from('household_members').update({status:'revoked'}).eq('id',memberId).eq('owner_user_id',session.user.id);
if(error)return fail('save_failed',error.message,400);
return ok({revoked:true})
}catch(e){return fail('invalid_request',e instanceof Error?e.message:'Invalid request',400)}
}
