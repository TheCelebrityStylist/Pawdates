import {ServiceWorker} from '@/components/service-worker';export default function AppLayout({children}:{children:React.ReactNode}){return <>{children}<ServiceWorker/></>}
