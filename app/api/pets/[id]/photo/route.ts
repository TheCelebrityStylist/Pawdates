import {z} from 'zod';import {sessionProfile} from '@/lib/access';import {fail,ok} from '@/lib/http';

const allowedTypes=new Set(['image/jpeg','image/png','image/webp']);
const maxBytes=5*1024*1024;

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
try{
const session=await sessionProfile();if(!session)return fail('unauthorized','Sign in required',401);
const {id}=await params;if(!z.string().uuid().safeParse(id).success)return fail('invalid_id','Invalid pet');
const {data:pet}=await session.client.from('pets').select('id').eq('id',id).maybeSingle();
if(!pet)return fail('not_found','Pet not found',404);

const form=await req.formData();
const file=form.get('photo');
if(!(file instanceof File))return fail('invalid_request','No photo provided',400);
if(!allowedTypes.has(file.type))return fail('invalid_type','Photo must be JPEG, PNG or WebP',400);
if(file.size>maxBytes)return fail('too_large','Photo must be under 5MB',400);

const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';
const path=`${session.user.id}/${id}-${Date.now()}.${ext}`;
const bytes=new Uint8Array(await file.arrayBuffer());
const {error:uploadError}=await session.client.storage.from('pet-photos').upload(path,bytes,{contentType:file.type,upsert:false});
if(uploadError)return fail('upload_failed',uploadError.message,400);

const {error:saveError}=await session.client.from('pets').update({photo_path:path}).eq('id',id);
if(saveError)return fail('save_failed',saveError.message,400);

const {data:{publicUrl}}=session.client.storage.from('pet-photos').getPublicUrl(path);
return ok({photoPath:path,photoUrl:publicUrl})
}catch(e){return fail('invalid_request',e instanceof Error?e.message:'Invalid request',400)}
}
