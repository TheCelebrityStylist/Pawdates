import {z} from 'zod';import {sessionProfile} from '@/lib/access';import {fail,ok} from '@/lib/http';import {observationSchema} from '@/lib/care-profile';

export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
try{
const session=await sessionProfile();if(!session)return fail('unauthorized','Sign in required',401);
const {id}=await params;if(!z.string().uuid().safeParse(id).success)return fail('invalid_id','Invalid pet');
const {data,error}=await session.client.from('observation_log').select('id,tag,note,created_at').eq('pet_id',id).order('created_at',{ascending:false}).limit(20);
if(error)return fail('read_failed',error.message,400);
return ok({observations:data||[]})
}catch(e){return fail('invalid_request',e instanceof Error?e.message:'Invalid request',400)}
}

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
try{
const session=await sessionProfile();if(!session)return fail('unauthorized','Sign in required',401);
const {id}=await params;if(!z.string().uuid().safeParse(id).success)return fail('invalid_id','Invalid pet');
const {data:pet}=await session.client.from('pets').select('id').eq('id',id).maybeSingle();
if(!pet)return fail('not_found','Pet not found',404);
const body=observationSchema.parse(await req.json());
const {data,error}=await session.client.from('observation_log').insert({pet_id:id,user_id:session.user.id,tag:body.tag,note:body.note||null}).select('id,tag,note,created_at').single();
if(error)return fail('save_failed',error.message,400);
return ok({observation:data})
}catch(e){return fail('invalid_request',e instanceof Error?e.message:'Invalid request',400)}
}
