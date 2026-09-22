import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { scrubSecrets } from './directory.types'

// ===== إرسال البريد (رمز التحقق) =====
// واجهة صغيرة: الاختبارات بتستبدل send على النسخة نفسها فمفيش اتصال SMTP حقيقي في أي اختبار.
// فشل الإرسال ممنوع يدخّل حد: auth.service بيرفض الدخول ويقول السبب (مش بيفتح جلسة).

export interface MailMessage {
  to: string
  subject: string
  text: string
}

/** نتيجة الإرسال — response هو رد خادم البريد بالحرف (للفحص الذاتي قبل تشغيل التحقق بخطوتين). */
export interface MailSendResult {
  accepted: string[]
  rejected: string[]
  messageId: string | null
  response: string
}

export interface MailProvider {
  isConfigured(): boolean
  send(message: MailMessage): Promise<MailSendResult>
}

/** خطأ إرسال بريد — الرسالة العربية للمستخدم، وdetail (رد الخادم بالحرف) للسجل وللفحص الذاتي. */
export class MailSendError extends Error {
  constructor(
    readonly detail: string,
    readonly configured: boolean
  ) {
    super(
      configured
        ? 'تعذّر إرسال رمز التحقق على البريد — خادم البريد رفض الرسالة أو مش راد. الدخول موقوف لحد ما البريد يشتغل.'
        : 'خادم البريد غير مضبوط على الخادم، ورمز التحقق مش ممكن يتبعت — الدخول موقوف. اضبط SMTP_HOST في api/.env أو اقفل التحقق بخطوتين.'
    )
    this.name = 'MailSendError'
  }
}

export interface MailConfig {
  host: string
  port: number
  /** true = TLS من أول لحظة (465). false = STARTTLS على 587 */
  secure: boolean
  requireTls: boolean
  rejectUnauthorized: boolean
  user: string
  password: string
  from: string
  timeoutMs: number
}

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')
const flag = (value: unknown, fallback: boolean): boolean => {
  const raw = text(value).toLowerCase()
  if (raw === 'true') return true
  if (raw === 'false') return false
  return fallback
}

export function readMailConfig(env: Record<string, unknown>): MailConfig {
  const host = text(env.SMTP_HOST)
  const secure = flag(env.SMTP_SECURE, false)
  const port = Number(text(env.SMTP_PORT) || (secure ? '465' : '587'))
  const timeoutMs = Number(text(env.SMTP_TIMEOUT_MS) || '15000')
  return {
    host,
    port: Number.isInteger(port) && port > 0 && port <= 65535 ? port : secure ? 465 : 587,
    secure,
    requireTls: flag(env.SMTP_REQUIRE_TLS, !secure),
    rejectUnauthorized: flag(env.SMTP_TLS_REJECT_UNAUTHORIZED, true),
    user: text(env.SMTP_USER),
    password: typeof env.SMTP_PASSWORD === 'string' ? env.SMTP_PASSWORD : '',
    from: text(env.SMTP_FROM),
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs >= 1000 ? timeoutMs : 15000,
  }
}

/** ما ينقص لكي يشتغل الإرسال — للشاشة ولرسالة الرفض (بلا أي سر). */
export function mailConfigGaps(config: MailConfig): string[] {
  const gaps: string[] = []
  if (!config.host) gaps.push('SMTP_HOST')
  if (!config.from) gaps.push('SMTP_FROM')
  return gaps
}

/** إخفاء العنوان في أي رد للعميل: ka****@maharah.pro — بيقول لصاحب الحساب فين الرمز بلا كشف العنوان كامل. */
export function maskEmail(address: string): string {
  const value = text(address)
  const at = value.lastIndexOf('@')
  if (at <= 0) return value ? `${value.slice(0, 1)}***` : ''
  const local = value.slice(0, at)
  const domain = value.slice(at)
  const keep = local.length <= 2 ? 1 : 2
  return `${local.slice(0, keep)}${'*'.repeat(Math.max(3, local.length - keep))}${domain}`
}

@Injectable()
export class MailService implements MailProvider, OnApplicationBootstrap {
  private readonly logger = new Logger(MailService.name)
  readonly config: MailConfig
  private transport: { sendMail(options: Record<string, unknown>): Promise<Record<string, unknown>> } | null = null

  constructor(config: ConfigService) {
    this.config = readMailConfig({
      SMTP_HOST: config.get('SMTP_HOST'),
      SMTP_PORT: config.get('SMTP_PORT'),
      SMTP_SECURE: config.get('SMTP_SECURE'),
      SMTP_REQUIRE_TLS: config.get('SMTP_REQUIRE_TLS'),
      SMTP_TLS_REJECT_UNAUTHORIZED: config.get('SMTP_TLS_REJECT_UNAUTHORIZED'),
      SMTP_USER: config.get('SMTP_USER'),
      SMTP_PASSWORD: config.get('SMTP_PASSWORD'),
      SMTP_FROM: config.get('SMTP_FROM'),
      SMTP_TIMEOUT_MS: config.get('SMTP_TIMEOUT_MS'),
    })
  }

  onApplicationBootstrap() {
    const gaps = mailConfigGaps(this.config)
    if (gaps.length) {
      this.logger.log(
        `إرسال البريد مش مضبوط (ناقص ${gaps.join(', ')}) — التحقق بخطوتين مايتفتحش قبل ما البريد يشتغل`
      )
      return
    }
    if (!this.config.secure && !this.config.requireTls) {
      this.logger.warn(
        `⚠️  البريد بيتبعت على ${this.config.host}:${this.config.port} بلا TLS (SMTP_SECURE=false و SMTP_REQUIRE_TLS=false) — ` +
          'رموز التحقق بتعدّي على الشبكة بلا تشفير. اضبط SMTP_REQUIRE_TLS=true.'
      )
    }
  }

  isConfigured(): boolean {
    return mailConfigGaps(this.config).length === 0
  }

  /** ملخص للشاشة — بلا كلمة مرور البريد. */
  status() {
    return {
      configured: this.isConfigured(),
      missing: mailConfigGaps(this.config),
      server: this.config.host ? `${this.config.host}:${this.config.port}` : null,
      secure: this.config.secure,
      requireTls: this.config.requireTls,
      from: this.config.from || null,
      authConfigured: this.config.user.length > 0,
    }
  }

  async send(message: MailMessage): Promise<MailSendResult> {
    if (!this.isConfigured()) {
      throw new MailSendError(`إعداد البريد ناقص: ${mailConfigGaps(this.config).join(', ')}`, false)
    }
    try {
      const info = (await this.transporter().sendMail({
        from: this.config.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
      })) as { accepted?: unknown[]; rejected?: unknown[]; messageId?: string; response?: string }
      const accepted = (info.accepted ?? []).map((a) => String(a))
      const rejected = (info.rejected ?? []).map((a) => String(a))
      if (accepted.length === 0) {
        throw new MailSendError(
          `خادم البريد رفض العنوان: ${rejected.join(', ') || 'بلا سبب معلن'} — ${String(info.response ?? '')}`.trim(),
          true
        )
      }
      return {
        accepted,
        rejected,
        messageId: info.messageId ?? null,
        response: String(info.response ?? '').slice(0, 500),
      }
    } catch (error) {
      if (error instanceof MailSendError) throw error
      throw new MailSendError(this.brief(error), true)
    }
  }

  // معزولة عشان الاختبار يتأكد إن مفيش نقل حقيقي بيتعمل
  protected transporter() {
    if (this.transport) return this.transport
    const nodemailer = require('nodemailer') as typeof import('nodemailer')
    this.transport = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      requireTLS: this.config.requireTls,
      tls: { rejectUnauthorized: this.config.rejectUnauthorized, servername: this.config.host },
      connectionTimeout: this.config.timeoutMs,
      greetingTimeout: this.config.timeoutMs,
      socketTimeout: this.config.timeoutMs,
      ...(this.config.user ? { auth: { user: this.config.user, pass: this.config.password } } : {}),
    }) as unknown as { sendMail(options: Record<string, unknown>): Promise<Record<string, unknown>> }
    return this.transport
  }

  private brief(error: unknown): string {
    const parts = [
      String((error as Error)?.message ?? error),
      (error as { code?: string })?.code ? `code=${(error as { code?: string }).code}` : '',
      (error as { response?: string })?.response ? `response=${(error as { response?: string }).response}` : '',
    ].filter(Boolean)
    return scrubSecrets(parts.join(' | '), [this.config.password]).slice(0, 500)
  }
}
