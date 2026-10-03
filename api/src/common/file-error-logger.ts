import { ConsoleLogger } from '@nestjs/common'
import * as fs from 'node:fs'
import * as path from 'node:path'

// B1.13: الأخطاء والتحذيرات بتتكتب كمان في ملف يومي (api-YYYY-MM-DD.log بتاريخ السيرفر المحلي) جنب الشاشة اللي PM2 بيلمها،
// والملفات الأقدم من مدة الاحتفاظ بتتمسح مع أول كتابة في كل يوم جديد. أي مشكلة في الملف مابتوقعش الـAPI.
// LOG_DIR: المجلد (الافتراضي api/logs)، وLOG_DIR=off بيقفل الملف. LOG_RETENTION_DAYS: الأيام (الافتراضي 30، من 1 لـ 3650).

const FILE = /^api-(\d{4}-\d{2}-\d{2})\.log$/
const localDay = (value: Date) =>
  [value.getFullYear(), String(value.getMonth() + 1).padStart(2, '0'), String(value.getDate()).padStart(2, '0')].join('-')

export class FileErrorLogger extends ConsoleLogger {
  private day = ''

  constructor(private readonly dir: string, private readonly retentionDays = 30, private readonly now: () => Date = () => new Date()) {
    super()
  }

  error(message: unknown, ...rest: unknown[]) {
    super.error(message, ...rest)
    this.append('ERROR', message, rest)
  }

  warn(message: unknown, ...rest: unknown[]) {
    super.warn(message, ...rest)
    this.append('WARN', message, rest)
  }

  /** ملف اليوم (للاختبارات والدليل) */
  fileFor(value: Date = this.now()) {
    return path.join(this.dir, `api-${localDay(value)}.log`)
  }

  private append(level: string, message: unknown, rest: unknown[]) {
    try {
      const now = this.now()
      const day = localDay(now)
      if (day !== this.day) {
        fs.mkdirSync(this.dir, { recursive: true })
        this.prune(now)
        this.day = day
      }
      // آخر نص من غير سطور = السياق (اسم الكلاس)، وأي نص قبله = تتبع الخطأ
      const texts = rest.filter((item): item is string => typeof item === 'string')
      const context = texts.length && !texts[texts.length - 1].includes('\n') ? texts.pop() : undefined
      const body = message instanceof Error ? `${message.message}\n${message.stack ?? ''}` : typeof message === 'string' ? message : JSON.stringify(message)
      const line = `${now.toISOString()} ${level}${context ? ` [${context}]` : ''} ${body}${texts.length ? `\n${texts.join('\n')}` : ''}\n`
      fs.appendFileSync(this.fileFor(now), line)
    } catch {
      /* الملف مايوقعش الـAPI — الشاشة لسه فيها الرسالة */
    }
  }

  /** مسح ملفات api-YYYY-MM-DD.log الأقدم من مدة الاحتفاظ (اسم الملف بس، ومن غير لمس أي ملف تاني في المجلد) */
  prune(now: Date = this.now()) {
    const limit = new Date(now.getFullYear(), now.getMonth(), now.getDate() - this.retentionDays)
    const oldest = localDay(limit)
    for (const name of fs.existsSync(this.dir) ? fs.readdirSync(this.dir) : []) {
      const match = FILE.exec(name)
      if (match && match[1] < oldest) {
        try { fs.rmSync(path.join(this.dir, name), { force: true }) } catch { /* ملف مقفول — المحاولة الجاية */ }
      }
    }
  }
}

/** الملف من الإعدادات: null = مقفول (LOG_DIR=off) */
export function fileErrorLoggerFromEnv(env: NodeJS.ProcessEnv = process.env, cwd = process.cwd()): FileErrorLogger | null {
  const dir = (env.LOG_DIR ?? '').trim()
  if (dir.toLowerCase() === 'off') return null
  const days = Number(env.LOG_RETENTION_DAYS ?? '30')
  return new FileErrorLogger(dir ? path.resolve(cwd, dir) : path.join(cwd, 'logs'), Number.isInteger(days) && days >= 1 && days <= 3650 ? days : 30)
}
