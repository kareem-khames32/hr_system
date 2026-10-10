import { request as httpsRequest } from 'node:https'
import { maskPhone, WHATSAPP_API_HOST, WHATSAPP_TIMEOUT_MS, type WhatsappBinding, type WhatsappProviderCode, type WhatsappSettings } from './channel-rules'

// B-ADD.5: مزوّد الواتساب الأول — WhatsApp Business Cloud API الرسمي من Meta. رسالة قالب معتمد بس (Meta مابتسمحش للشركة تبدأ
// المحادثة بنص حر). النداء على الشبكة دالة بتتحقن (WhatsappHttp): الاختبارات بتدّي دالة تجريبية ومفيش طلب حقيقي بيطلع.

export interface WhatsappHttpRequest { url: string; headers: Record<string, string>; body: string; timeoutMs: number }
export interface WhatsappHttpResponse { status: number; body: string }
export type WhatsappHttp = (request: WhatsappHttpRequest) => Promise<WhatsappHttpResponse>

export interface WhatsappMessage {
  settings: WhatsappSettings
  token: string
  /** رقم المستلم E.164 أرقام بس */
  to: string
  binding: WhatsappBinding
  parameters: string[]
}

/** مزوّد واتساب: مزوّد تاني (غير Meta) بيتضاف بنفس الشكل ويتسجّل في WHATSAPP_PROVIDER_IMPLEMENTATIONS */
export interface WhatsappProvider {
  readonly code: WhatsappProviderCode
  send(message: WhatsappMessage, http: WhatsappHttp): Promise<{ messageId: string | null }>
}

/**
 * فشل إرسال واتساب. detail من غير التوكن ومن غير رقم كامل. rejected = Meta رفضت الرسالة نفسها (الرقم مش على واتساب، القالب مش معتمد أو
 * متغيراته مش مطابقة): الإعادة مش هتغيّر حاجة. unreachable = الوصول للمزوّد نفسه واقف (شبكة، توكن منتهي): كل الرسايل هتفشل زيها.
 */
export class WhatsappSendError extends Error {
  constructor(readonly detail: string, readonly rejected: boolean, readonly unreachable: boolean) {
    super(detail)
    this.name = 'WhatsappSendError'
  }
}

// أكواد Meta اللي الإعادة مابتغيّرهاش: الرقم مش على واتساب أو مش مسموح، والقالب مش موجود أو موقوف أو متغيراته مش مطابقة
const META_REJECTED = new Set([100, 131008, 131009, 131021, 131026, 131030, 131047, 131051, 132000, 132001, 132005, 132007, 132012, 132015, 132016, 132068, 132069])
// التوكن غلط أو منتهي أو من غير صلاحية: كل الرسايل هتفشل لحد ما يتبدّل من الشاشة
const META_AUTH = new Set([0, 3, 10, 190, 200])

const scrub = (text: string, token: string) => (token ? text.split(token).join('***') : text).replace(/\b\d{8,15}\b/g, digits => maskPhone(digits)).replace(/\s+/g, ' ').trim().slice(0, 500)

/** جسم طلب Meta لرسالة قالب: متغيرات القالب نص بترتيبها في جسم القالب */
export function metaTemplateRequest(message: Pick<WhatsappMessage, 'settings' | 'to' | 'binding' | 'parameters'>): { url: string; body: string } {
  const { settings, to, binding, parameters } = message
  return {
    url: `https://${WHATSAPP_API_HOST}/${settings.apiVersion}/${settings.phoneNumberId}/messages`,
    body: JSON.stringify({
      messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'template',
      template: {
        name: binding.templateName, language: { code: binding.languageCode },
        ...(parameters.length ? { components: [{ type: 'body', parameters: parameters.map(text => ({ type: 'text', text })) }] } : {}),
      },
    }),
  }
}

/** رد Meta ← نتيجة: 2xx برقم رسالة = اتقبلت؛ وإلا خطأ مصنّف (مرفوضة، المزوّد واقف، أو تتعاد) */
export function readMetaResponse(response: WhatsappHttpResponse, token: string): { messageId: string | null } {
  let parsed: Record<string, unknown> = {}
  try { parsed = JSON.parse(response.body) as Record<string, unknown> } catch { /* رد مش JSON */ }
  if (response.status >= 200 && response.status < 300) {
    const first = Array.isArray(parsed.messages) ? parsed.messages[0] as { id?: unknown } | undefined : undefined
    return { messageId: typeof first?.id === 'string' ? first.id : null }
  }
  const error = (parsed.error && typeof parsed.error === 'object' ? parsed.error : {}) as { message?: unknown; code?: unknown; error_data?: { details?: unknown } }
  const code = Number(error.code)
  const said = [error.message, error.error_data?.details].filter(part => typeof part === 'string' && part).join(' — ') || response.body.slice(0, 200)
  const detail = scrub(`Meta ${response.status}${Number.isFinite(code) ? ` code=${code}` : ''}: ${said}`, token)
  const auth = response.status === 401 || response.status === 403 || META_AUTH.has(code)
  // 429 وأعطال Meta (5xx) بتتعاد؛ وباقي 4xx رفض للرسالة نفسها
  const rejected = !auth && (META_REJECTED.has(code) || (response.status >= 400 && response.status < 500 && response.status !== 429 && response.status !== 408))
  throw new WhatsappSendError(detail, rejected, auth)
}

export const metaCloudProvider: WhatsappProvider = {
  code: 'META_CLOUD',
  async send(message, http) {
    const { url, body } = metaTemplateRequest(message)
    let response: WhatsappHttpResponse
    try {
      response = await http({ url, body, timeoutMs: WHATSAPP_TIMEOUT_MS, headers: { Authorization: `Bearer ${message.token}`, 'Content-Type': 'application/json' } })
    } catch (error) {
      // مفيش رد أصلًا (شبكة، مهلة، اسم مش بيتحل): المزوّد مش بيرد
      const code = (error as { code?: unknown })?.code
      throw new WhatsappSendError(scrub(`تعذر الوصول لخادم Meta: ${String((error as Error)?.message ?? error)}${code ? ` code=${String(code)}` : ''}`, message.token), false, true)
    }
    return readMetaResponse(response, message.token)
  },
}

export const WHATSAPP_PROVIDER_IMPLEMENTATIONS: Record<WhatsappProviderCode, WhatsappProvider> = { META_CLOUD: metaCloudProvider }

/** النداء الحقيقي: https على خادم Meta بس (أي عنوان تاني بيترفض قبل ما يطلع)، بمهلة، ومن غير تحويلات */
export const metaHttp: WhatsappHttp = request => new Promise((resolve, reject) => {
  let url: URL
  try { url = new URL(request.url) } catch { reject(new Error('عنوان غير صالح')); return }
  if (url.protocol !== 'https:' || url.hostname !== WHATSAPP_API_HOST || url.port) { reject(new Error('عنوان الواتساب لازم يكون خادم Meta')); return }
  const outgoing = httpsRequest({ method: 'POST', hostname: WHATSAPP_API_HOST, port: 443, path: url.pathname, timeout: request.timeoutMs,
    headers: { ...request.headers, 'Content-Length': Buffer.byteLength(request.body) } }, incoming => {
    const chunks: Buffer[] = []
    let size = 0
    incoming.on('data', (chunk: Buffer) => { size += chunk.length; if (size <= 64_000) chunks.push(chunk) })
    incoming.on('end', () => resolve({ status: incoming.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') }))
    incoming.on('error', reject)
  })
  outgoing.on('timeout', () => outgoing.destroy(Object.assign(new Error('Meta مش بترد (انتهت المهلة)'), { code: 'ETIMEDOUT' })))
  outgoing.on('error', reject)
  outgoing.end(request.body)
})
