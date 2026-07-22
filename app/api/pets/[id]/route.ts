import {z} from 'zod';import {sessionProfile} from '@/lib/access';import {fail,ok} from '@/lib/http';

const schema=z.object({birthDate:z.string().date().optional(),weightKg:z.number().positive().max(500).optional(),logWeight:z.boolean().optional()});

export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
try{
const session=await sessionProfile();if(!session)return fail('unauthorized','Sign in required',401);
const {id}=await params;if(!z.string().uuid().safeParse(id).success)return fail('invalid_id','Invalid pet');
const body=schema.parse(await req.json());
const patch:Record<string,unknown>={};
if(body.birthDate!==undefined)patch.birth_date=body.birthDate;
if(body.weightKg!==undefined)patch.weight_kg=body.weightKg;
if(Object.keys(patch).length){const {error}=await session.client.from('pets').update(patch).eq('id',id);if(error)return fail('save_failed',error.message,400)}
if(body.logWeight&&body.weightKg!==undefined){const {error}=await session.client.from('weight_log').upsert({pet_id:id,user_id:session.user.id,recorded_at:new Date().toISOString().slice(0,10),weight_kg:body.weightKg},{onConflict:'pet_id,recorded_at'});if(error)return fail('save_failed',error.message,400)}
return ok({updated:true})
}catch(e){return fail('invalid_request',e instanceof Error?e.message:'Invalid request',400)}
}
