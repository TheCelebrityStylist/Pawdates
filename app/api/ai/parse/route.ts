import { z } from 'zod'
import { fail, ok } from '@/lib/http'
import { runAi, parseSchema } from '@/lib/ai'

export async function POST(req: Request) {
  try {
    const body = z.object({ text: z.string().min(2), pets: z.array(z.string()), treatments: z.array(z.string()) }).parse(await req.json())
    const result = await runAi({ task: 'parse', schema: parseSchema, prompt: `Parse this plain-language log into actions. Only match these pets: ${body.pets.join(', ')}. Only match these treatments: ${body.treatments.join(', ')}. Unknown or ambiguous names must set needs_clarification:true. Text: ${body.text}` })
    if (!result.ok) return fail(result.reason === 'cap' ? 'parse_cap' : 'ai_unavailable', 'Quick log is unavailable right now — use Mark done manually.', 422)
    return ok({ proposal: result.value })
  } catch { return fail('invalid_request', 'Please describe the treatment in a little more detail.', 400) }
}
