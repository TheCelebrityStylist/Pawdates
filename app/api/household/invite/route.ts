import {z} from 'zod';import {sessionProfile} from '@/lib/access';import {fail,ok} from '@/lib/http';

const schema=z.object({role:z.enum(['carer','view']),email:z.string().email().max(200).optional()});

export async function POST(req:Request){
try{
const session=await sessionProfile();if(!session)return fail('unauthorized','Sign in required',401);
if(!session.premium)return fail('premium_required','Premium is required to add a carer or family member',402);
const body=schema.parse(await req.json());
const {data,error}=await session.client.from('household_members').insert({owner_user_id:session.user.id,role:body.role,invited_email:body.email||null}).select('id,invite_token,role,invited_email,status,created_at').single();
if(error)return fail('save_failed',error.message,400);
return ok({member:data},201)
}catch(e){return fail('invalid_request',e instanceof Error?e.message:'Invalid request',400)}
}
