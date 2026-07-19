import {canonicalHost} from './seo';

export type Reviewer={name:string;qualification:string;bio:string};
export type Founder={name:string;role:string;bio:string};

// TODO(Elke): set the real veterinary reviewer's name, qualification (e.g.
// "DVM", "MRCVS") and a short bio. Until this is filled in, pages
// intentionally omit any "medically reviewed by" claim rather than publish
// a placeholder name — a false review claim is worse than no claim.
export const veterinaryReviewer:Reviewer|null=null;

// TODO(Elke): set your name/role/bio here for the About page's Person
// schema. Left unset for the same reason as the reviewer above.
export const founder:Founder|null=null;

export function reviewerNode(){
  if(!veterinaryReviewer)return null;
  return {'@type':'Person','@id':`${canonicalHost}/about/veterinary-reviewer#person`,name:veterinaryReviewer.name,jobTitle:veterinaryReviewer.qualification,url:`${canonicalHost}/about/veterinary-reviewer`};
}

export function founderNode(){
  if(!founder)return null;
  return {'@type':'Person','@id':`${canonicalHost}/about#founder`,name:founder.name,jobTitle:founder.role,url:`${canonicalHost}/about`};
}

export type Citation={label:string;url:string};
const wsava:Citation={label:'WSAVA Vaccination Guidelines for Dogs and Cats',url:'https://wsava.org/global-guidelines/vaccination-guidelines/'};
const esccap:Citation={label:'ESCCAP Guidelines — Parasite Control in Dogs and Cats',url:'https://www.esccap.org/guidelines/'};
const aahaSenior:Citation={label:'AAHA Senior Care Guidelines for Dogs and Cats',url:'https://www.aaha.org/senior-care'};
const aahaDental:Citation={label:'AAHA Dental Care Guidelines for Dogs and Cats',url:'https://www.aaha.org/resources/2019-aaha-dental-care-guidelines-for-dogs-and-cats/overview/'};
const aahaGeneral:Citation={label:'AAHA Guidelines Library',url:'https://www.aaha.org/for-veterinary-professionals/aaha-guidelines/'};

export function citationsFor(...tags:string[]):Citation[]{
  const t=tags.join(' ').toLowerCase();const list:Citation[]=[];
  if(/vaccin|rabies|booster|kennel cough/.test(t))list.push(wsava);
  if(/worm|flea|tick|heartworm|parasite/.test(t))list.push(esccap);
  if(/dental/.test(t))list.push(aahaDental);
  if(/senior|check.?up/.test(t))list.push(aahaSenior);
  if(!list.length)list.push(aahaGeneral);
  return list;
}
