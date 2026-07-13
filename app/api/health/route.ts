import {admin} from '@/lib/supabase';import {adminEnv,envHealth} from '@/lib/env';
export const dynamic='force-dynamic';
export async function GET(){const config=envHealth();let database=false;if(adminEnv()){try{const {error}=await admin().from('profiles').select('user_id',{head:true,count:'exact'}).limit(1);database=!error;if(error)console.error('[health] Database ping failed',error.message)}catch(error){console.error('[health] Database ping failed',error)}}return Response.json({...config,database},{headers:{'cache-control':'no-store'}})}
