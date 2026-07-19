// Pings IndexNow with every URL currently in the deployed sitemap.
// Run after a deploy: DEPLOY_URL=https://www.tailtend.com node scripts/indexnow-ping.mjs
// (or against a preview URL to smoke-test the request shape only — IndexNow
// itself will reject/ignore submissions for hosts it hasn't verified).
const base=process.env.DEPLOY_URL;
if(!base){console.error('DEPLOY_URL is required, e.g. DEPLOY_URL=https://www.tailtend.com node scripts/indexnow-ping.mjs');process.exit(2)}

async function fetchText(url){const res=await fetch(url);if(!res.ok)throw new Error(`${url}: ${res.status}`);return res.text()}

const index=await fetchText(`${base}/sitemap.xml`);
const subSitemaps=[...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
const urls=new Set();
for(const sitemap of subSitemaps){
const xml=await fetchText(sitemap);
for(const match of xml.matchAll(/<loc>([^<]+)<\/loc>/g))urls.add(match[1].replace(base,''));
}
if(!urls.size){console.error('No URLs found in sitemap — aborting');process.exit(1)}

const list=[...urls];
const batches=[];
for(let i=0;i<list.length;i+=10000)batches.push(list.slice(i,i+10000));

for(const batch of batches){
const res=await fetch(`${base}/api/indexnow`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({urls:batch})});
const body=await res.json().catch(()=>({}));
if(!res.ok){console.error(`IndexNow submission failed: ${res.status}`,body);process.exitCode=1}
else console.log(`Submitted ${batch.length} URLs — ${JSON.stringify(body)}`);
}
