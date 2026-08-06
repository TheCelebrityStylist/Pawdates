import {pillars} from '@/content/pillars';import {xml,url} from '@/lib/sitemap';
export function GET(){const paths=['/learn',...pillars.map(p=>`/learn/${p.slug}`)];return xml(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((p,i)=>url(p,pillars[Math.max(0,i-1)]?.updated)).join('')}</urlset>`)}
