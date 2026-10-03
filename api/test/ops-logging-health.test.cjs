// B1.13: ملف الأخطاء بتدوير وملخص المهام في /api/health — اختبارات نقية بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { FileErrorLogger, fileErrorLoggerFromEnv } = require('../src/common/file-error-logger')
const { healthJobsSummary } = require('../src/health/health.controller')

const quiet = logger => { for (const name of ['printMessages', 'printStackTrace']) logger[name] = () => undefined; return logger }

test('OL-01: الأخطاء والتحذيرات بتتكتب في ملف اليوم بالسياق والتتبع، والمعلومات لأ؛ واليوم الجديد ملف جديد', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-ops-log-'))
  try {
    let now = new Date(2026, 9, 3, 23, 59, 0)
    const logger = quiet(new FileErrorLogger(dir, 30, () => now))
    logger.error('فشل الاتصال بالقاعدة', 'Error: boom\n    at x (y.ts:1:1)', 'TypeOrmModule')
    logger.warn('مهمة اتأخرت', 'ScheduledJobsRunner')
    logger.log('رسالة عادية', 'App')
    const today = fs.readFileSync(path.join(dir, 'api-2026-10-03.log'), 'utf8')
    assert.match(today, /ERROR \[TypeOrmModule\] فشل الاتصال بالقاعدة\nError: boom\n {4}at x/)
    assert.match(today, /WARN \[ScheduledJobsRunner\] مهمة اتأخرت/)
    assert.doesNotMatch(today, /رسالة عادية/)
    now = new Date(2026, 9, 4, 0, 0, 1)
    logger.error(new Error('خطأ بعد نص الليل'))
    assert.match(fs.readFileSync(path.join(dir, 'api-2026-10-04.log'), 'utf8'), /ERROR خطأ بعد نص الليل\nError: خطأ بعد نص الليل/)
    assert.equal(logger.fileFor(), path.join(dir, 'api-2026-10-04.log'))
  } finally { fs.rmSync(dir, { recursive: true, force: true }) }
})

test('OL-02: ملفات api-*.log الأقدم من مدة الاحتفاظ بتتمسح مع أول كتابة في اليوم، وأي ملف تاني في المجلد مابيتلمسش', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-ops-log-'))
  try {
    for (const name of ['api-2026-08-01.log', 'api-2026-09-04.log', 'api-2026-09-03.log', 'notes.txt', 'api-old.log']) fs.writeFileSync(path.join(dir, name), 'x')
    const logger = quiet(new FileErrorLogger(dir, 30, () => new Date(2026, 9, 4, 9, 0, 0)))
    logger.warn('أول كتابة النهارده')
    assert.deepEqual(fs.readdirSync(dir).sort(), ['api-2026-09-04.log', 'api-2026-10-04.log', 'api-old.log', 'notes.txt'])
  } finally { fs.rmSync(dir, { recursive: true, force: true }) }
})

test('OL-03: الإعدادات — LOG_DIR=off بيقفل، والمسار النسبي من مجلد التشغيل، ومدة احتفاظ غلط = 30', () => {
  assert.equal(fileErrorLoggerFromEnv({ LOG_DIR: 'off' }, 'C:\\app'), null)
  assert.equal(fileErrorLoggerFromEnv({ LOG_DIR: ' OFF ' }, 'C:\\app'), null)
  const defaults = fileErrorLoggerFromEnv({}, path.resolve('/srv/api'))
  assert.equal(path.dirname(defaults.fileFor(new Date(2026, 0, 2))), path.join(path.resolve('/srv/api'), 'logs'))
  assert.equal(defaults.retentionDays, 30)
  assert.equal(fileErrorLoggerFromEnv({ LOG_DIR: 'var/log', LOG_RETENTION_DAYS: 'abc' }, path.resolve('/srv/api')).retentionDays, 30)
  assert.equal(fileErrorLoggerFromEnv({ LOG_RETENTION_DAYS: '7' }, path.resolve('/srv/api')).retentionDays, 7)
  const main = fs.readFileSync(path.join(__dirname, '..', 'src/main.ts'), 'utf8')
  assert.match(main, /const fileLogger = fileErrorLoggerFromEnv\(\)\r?\n\s*const app = await NestFactory\.create\(AppModule, fileLogger \? \{ logger: fileLogger \} : \{\}\)/)
  assert.match(fs.readFileSync(path.join(__dirname, '..', '.gitignore'), 'utf8'), /^logs\/\r?$/m)
})

test('OL-04: /api/health — ملخص المهام بالعدد بس: المفعّلة اللي آخر تشغيل ليها فشل أو وقف في النص، والمقفولة مابتتحسبش، وسجل مش موجود = unknown', () => {
  const job = (enabled, status, abandoned = false) => ({ id: 'x', label: 'سر', enabled, lastRun: status ? { status, abandoned, error: 'تفاصيل داخلية' } : null })
  assert.deepEqual(healthJobsSummary(null), { status: 'unknown', failing: 0 })
  assert.deepEqual(healthJobsSummary({ available: false, jobs: [] }), { status: 'unknown', failing: 0 })
  assert.deepEqual(healthJobsSummary({ available: true, jobs: [job(true, 'SUCCEEDED'), job(true, null), job(false, 'FAILED')] }), { status: 'ok', failing: 0 })
  const failing = healthJobsSummary({ available: true, jobs: [job(true, 'FAILED'), job(true, 'RUNNING', true), job(true, 'SUCCEEDED')] })
  assert.deepEqual(failing, { status: 'failing', failing: 2 })
  assert.equal(JSON.stringify(failing).includes('سر') || JSON.stringify(failing).includes('تفاصيل'), false, 'من غير أسماء ولا أخطاء')
})
