'use client';
import {track} from '@vercel/analytics';

export function trackToolUsed(tool:string,metadata:Record<string,string>={}){track('tool_used',{tool,...metadata})}
export function trackToolCtaClicked(tool:string,metadata:Record<string,string>={}){track('tool_cta_clicked',{tool,...metadata})}
export function trackToolShared(tool:string,metadata:Record<string,string>={}){track('tool_shared',{tool,...metadata})}
export function trackSitterViewOpened(metadata:Record<string,string>={}){track('sitter_view_opened',metadata)}
export function trackSitterCheckedItem(metadata:Record<string,string>={}){track('sitter_checked_item',metadata)}
export function trackHandoverDownloaded(metadata:Record<string,string>={}){track('handover_downloaded',metadata)}
