import { z } from 'zod'
import { fail, ok } from '@/lib/http'
import { runAi, scanSchema } from '@/lib/ai'

const bodySchema = z.object({ image: z.string().min(100), petName: z.string().optional() })
export async function POST(req: Request) {
  try {
    const { image, petName } = bodySchema.parse(await req.json())
    const result = await runAi({ task: 'scan', schema: scanSchema, image: image.replace(/^data:image\/[^;]+;base64,/, ''), model: 'sonnet', prompt: `Extract vaccination booklet or product-box data. ${petName ? `The pet is ${petName}.` : ''} Use ISO dates where visible. Return entries, petNameGuess and warnings.` })
    if (!result.ok) return fail(result.reason === 'cap' ? 'scan_cap' : 'ai_unavailable', result.reason === 'cap' ? 'You have used your 3 free scans.' : "We couldn't read this page — try more light, or add it manually.", 422)
    return ok({ proposal: result.value })
  } catch { return fail('invalid_request', 'We couldn’t read this page — try more light, or add it manually.', 400) }
}
