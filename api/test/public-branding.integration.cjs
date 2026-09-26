'use strict'
// هوية الشركة العامة (طلب المالك 26 سبتمبر): اسم المنتج ثابت «Logic Leap HR»، واسم الشركة وشعارها من «بيانات الشركة»
// بيظهروا في صفحة الدخول قبل أي جلسة وفوق القائمة الجانبية. الاختبار بيثبت على SQL حقيقي وبلا أي توكن إن:
// - GET /api/branding بيرجع الاسم ورابط الشعار بس (ولا عنوان ولا هاتف ولا سجل ولا أي رقم تاني)، والقيمة المؤقتة للاسم = null
// - GET /api/branding/logo بيقدّم الشعار المضبوط بالظبط بهيدرز آمنة، ومالوش أي مدخل رقم ملف: لا شعار تاني مش مضبوط
//   ولا مستند موظف يتوصله من هنا، ورقم ملف لغير صورة أو لملف مش «شعار الشركة» أو مش موجود على القرص = null و404
// قاعدة اختبار عشوائية ومجلد رفع مؤقت يُحذفوا في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const { COMPANY_NAME_PLACEHOLDER } = require('../src/common/data-placeholders')
const database = `hr_public_branding_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_public_branding_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-public-branding-files-'))
// ملف برّه مجلد الرفع — صف شعار اسم تخزينه بيطلع لبرّه لازم مايتقدمش
const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-public-branding-outside-'))
const secret = crypto.randomBytes(48).toString('hex')
const PRODUCT = 'Logic Leap HR'
const CSP = "default-src 'none'; style-src 'unsafe-inline'; sandbox"
// صورة PNG حقيقية 1×1، وبعدها وسم مختلف لكل ملف عشان نفرّق البايتات (القارئ بيتجاهل ما بعد IEND)
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64')
const png = tag => Buffer.concat([PNG, Buffer.from(tag)])
let app, ds, master, base, origin, created = false
const F = {}
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }

// نداء عام زي صفحة الدخول قبل أي جلسة: بلا Authorization وبلا كوكيز
async function publicGet(route) {
  const response = await fetch(route.startsWith('/api/') ? origin + route : base + route)
  const bytes = Buffer.from(await response.arrayBuffer())
  return { status: response.status, headers: response.headers, bytes, json: () => JSON.parse(bytes.toString('utf8')) }
}
const branding = async () => {
  const response = await publicGet('/branding')
  assert.equal(response.status, 200, response.bytes.toString())
  return response.json()
}
const setConfig = (key, value) => repo('RequestsConfig').save({ key, value })
/** ملف حقيقي في مجلد الرفع + صفه — نفس شكل FilesController.upload */
async function storeFile({ name, mime, entityType, content, employeeId = null, storedName }) {
  const stored = storedName ?? `2026-09/${crypto.randomUUID()}${path.extname(name)}`
  if (!storedName) {
    const target = path.join(uploads, stored)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, content)
  }
  return repo('StoredFile').save({ originalName: name, storedName: stored, mime, size: content.length, entityType, employeeId })
}
/** الشعار مش مضبوط صالح: الرابط null والنقطة 404 — والاسم مستقل عنه */
async function assertNoLogo(note) {
  const body = await branding()
  assert.equal(body.logoUrl, null, `${note}: ${JSON.stringify(body)}`)
  assert.equal(body.companyName, 'شركة الشعار للاختبار', `${note}: الاسم مستقل عن الشعار`)
  const logo = await publicGet('/branding/logo')
  assert.equal(logo.status, 404, `${note}: ${logo.bytes.toString()}`)
  assert.ok(!logo.bytes.includes(PNG), `${note}: مفيش بايتات صورة في رد 404`)
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME,
    password: env.DB_PASSWORD, database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assert.equal(ds.options.database, database)
  origin = `http://127.0.0.1:${app.getHttpServer().address().port}`
  base = `${origin}/api`

  const branch = await repo('Branch').save({ code: 'PB-BR', name: 'فرع الاختبار' })
  F.employee = await repo('Employee').save({ employeeCode: 'PB-001', fullName: 'موظف مستند الاختبار', branchId: branch.id,
    status: 'active', isActive: true, joinDate: '2024-01-01' })
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  for (const dir of [uploads, outside]) {
    try { fs.rmSync(dir, { recursive: true, force: true }) } catch (error) { errors.push(error) }
  }
  if (errors.length) throw new AggregateError(errors, 'public branding fixture cleanup failed')
})

test('PB-01: مفيش حاجة مضبوطة — الاسم والشعار null، والشعار 404، وبرضه من غير أي توكن', async () => {
  // مفاتيح الشركة بتتبذر فاضية عند الإقلاع (ConfigDefaultsService)
  for (const key of ['company.name', 'company.logo_file_id']) {
    assert.equal((await repo('RequestsConfig').findOneBy({ key }))?.value, '', key)
  }
  const response = await publicGet('/branding')
  assert.equal(response.status, 200)
  assert.deepEqual(response.json(), { productName: PRODUCT, companyName: null, logoUrl: null })
  assert.equal(response.headers.get('cache-control'), 'no-store', 'بعد الحفظ الواجهة بتعيد الجلب — الرد مايتخزنش')
  assert.equal((await publicGet('/branding/logo')).status, 404)
  // وصفوف المفاتيح نفسها لو مش موجودة خالص = نفس الرد
  await repo('RequestsConfig').delete({ key: 'company.logo_file_id' })
  assert.deepEqual(await branding(), { productName: PRODUCT, companyName: null, logoUrl: null })
  assert.equal((await publicGet('/branding/logo')).status, 404)
  await setConfig('company.logo_file_id', '')
})

test('PB-02: الاسم والشعار مضبوطين — الاسم ورابط الشعار بس، والشعار بايتاته وهيدرزه صح بلا أي تسجيل دخول', async () => {
  // باقي بيانات الشركة مضبوطة كمان — ومع ذلك مايطلعش منها حاجة في الرد العام
  await setConfig('company.address', 'عنوان سري للاختبار')
  await setConfig('company.phone', '0100000000')
  await setConfig('company.commercial_register', '1010101010')
  F.logo = await storeFile({ name: 'logo.png', mime: 'image/png', entityType: 'company_logo', content: png('logo-A') })
  await setConfig('company.name', '  شركة الشعار للاختبار  ')
  await setConfig('company.logo_file_id', String(F.logo.id))
  const body = await branding()
  assert.deepEqual(body, { productName: PRODUCT, companyName: 'شركة الشعار للاختبار', logoUrl: `/api/branding/logo?v=${F.logo.id}` })
  assert.deepEqual(Object.keys(body).sort(), ['companyName', 'logoUrl', 'productName'], 'الرد تلات حقول بس')

  // الرابط زي ما رجع بالظبط (مسار /api/... على أصل الخادم) — الطلب نفسه بلا Authorization
  const logo = await publicGet(body.logoUrl)
  assert.equal(logo.status, 200, logo.bytes.toString())
  assert.ok(logo.bytes.equals(png('logo-A')), 'بايتات الشعار المضبوط بالظبط')
  assert.equal(logo.headers.get('content-type'), 'image/png')
  assert.equal(logo.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(logo.headers.get('content-security-policy'), CSP)
  assert.equal(logo.headers.get('cache-control'), 'public, max-age=300')
  assert.equal(logo.headers.get('content-disposition'), 'inline', 'مفيش اسم الملف الأصلي في الهيدر')
  // من غير v كمان نفس الشعار
  assert.ok((await publicGet('/branding/logo')).bytes.equals(png('logo-A')))
})

test('PB-02b: شعار SVG بيتقدم بنوعه وبـCSP بتقفل السكربت لو اتفتح لوحده', async () => {
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#0f766e"/></svg>')
  const file = await storeFile({ name: 'logo.svg', mime: 'image/svg+xml', entityType: 'company_logo', content: svg })
  await setConfig('company.logo_file_id', String(file.id))
  assert.equal((await branding()).logoUrl, `/api/branding/logo?v=${file.id}`)
  const logo = await publicGet('/branding/logo')
  assert.equal(logo.status, 200)
  assert.ok(logo.bytes.equals(svg))
  assert.equal(logo.headers.get('content-type'), 'image/svg+xml')
  assert.equal(logo.headers.get('content-security-policy'), CSP)
  assert.equal(logo.headers.get('x-content-type-options'), 'nosniff')
  await setConfig('company.logo_file_id', String(F.logo.id))
})

test('PB-03: القيمة المؤقتة لاسم الشركة (أو اسم مسافات بس) = null، والشعار مستقل عنها', async () => {
  for (const value of [COMPANY_NAME_PLACEHOLDER, `  ${COMPANY_NAME_PLACEHOLDER}  `, '   ']) {
    await setConfig('company.name', value)
    const body = await branding()
    assert.equal(body.companyName, null, JSON.stringify(value))
    assert.equal(body.logoUrl, `/api/branding/logo?v=${F.logo.id}`)
  }
  await setConfig('company.name', 'شركة الشعار للاختبار')
  assert.equal((await branding()).companyName, 'شركة الشعار للاختبار')
})

test('PB-04: رقم ملف لغير صورة، أو لصورة مش «شعار الشركة»، أو ملف ناقص، أو قيمة تالفة = logoUrl null والشعار 404', async () => {
  const pdf = Buffer.from('%PDF-1.4\n% PB fixture only\n')
  const cases = [
    ['PDF متسجّل شعار', (await storeFile({ name: 'logo.pdf', mime: 'application/pdf', entityType: 'company_logo', content: pdf })).id],
    ['Word متسجّل شعار', (await storeFile({ name: 'logo.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', entityType: 'company_logo', content: pdf })).id],
    ['صورة موظف', (await storeFile({ name: 'photo.png', mime: 'image/png', entityType: 'employee_photo', content: png('photo'), employeeId: F.employee.id })).id],
    ['صورة مستند', (await storeFile({ name: 'scan.png', mime: 'image/png', entityType: 'document', content: png('scan'), employeeId: F.employee.id })).id],
    ['صورة بلا تصنيف', (await storeFile({ name: 'free.png', mime: 'image/png', entityType: null, content: png('free') })).id],
    ['شعار صفه موجود وملفه مش على القرص', (await storeFile({ name: 'gone.png', mime: 'image/png', entityType: 'company_logo', content: png('gone'), storedName: `2026-09/${crypto.randomUUID()}.png` })).id],
    ['شعار اسم تخزينه بيطلع برّه مجلد الرفع', await (async () => {
      const target = path.join(outside, 'escape.png'); fs.writeFileSync(target, png('escape'))
      return (await storeFile({ name: 'escape.png', mime: 'image/png', entityType: 'company_logo', content: png('escape'),
        storedName: path.relative(uploads, target) })).id
    })()],
    ['ملف مش موجود', 987654],
    ['نص', 'abc'], ['صفر', '0'], ['سالب', '-3'], ['كسر', '1.5'], ['أس', '1e3'], ['رقم أكبر من عمود int', '99999999999999'],
    ['رقم وبعده حروف', `${F.logo.id}abc`],
  ]
  for (const [note, value] of cases) {
    await setConfig('company.logo_file_id', String(value))
    await assertNoLogo(note)
  }
  // مسافات حوالين رقم صحيح = مضبوط (نفس قراءة GET /settings/company)
  await setConfig('company.logo_file_id', `  ${F.logo.id}  `)
  assert.equal((await branding()).logoUrl, `/api/branding/logo?v=${F.logo.id}`)
  assert.ok((await publicGet('/branding/logo')).bytes.equals(png('logo-A')))
})

test('PB-05: مفيش مدخل رقم ملف — شعار تاني مش المضبوط ومستند موظف مايتوصلش لهم من النقطة العامة', async () => {
  await setConfig('company.logo_file_id', String(F.logo.id))
  const otherLogo = await storeFile({ name: 'other.png', mime: 'image/png', entityType: 'company_logo', content: png('logo-B') })
  const document = await storeFile({ name: 'contract.pdf', mime: 'application/pdf', entityType: 'document', content: Buffer.from('%PDF-1.4\n% secret\n'), employeeId: F.employee.id })
  const photo = await storeFile({ name: 'photo.png', mime: 'image/png', entityType: 'employee_photo', content: png('photo-P'), employeeId: F.employee.id })
  const forbidden = [png('logo-B'), Buffer.from('%PDF-1.4\n% secret\n'), png('photo-P')]
  // v وأي باراميتر تاني بيتجاهلوا: الرد دايمًا الشعار المضبوط
  for (const route of [`/branding/logo?v=${otherLogo.id}`, `/branding/logo?id=${otherLogo.id}`, `/branding/logo?fileId=${document.id}`,
    `/branding/logo?v=${photo.id}&id=${photo.id}`, `/branding/logo?v=../../${document.id}`]) {
    const response = await publicGet(route)
    assert.equal(response.status, 200, route)
    assert.ok(response.bytes.equals(png('logo-A')), `${route} لازم يرجّع الشعار المضبوط بس`)
  }
  // ومفيش مسار برقم ملف أصلًا
  for (const route of [`/branding/logo/${otherLogo.id}`, `/branding/logo/${document.id}`, `/branding/${photo.id}`, `/branding/files/${document.id}`]) {
    const response = await publicGet(route)
    assert.equal(response.status, 404, route)
    for (const bytes of forbidden) assert.ok(!response.bytes.includes(bytes), `${route} سرّب ملف`)
  }
  // والملفات نفسها لسه محتاجة تسجيل دخول (النقطة العامة مش باب خلفي)
  for (const file of [otherLogo, document, photo]) assert.equal((await publicGet(`/files/${file.id}`)).status, 401)
  // الشعار التاني صالح تمامًا — بس مايتقدمش إلا لما يتضبط هو
  await setConfig('company.logo_file_id', '')
  assert.equal((await publicGet(`/branding/logo?v=${otherLogo.id}`)).status, 404)
  await setConfig('company.logo_file_id', String(otherLogo.id))
  assert.equal((await branding()).logoUrl, `/api/branding/logo?v=${otherLogo.id}`)
  assert.ok((await publicGet(`/branding/logo?v=${F.logo.id}`)).bytes.equals(png('logo-B')), 'بعد التغيير: المضبوط الجديد بس')
})

test('PB-06: الكنترولر مالوش مدخل رقم ملف ولا حارس، وموديوله لوحده متسجّل في AppModule', () => {
  const read = file => fs.readFileSync(path.join(apiRoot, file), 'utf8').replace(/\r\n/g, '\n')
  const controller = read('src/settings/branding.controller.ts')
  assert.doesNotMatch(controller, /@(Param|Query|Body)\(/, 'مفيش مدخل من الطلب بيختار ملف')
  assert.doesNotMatch(controller, /@UseGuards\(/, 'النقطة عامة لصفحة الدخول')
  assert.match(controller, /entityType !== 'company_logo'/)
  const module = read('src/settings/branding.module.ts')
  assert.match(module, /controllers: \[BrandingController\]/)
  assert.match(module, /TypeOrmModule\.forFeature\(\[RequestsConfig, StoredFile\]\)/, 'بيقرا الإعدادات وصف الملف بس')
  assert.match(read('src/app.module.ts'), /\n\s+BrandingModule,\n/)
  // مفيش حارس عام في main.ts ولا APP_GUARD يقفل النقطة
  assert.doesNotMatch(read('src/main.ts'), /useGlobalGuards/)
})
