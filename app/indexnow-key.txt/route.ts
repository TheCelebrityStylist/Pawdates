export function GET(){const key=process.env.INDEXNOW_KEY||'';return new Response(key,{status:key?200:404,headers:{'content-type':'text/plain','cache-control':'no-store'}})}
