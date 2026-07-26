import {sessionProfile} from '@/lib/access';import {fail,ok} from '@/lib/http';

export async function GET(){
try{
const session=await sessionProfile();if(!session)return fail('unauthorized','Sign in required',401);
const {data,error}=await session.client.from('household_members').select('id,invite_token,invited_email,role,status,created_at,redeemed_at').eq('owner_user_id',session.user.id).order('created_at',{ascending:false});
if(error)return fail('read_failed',error.message,400);
return ok({members:data||[]})
}catch(e){return fail('invalid_request',e instanceof Error?e.message:'Invalid request',400)}
}
