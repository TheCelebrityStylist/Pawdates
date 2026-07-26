import {z} from 'zod';import {sessionProfile} from '@/lib/access';import {fail,ok} from '@/lib/http';import {ownerOfPet} from '@/lib/household';

const allowedTypes=new Set(['image/jpeg','image/png','image/webp']);
const maxBytes=5*1024*1024;
const fieldsSchema=z.object({title:z.string().trim().min(1).max(120),note:z.string().max(500).optional(),occurredOn:z.string().date()});

export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
try{
const session=await sessionProfile();if(!session)return fail('unauthorized','Sign in required',401);
const {id}=await params;if(!z.string().uuid().safeParse(id).success)return fail('invalid_id','Invalid pet');
const {data,error}=await session.client.from('milestones').select('id,title,note,photo_path,occurred_on,created_at').eq('pet_id',id).order('occurred_on',{ascending:false});
if(error)return fail('read_failed',error.message,400);
const withUrls=(data||[]).map(m=>({...m,photoUrl:m.photo_path?session.client.storage.from('pet-photos').getPublicUrl(m.photo_path).data.publicUrl:null}));
return ok({milestones:withUrls})
}catch(e){return fail('invalid_request',e instanceof Error?e.message:'Invalid request',400)}
}

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
try{
const session=await sessionProfile();if(!session)return fail('unauthorized','Sign in required',401);
const {id}=await params;if(!z.string().uuid().safeParse(id).success)return fail('invalid_id','Invalid pet');
const ownerId=await ownerOfPet(session.client,id);if(!ownerId)return fail('not_found','Pet not found',404);

const form=await req.formData();
const body=fieldsSchema.parse({title:form.get('title'),note:form.get('note')||undefined,occurredOn:form.get('occurredOn')});
const file=form.get('photo');

let photoPath:string|undefined;
if(file instanceof File&&file.size>0){
if(!allowedTypes.has(file.type))return fail('invalid_type','Photo must be JPEG, PNG or WebP',400);
if(file.size>maxBytes)return fail('too_large','Photo must be under 5MB',400);
const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';
photoPath=`${ownerId}/milestone-${id}-${Date.now()}.${ext}`;
const bytes=new Uint8Array(await file.arrayBuffer());
const {error:uploadError}=await session.client.storage.from('pet-photos').upload(photoPath,bytes,{contentType:file.type,upsert:false});
if(uploadError)return fail('upload_failed',uploadError.message,400);
}

const {data,error}=await session.client.from('milestones').insert({pet_id:id,user_id:ownerId,actor_user_id:session.user.id,title:body.title,note:body.note||null,occurred_on:body.occurredOn,photo_path:photoPath||null}).select('id,title,note,photo_path,occurred_on,created_at').single();
if(error)return fail('save_failed',error.message,400);
const photoUrl=data.photo_path?session.client.storage.from('pet-photos').getPublicUrl(data.photo_path).data.publicUrl:null;
return ok({milestone:{...data,photoUrl}},201)
}catch(e){return fail('invalid_request',e instanceof Error?e.message:'Invalid request',400)}
}
