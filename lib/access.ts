import {supabase,user,type Profile} from './supabase';import {isPremium} from './premium';
export async function sessionProfile(){const current=await user();if(!current)return null;const client=await supabase();const {data}=await client.from('profiles').select('*').eq('user_id',current.id).single();return {user:current,client,profile:data as Profile|null,premium:isPremium(data)}}
