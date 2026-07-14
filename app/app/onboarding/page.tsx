import {redirect} from 'next/navigation';import {user} from '@/lib/supabase';import {Onboarding} from '@/components/onboarding';
export default async function Page(){if(!await user())redirect('/app/login');return <Onboarding/>}
