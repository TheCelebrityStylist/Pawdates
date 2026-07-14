/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { z } from 'zod'
import { admin, user } from '@/lib/supabase'

const responseShape = z.object({ output: z.string().min(1) })
const counters = new Map<string, { day: string; count: number }>()

export type AiTask = 'scan' | 'parse' | 'assistant'
const limits: Record<AiTask, number> = { scan: 3, parse: 50, assistant: 20 }

function allowed(task: AiTask, id: string) {
  const day = new Date().toISOString().slice(0, 10)
  const key = `${task}:${id}`
  const current = counters.get(key)
  if (!current || current.day !== day) counters.set(key, { day, count: 1 })
  else if (current.count >= limits[task]) return false
  else current.count++
  return true
}

export async function runAi<T>(args: { task: AiTask; schema: z.ZodType<T>; prompt: string; image?: string; model?: 'haiku' | 'sonnet' }) {
  const sessionUser = await user()
  if (!sessionUser || !allowed(args.task, sessionUser.id)) return { ok: false as const, reason: 'cap' as const }
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) { console.error('[ai] ANTHROPIC_API_KEY unavailable'); return { ok: false as const, reason: 'unavailable' as const } }
  const content: any[] = [{ type: 'text', text: `${args.prompt}\nReturn ONLY valid JSON. No markdown.` }]
  if (args.image) content.unshift({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: args.image } })
  const model = args.model === 'sonnet' ? 'claude-sonnet-4-20250514' : 'claude-3-5-haiku-latest'
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model, max_tokens: 1200, temperature: 0, system: 'You are a careful data extraction assistant. Never invent facts. If uncertain, flag it.', messages: [{ role: 'user', content }] }) })
    const raw = await res.json(); const text = raw?.content?.find((x: any) => x.type === 'text')?.text || ''
    const parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ''))
    const value = args.schema.parse(parsed)
    try { await admin().from('app_events').insert({ user_id: sessionUser.id, name: 'ai_usage', metadata: { task: args.task, model, input_tokens: raw.usage?.input_tokens ?? 0, output_tokens: raw.usage?.output_tokens ?? 0 } }) } catch (e) { console.error('[ai] usage logging failed', e) }
    return { ok: true as const, value }
  } catch (error) { console.error('[ai] request failed', error); return { ok: false as const, reason: 'invalid' as const } }
}

export const scanSchema = z.object({ entries: z.array(z.object({ type: z.string(), name: z.string(), product: z.string().optional(), dateGiven: z.string().optional(), nextDue: z.string().optional(), confidence: z.enum(['high', 'medium', 'low']) })), petNameGuess: z.string().optional(), warnings: z.array(z.string()) })
export const parseSchema = z.object({ actions: z.array(z.object({ pet: z.string(), treatment: z.string(), date: z.string(), needs_clarification: z.boolean().optional() })) })
