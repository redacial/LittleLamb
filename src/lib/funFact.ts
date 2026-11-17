// The nanny fun-fact one-liner families read on the card and profile. A nanny picks a prompt
// (FUN_FACT_PROMPTS) and writes a short answer; the displayed line prepends the prompt's lead,
// e.g. prompt "superpower" + answer "turning broccoli into a treat" →
// "My superpower is turning broccoli into a treat".
//
// Graceful across the mixed data in the wild: legacy nannies have a free-text funFact and no
// prompt; a nanny may pick a prompt but leave the answer blank; a stored prompt id may be
// unknown. In every case this returns something sensible (the raw answer, or empty).
import { FUN_FACT_PROMPTS } from './nannyProfileOptions'

export function composeFunFact(promptId: string | undefined, answer: string | undefined): string {
  const text = (answer ?? '').trim()
  if (!text) return ''
  const prompt = promptId ? FUN_FACT_PROMPTS.find((p) => p.id === promptId) : undefined
  return prompt ? `${prompt.lead} ${text}` : text
}
