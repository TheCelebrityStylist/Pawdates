'use client';
const KEY='tailtend-prefill';
export type Prefill={name?:string;species?:string;type?:string;date?:string};

export function writePrefill(data:Prefill){try{localStorage.setItem(KEY,JSON.stringify(data))}catch{}}
export function readPrefill():Prefill|null{try{const raw=localStorage.getItem(KEY);return raw?JSON.parse(raw):null}catch{return null}}
export function clearPrefill(){try{localStorage.removeItem(KEY)}catch{}}
