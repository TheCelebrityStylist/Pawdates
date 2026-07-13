import {redirect} from 'next/navigation';import {Landing} from '@/components/landing';
export default async function Page({searchParams}:{searchParams:Promise<{code?:string}>}){if((await searchParams).code)redirect('/app');return <Landing/>}
