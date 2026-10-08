// B6.6: واجهة مزوّد النموذج — واحدة لكل النظام. المزوّد والمفتاح من متغيرات البيئة؛ من غير مفتاح مفيش مزوّد (والمساعد «مش متاح»).
// الاختبارات بتحط مزوّد وهمي على الخدمة — مفيش نداء حقيقي بيطلع منها.

export interface LlmToolDef { name: string; description: string; inputSchema: Record<string, unknown> }
export interface LlmToolCall { id: string; name: string; input: Record<string, unknown> }
/** دور في الحوار: سؤال المستخدم، رد النموذج (بنداءات أدواته)، أو نتيجة أداة */
export type LlmMessage =
  | { role: 'user'; text: string }
  | { role: 'assistant'; text: string; toolCalls: LlmToolCall[] }
  | { role: 'tool'; toolCallId: string; name: string; result: string }
export interface LlmTurn { text: string; toolCalls: LlmToolCall[] }
export interface LlmProvider {
  readonly name: string
  readonly model: string
  turn(input: { system: string; messages: LlmMessage[]; tools: LlmToolDef[] }): Promise<LlmTurn>
}

export const AI_PROVIDERS = ['anthropic'] as const
export const AI_DEFAULT_MODEL = 'claude-sonnet-5-5'
export const AI_PROVIDER_TIMEOUT_MS = 30_000
export const AI_MAX_OUTPUT_TOKENS = 1024

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
/** إعداد المزوّد من البيئة — null لو ناقص (مفيش مساعد) */
export function llmConfig(env: Record<string, unknown> = process.env): { provider: (typeof AI_PROVIDERS)[number]; apiKey: string; model: string } | null {
  const provider = text(env.AI_PROVIDER).toLowerCase(), apiKey = text(env.AI_API_KEY)
  if (!apiKey || !(AI_PROVIDERS as readonly string[]).includes(provider)) return null
  return { provider: provider as (typeof AI_PROVIDERS)[number], apiKey, model: text(env.AI_MODEL) || AI_DEFAULT_MODEL }
}

/** جسم طلب Anthropic Messages من الحوار (دالة نقية — بتتختبر من غير شبكة) */
export function anthropicRequest(model: string, input: { system: string; messages: LlmMessage[]; tools: LlmToolDef[] }) {
  const messages: Array<{ role: 'user' | 'assistant'; content: unknown }> = []
  for (const message of input.messages) {
    if (message.role === 'user') messages.push({ role: 'user', content: message.text })
    else if (message.role === 'assistant') messages.push({ role: 'assistant', content: [...(message.text ? [{ type: 'text', text: message.text }] : []),
      ...message.toolCalls.map(call => ({ type: 'tool_use', id: call.id, name: call.name, input: call.input }))] })
    else {
      // نتايج الأدوات اللي ورا بعض بتتجمع في دور «مستخدم» واحد (شرط الواجهة)
      const block = { type: 'tool_result', tool_use_id: message.toolCallId, content: message.result }
      const last = messages[messages.length - 1]
      if (last && last.role === 'user' && Array.isArray(last.content) && (last.content as Array<{ type?: string }>).every(item => item.type === 'tool_result')) (last.content as unknown[]).push(block)
      else messages.push({ role: 'user', content: [block] })
    }
  }
  return { model, max_tokens: AI_MAX_OUTPUT_TOKENS, system: input.system, messages, tools: input.tools.map(tool => ({ name: tool.name, description: tool.description, input_schema: tool.inputSchema })) }
}
/** رد Anthropic ← نص ونداءات أدوات */
export function anthropicTurn(body: unknown): LlmTurn {
  const content = Array.isArray((body as { content?: unknown })?.content) ? (body as { content: Array<Record<string, unknown>> }).content : []
  return { text: content.filter(block => block.type === 'text' && typeof block.text === 'string').map(block => String(block.text)).join('\n').trim(),
    toolCalls: content.filter(block => block.type === 'tool_use' && typeof block.id === 'string' && typeof block.name === 'string')
      .map(block => ({ id: String(block.id), name: String(block.name), input: block.input && typeof block.input === 'object' && !Array.isArray(block.input) ? block.input as Record<string, unknown> : {} })) }
}

class AnthropicProvider implements LlmProvider {
  readonly name = 'anthropic'
  constructor(private readonly apiKey: string, readonly model: string) {}
  async turn(input: { system: string; messages: LlmMessage[]; tools: LlmToolDef[] }): Promise<LlmTurn> {
    const response = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(AI_PROVIDER_TIMEOUT_MS),
      headers: { 'content-type': 'application/json', 'x-api-key': this.apiKey, 'anthropic-version': '2023-06-01' }, body: JSON.stringify(anthropicRequest(this.model, input)) })
    if (response.status < 200 || response.status > 299) throw new Error(`مزوّد النموذج رد بـHTTP ${response.status}`)
    return anthropicTurn(await response.json())
  }
}

/** المزوّد الحقيقي من البيئة، أو null */
export function llmProviderFromEnv(env: Record<string, unknown> = process.env): LlmProvider | null {
  const config = llmConfig(env)
  return config ? new AnthropicProvider(config.apiKey, config.model) : null
}
