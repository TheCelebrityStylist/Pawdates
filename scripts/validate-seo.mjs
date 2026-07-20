import fs from 'node:fs';import path from 'node:path';
const root=path.join(process.cwd(),'.next/server/app');const read=file=>fs.readFileSync(file,'utf8');const text=html=>html.replace(/<script[\s\S]*?<\/script>/g,' ').replace(/<style[\s\S]*?<\/style>/g,' ').replace(/<[^>]+>/g,' ').replace(/&[^;]+;/g,' ').replace(/\s+/g,' ').trim();const count=(html,needle)=>(html.match(new RegExp(needle,'g'))||[]).length;const failures=[];
const listDir=(dir,pathPrefix)=>fs.readdirSync(path.join(root,dir)).filter(name=>name.endsWith('.html')&&name!=='index.html').map(name=>({path:`${pathPrefix}/${name.slice(0,-5)}`,file:path.join(root,dir,name)}));

const english=listDir('schedules','/schedules');const dutch=listDir('nl/schema','/nl/schema');const guides=listDir('guides','/guides');const compare=listDir('compare','/compare');const dutchBlog=listDir('nl/blog','/nl/blog');
if(english.length!==24)failures.push(`Expected 24 English schedules, found ${english.length}`);if(dutch.length!==6)failures.push(`Expected 6 Dutch schedules, found ${dutch.length}`);if(guides.length!==3)failures.push(`Expected 3 life-stage guides, found ${guides.length}`);if(compare.length!==2)failures.push(`Expected 2 comparison pages, found ${compare.length}`);if(dutchBlog.length!==5)failures.push(`Expected 5 Dutch blog posts, found ${dutchBlog.length}`);

for(const page of [...english,...dutch,...guides,...compare,...dutchBlog]){const html=read(page.file);const words=text(html).split(/\s+/).length;const rows=count(html,'<tr');const faqs=count(html,'<details');const jsonLd=count(html,'<script type="application/ld\\+json"');const hrefs=[...html.matchAll(/href="([^"]+)"/g)].map(match=>match[1]);
if(words<350)failures.push(`${page.path}: ${words} visible words`);
if(rows<5)failures.push(`${page.path}: fewer than 4 table rows`);
if(faqs<3)failures.push(`${page.path}: fewer than 3 FAQs`);
if(jsonLd!==1)failures.push(`${page.path}: expected one connected JSON-LD graph, found ${jsonLd}`);
if(!html.includes(`rel="canonical" href="https://www.tailtend.com${page.path}"`))failures.push(`${page.path}: self-canonical missing`);
if(page.path.startsWith('/schedules/')&&(hrefs.filter(h=>h.startsWith('/blog/')).length<2||hrefs.filter(h=>h.startsWith('/schedules/')).length<2||hrefs.filter(h=>h.includes('#pricing')).length!==1))failures.push(`${page.path}: internal-link gate failed`);
if(page.path.startsWith('/guides/')&&(hrefs.filter(h=>h.startsWith('/blog/')).length<2||hrefs.filter(h=>h.startsWith('/guides/')).length<2||hrefs.filter(h=>h==='/app').length<1))failures.push(`${page.path}: internal-link gate failed`);
if(page.path.startsWith('/compare/')&&(hrefs.filter(h=>h.startsWith('/compare/')).length<1||hrefs.filter(h=>h==='/app').length<1))failures.push(`${page.path}: internal-link gate failed`);
if(page.path.startsWith('/nl/blog/')&&(hrefs.filter(h=>h.startsWith('/nl/')).length<2||hrefs.filter(h=>h==='/app').length<1))failures.push(`${page.path}: internal-link gate failed`);
if(page.path.startsWith('/nl/')&&(!html.includes('hrefLang="en"')||!html.includes('hrefLang="nl"')||!html.includes('hrefLang="x-default"')))failures.push(`${page.path}: hreflang set incomplete`)}

const blogDir=path.join(root,'blog');const blogs=fs.readdirSync(blogDir).filter(name=>name.endsWith('.html')).map(name=>({path:`/blog/${name.slice(0,-5)}`,file:path.join(blogDir,name)}));
// Tool pages are dynamic (they read searchParams) and emit no static .html
// file, so they can only be link *targets* here, not readable sources.
const toolSlugs=['pet-age-calculator','vaccination-schedule-generator','flea-worming-cost-calculator','is-my-pet-treatment-overdue'];
const toolPaths=toolSlugs.map(slug=>`/tools/${slug}`);
const aboutPages=[{path:'/about',file:path.join(root,'about.html')},{path:'/about/veterinary-reviewer',file:path.join(root,'about','veterinary-reviewer.html')}];
const content=[...english,...dutch,...guides,...compare,...dutchBlog,...blogs];
const allHtml=[read(path.join(root,'schedules.html')),read(path.join(root,'blog.html')),read(path.join(root,'nl.html')),read(path.join(root,'nl','blog.html')),read(path.join(root,'guides.html')),read(path.join(root,'compare.html')),read(path.join(root,'tools.html')),...content.map(page=>read(page.file)),...aboutPages.map(page=>read(page.file))].join('\n');
for(const page of [...content,...aboutPages]){const escaped=page.path.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const inlinks=count(allHtml,`href="${escaped}"`);if(inlinks<2)failures.push(`${page.path}: only ${inlinks} internal inlink(s)`)}
for(const toolPath of toolPaths){const escaped=toolPath.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const inlinks=count(allHtml,`href="${escaped}"`);if(inlinks<2)failures.push(`${toolPath}: only ${inlinks} internal inlink(s)`)}

if(failures.length){console.error(failures.join('\n'));process.exit(1)}
console.log(`SEO gate passed: ${english.length} EN schedules, ${dutch.length} NL schedules, ${guides.length} guides, ${compare.length} comparisons, ${dutchBlog.length} NL blog posts, ${content.length} content pages; no gated orphans.`);
