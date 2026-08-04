import {z} from 'zod';import {admin} from '@/lib/supabase';import {fail,ok} from '@/lib/http';import {linkStatus,type ShareLink} from '@/lib/share-links';

const schema=z.object({routineItemId:z.string().uuid(),checkedBy:z.string().trim().min(1).max(60)});

// Resolve the pet a sitter is allowed to check off against, from either the
// legacy per-pet share_token or a new scoped share_links token. Only the
// sitter/full scopes expose the routine, so a medical-only link can never
// write a check-off. Returns the pet id, or null if the token grants nothing.
async function resolvePet(db:ReturnType<typeof admin>,token:string){
  const legacy=await db.from('pets').select('id').eq('share_token',token).eq('share_enabled',true).maybeSingle();
  if(legacy.data)return legacy.data.id as string;
  const {data:link}=await db.from('share_links').select('*').eq('token',token).maybeSingle();
  if(!link)return null;
  const l=link as ShareLink;
  if(l.scope!=='sitter'&&l.scope!=='full')return null;
  if(linkStatus(l)!=='active')return null;
  return l.pet_id;
}

export async function POST(req:Request,{params}:{params:Promise<{token:string}>}){
try{
const {token}=await params;if(!z.string().uuid().safeParse(token).success)return fail('invalid_token','Invalid link',400);
const body=schema.parse(await req.json());
const db=admin();
const petId=await resolvePet(db,token);
if(!petId)return fail('not_found','Shared record not found',404);
const {data:profile}=await db.from('pet_profile').select('live_checkoff_enabled').eq('pet_id',petId).maybeSingle();
if(!profile?.live_checkoff_enabled)return fail('checkoff_disabled','Live check-off is not enabled for this record',403);
const {data:item}=await db.from('routine_items').select('id,pet_id,sitter_can_check').eq('id',body.routineItemId).maybeSingle();
if(!item||item.pet_id!==petId||!item.sitter_can_check)return fail('not_found','Routine item not found',404);
const {data,error}=await db.from('routine_checks').upsert({routine_item_id:body.routineItemId,pet_id:petId,checked_by:body.checkedBy,checked_at:new Date().toISOString(),checked_for_date:new Date().toISOString().slice(0,10)},{onConflict:'routine_item_id,checked_for_date'}).select().single();
if(error)return fail('save_failed',error.message,400);
return ok({check:data})
}catch(e){return fail('invalid_request',e instanceof Error?e.message:'Invalid request',400)}
}
