import {AuthForm} from '@/components/auth-form';import {supabase} from '@/lib/supabase';
export default async function Reset({searchParams}:{searchParams:Promise<{code?:string}>}){const {code}=await searchParams;if(code)await (await supabase()).auth.exchangeCodeForSession(code);return <AuthForm mode="reset"/>}
