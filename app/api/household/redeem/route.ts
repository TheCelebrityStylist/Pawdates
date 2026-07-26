import {z} from 'zod';import {sessionProfile} from '@/lib/access';import {fail,ok} from '@/lib/http';

const schema=z.object({token:z.string().uuid()});

export async function POST(req:Request){
try{
const session=await sessionProfile();if(!session)return fail('unauthorized','Sign in required',401);
const body=schema.parse(await req.json());
const {error}=await session.client.rpc('redeem_household_invite',{p_token:body.token});
if(error)return fail('invalid_request',error.message,400);
return ok({joined:true})
}catch(e){return fail('invalid_request',e instanceof Error?e.message:'Invalid request',400)}
}
