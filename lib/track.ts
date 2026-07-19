'use client';
import {track} from '@vercel/analytics';

export function trackToolUsed(tool:string,metadata:Record<string,string>={}){track('tool_used',{tool,...metadata})}
export function trackToolCtaClicked(tool:string,metadata:Record<string,string>={}){track('tool_cta_clicked',{tool,...metadata})}
export function trackToolShared(tool:string,metadata:Record<string,string>={}){track('tool_shared',{tool,...metadata})}
