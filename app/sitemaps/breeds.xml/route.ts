import {breeds,topicSlug,breedUpdated,type BreedTopicKey} from '@/content/breeds';import {xml,url} from '@/lib/sitemap';
const KEYS:BreedTopicKey[]=['flea','worming','grooming'];
export function GET(){const paths=['/breeds',...breeds.flatMap(b=>[`/breeds/${b.slug}`,...KEYS.map(k=>`/breeds/${topicSlug(b.slug,k)}`)])];return xml(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(p=>url(p,breedUpdated)).join('')}</urlset>`)}
