import Link from 'next/link';import {notFound} from 'next/navigation';import {postNl,postsNl} from '@/content/blog-nl';import {dutchSchedule} from '@/content/schedules-nl';import {baseGraph,buildMetadata,canonicalHost,graphJson} from '@/lib/seo';

export function generateStaticParams(){return postsNl.map(item=>({slug:item.slug}))}

export async function generateMetadata({params}:{params:Promise<{slug:string}>}){
const item=postNl((await params).slug);if(!item)return {};
const path=`/nl/blog/${item.slug}`;
return {...buildMetadata({title:item.title,description:item.intro,path}),alternates:{canonical:`${canonicalHost}${path}`,languages:item.hreflangEn?{en:`${canonicalHost}${item.hreflangEn}`,nl:`${canonicalHost}${path}`,'x-default':`${canonicalHost}${item.hreflangEn}`}:{nl:`${canonicalHost}${path}`}}}}

export default async function BlogPostNlPage({params}:{params:Promise<{slug:string}>}){
const item=postNl((await params).slug);if(!item)notFound();
const path=`/nl/blog/${item.slug}`;
const graph=[...baseGraph(path),{'@type':'BreadcrumbList','@id':`${canonicalHost}${path}#breadcrumbs`,itemListElement:[{'@type':'ListItem',position:1,name:'Nederlands',item:`${canonicalHost}/nl`},{'@type':'ListItem',position:2,name:item.title,item:`${canonicalHost}${path}`}]},{'@type':'FAQPage','@id':`${canonicalHost}${path}#faq`,mainEntity:item.faq.map(f=>({'@type':'Question',name:f.q,acceptedAnswer:{'@type':'Answer',text:f.a}}))}];

return <main className="min-h-screen bg-[var(--paper)]"><article className="mx-auto max-w-3xl px-5 py-20"><nav className="mono"><Link href="/nl">Nederlands</Link></nav><h1 className="mt-10 text-5xl">{item.title}</h1><p className="muted mt-5 text-xl">{item.intro}</p><p className="mono mt-5">Laatst bijgewerkt {item.updated}</p>

<div className="card mt-10 overflow-auto"><table className="w-full text-left"><thead><tr><th className="p-4">Moment</th><th className="p-4">Interval</th><th className="p-4">Wat</th></tr></thead><tbody>{item.rows.map(row=><tr className="border-t border-[var(--rule)]" key={row.when}><td className="p-4">{row.when}</td><td className="p-4 text-[var(--health)]">{row.interval}</td><td className="p-4">{row.wat}</td></tr>)}</tbody></table></div>

{item.sections.map(s=><section className="mt-12" key={s.title}><h2 className="text-3xl">{s.title}</h2>{s.text.split('\n\n').map(text=><p className="muted mt-4" key={text.slice(0,24)}>{text}</p>)}</section>)}

<section className="mt-12"><h2 className="text-3xl">Veelgestelde vragen</h2>{item.faq.map(f=><details className="border-b border-[var(--rule)] py-5" key={f.q}><summary>{f.q}</summary><p className="muted mt-3">{f.a}</p></details>)}</section>

<section className="mt-12"><h2>Gerelateerd</h2>{item.related.map(slug=>{const schema=dutchSchedule(slug);const blog=postNl(slug);if(schema)return <Link className="mt-3 block underline" href={`/nl/schema/${slug}`} key={slug}>{schema.title}</Link>;if(blog)return <Link className="mt-3 block underline" href={`/nl/blog/${slug}`} key={slug}>{blog.title}</Link>;return null})}</section>

<aside className="card mt-12 p-7"><h2 className="text-2xl">Laat Tailtend het onthouden.</h2><p className="muted mt-2">Voer het schema één keer in — Tailtend herinnert je op het juiste moment.</p><Link className="btn mt-5" href="/app">Gratis starten</Link></aside>
</article><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(graphJson(graph))}}/></main>}
