import {createServerClient} from '@supabase/ssr';import {createClient} from '@supabase/supabase-js';import {cookies} from 'next/headers';import type {CookieOptions} from '@supabase/ssr';
type CookieWrite={name:string;value:string;options:CookieOptions};export async function supabase(){const jar=await cookies();return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{cookies:{getAll:()=>jar.getAll(),setAll(items:CookieWrite[]){try{items.forEach(({name,value,options})=>jar.set(name,value,options))}catch{}}}})}
export async function user(){const s=await supabase();const {data}=await s.auth.getUser();return data.user}
export function admin(){return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}})}
export type Profile={user_id:string;email:string;is_premium:boolean;premium_until:string|null;stripe_customer_id:string|null;reminder_leads:number[];email_reminders_enabled:boolean};
export const isPremium=(p:Pick<Profile,'is_premium'|'premium_until'>)=>p.is_premium&&!!p.premium_until&&new Date(p.premium_until)>new Date();
