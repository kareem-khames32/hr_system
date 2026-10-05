'use strict'
// B2.2: رفع الملفات على قاعدة SQL مؤقتة معزولة بتتمسح في الآخر (hr_file_upload_test_<16 hex>) ومجلد رفع مؤقت:
//  FU-01) PDF متسمي .jpg = 400، ومفيش صف ولا ملف على القرص.
//  FU-02) صورة PNG حقيقية بتتقبل بنوعها الحقيقي (مش اللي المتصفح قاله)، وبصمتها sha256 المحتوى، والملف على القرص هو المحتوى.
//  FU-03) Word وExcel حقيقيين (أرشيف ZIP) بيتقبلوا بنوعهم.
//  FU-04) نوع مقفول من الإعداد = 400 باسمه.
//  FU-05) أكبر من الحد في الإعداد = 400، ومفيش حاجة اتكتبت.
//  FU-06) صورة الموظف وشعار الشركة لازم صورة حقيقية.
// Run (من api/): node --test test/file-upload-type.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const JSZip = require('../node_modules/jszip')
const ExcelJS = require('../node_modules/exceljs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))

const database = `hr_file_upload_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-file-upload-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, master, ds, base, created = false
const users = {}

function assertDisposable() {
  assert.match(database, /^hr_file_upload_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(user)}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
async function upload(user, bytes, name, { type = 'application/octet-stream', query = 'entityType=document' } = {}) {
  const form = new FormData()
  form.append('file', new Blob([bytes], { type }), name)
  const response = await fetch(`${base}/files/upload?${query}`, { method: 'POST', headers: { Authorization: `Bearer ${token(user)}` }, body: form })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const messageOf = response => [].concat(response.body?.message ?? []).join('، ')
// كل الملفات تحت مجلد الرفع (عشان «مفيش حاجة اتكتبت»)
const diskFiles = (dir = uploads) => fs.readdirSync(dir, { withFileTypes: true })
  .flatMap(entry => entry.isDirectory() ? diskFiles(path.join(dir, entry.name)) : [path.relative(uploads, path.join(dir, entry.name))]).sort()
const rowCount = async () => Number((await ds.query('SELECT COUNT(*) AS n FROM [stored_files]'))[0].n)
async function setConfig(key, value) {
  const config = repo('RequestsConfig')
  if (await config.findOneBy({ key })) await config.update({ key }, { value })
  else await config.save({ key, value })
}

// محتوى حقيقي لكل نوع
function png() {
  const chunk = (kind, data) => {
    const length = Buffer.alloc(4); length.writeUInt32BE(data.length)
    const crc = Buffer.alloc(4); crc.writeUInt32BE(require('node:zlib').crc32(Buffer.concat([Buffer.from(kind), data])) >>> 0)
    return Buffer.concat([length, Buffer.from(kind), data, crc])
  }
  const header = Buffer.alloc(13); header.writeUInt32BE(1, 0); header.writeUInt32BE(1, 4); header[8] = 8; header[9] = 2
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', header),
    chunk('IDAT', require('node:zlib').deflateSync(Buffer.from([0, 255, 0, 0]))), chunk('IEND', Buffer.alloc(0))])
}
const pdf = (padding = 0) => Buffer.concat([Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\n'), Buffer.alloc(padding, 0x20), Buffer.from('\n%%EOF\n')])
async function docx() {
  const zip = new JSZip()
  zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
  zip.file('word/document.xml', '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>عقد</w:t></w:r></w:p></w:body></w:document>')
  return zip.generateAsync({ type: 'nodebuffer' })
}
async function xlsx() {
  const book = new ExcelJS.Workbook()
  book.addWorksheet('رواتب').addRow(['الاسم', 'الصافي'])
  return Buffer.from(await book.xlsx.writeBuffer())
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => undefined
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => undefined
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assertDisposable()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  const branch = await repo('Branch').save({ code: 'FU_B', name: 'فرع رفع الملفات' })
  const employee = await repo('Employee').save({ employeeCode: 'FU001', fullName: 'موظف رفع الملفات', branchId: branch.id, joinDate: '2020-01-01', basicSalary: 5000,
    housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'transfer' })
  users.admin = await repo('User').save({ email: 'admin@file-upload.invalid', displayName: 'admin', passwordHash: 'test-only', role: 'super_admin', branchId: null, permissions: '[]' })
  users.me = await repo('User').save({ email: 'me@file-upload.invalid', displayName: 'me', passwordHash: 'test-only', role: 'employee', branchId: branch.id,
    employeeId: employee.id, permissions: '[]' })
  // الإعدادات بقيمها الافتراضية مبذورة
  assert.equal((await repo('RequestsConfig').findOneByOrFail({ key: 'files.max_size_mb' })).value, '10')
  assert.equal((await repo('RequestsConfig').findOneByOrFail({ key: 'files.allowed_types' })).value, 'jpeg,png,webp,pdf,doc,docx,xls,xlsx')
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assertDisposable()
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), os.tmpdir()); assert.match(path.basename(uploads), /^hr-file-upload-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'file upload fixture cleanup failed')
})

test('FU-01: PDF متسمي .jpg (والمتصفح قال صورة) = 400 برسالة واضحة، ومفيش صف ولا ملف على القرص', async () => {
  const [rows, files] = [await rowCount(), diskFiles()]
  const response = await upload(users.me, pdf(), 'scan.jpg', { type: 'image/jpeg' })
  assert.equal(response.status, 400, JSON.stringify(response.body))
  assert.match(messageOf(response), /محتوى الملف PDF لكن امتداده «\.jpg»/)
  assert.deepEqual([await rowCount(), diskFiles()], [rows, files])
  // ملف نصي/HTML متسمي PDF
  const html = await upload(users.me, Buffer.from('<html><script>alert(1)</script></html>'), 'cv.pdf', { type: 'application/pdf' })
  assert.equal(html.status, 400); assert.match(messageOf(html), /محتوى الملف مش من الأنواع المسموحة/)
  assert.deepEqual([await rowCount(), diskFiles()], [rows, files])
})

test('FU-02: صورة PNG حقيقية بتتقبل بنوعها الحقيقي وبصمتها، والملف على القرص هو المحتوى', async () => {
  const bytes = png()
  const response = await upload(users.me, bytes, 'me.png', { type: 'application/octet-stream' })
  assert.equal(response.status, 201, JSON.stringify(response.body))
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex')
  assert.deepEqual([response.body.mime, response.body.size, response.body.sha256, response.body.ref], ['image/png', bytes.length, sha256, `file:${response.body.id}`])
  const [row] = await ds.query('SELECT [mime], [storedName], [sha256], [originalName] FROM [stored_files] WHERE [id] = @0', [response.body.id])
  assert.deepEqual([row.mime, row.sha256, row.originalName], ['image/png', sha256, 'me.png'])
  assert.match(row.storedName, /^\d{4}-\d{2}[\\/][0-9a-f-]{36}\.png$/)
  assert.deepEqual(fs.readFileSync(path.join(uploads, row.storedName)), bytes)
  // التحميل بنفس النوع الحقيقي
  const download = await fetch(`${base}/files/${response.body.id}`, { headers: { Authorization: `Bearer ${token(users.me)}` } })
  assert.equal(download.status, 200)
  assert.equal(download.headers.get('content-type'), 'image/png')
  assert.deepEqual(Buffer.from(await download.arrayBuffer()), bytes)
})

test('FU-03: Word وExcel حقيقيين بيتقبلوا بنوعهم، وWord متسمي .xlsx مرفوض', async () => {
  const word = await upload(users.me, await docx(), 'عقد.docx')
  assert.equal(word.status, 201, JSON.stringify(word.body))
  assert.equal(word.body.mime, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  const sheet = await upload(users.me, await xlsx(), 'رواتب.XLSX')
  assert.equal(sheet.status, 201, JSON.stringify(sheet.body))
  assert.equal(sheet.body.mime, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  const swapped = await upload(users.me, await docx(), 'رواتب.xlsx')
  assert.equal(swapped.status, 400); assert.match(messageOf(swapped), /محتوى الملف Word لكن امتداده «\.xlsx»/)
})

test('FU-04: نوع مقفول من الإعداد = 400 باسمه، والمسموح شغال', async () => {
  const saved = expectOk(await request(users.admin, 'PATCH', '/settings/config', { key: 'files.allowed_types', value: 'jpeg,png,webp' }))
  assert.equal(saved.value ?? 'jpeg,png,webp', 'jpeg,png,webp')
  try {
    const [rows, files] = [await rowCount(), diskFiles()]
    const refused = await upload(users.me, pdf(), 'report.pdf', { type: 'application/pdf' })
    assert.equal(refused.status, 400); assert.match(messageOf(refused), /نوع الملف \(PDF\) مش مسموح — المسموح: صورة JPG، صورة PNG، صورة WEBP/)
    assert.deepEqual([await rowCount(), diskFiles()], [rows, files])
    assert.equal((await upload(users.me, png(), 'ok.png')).status, 201)
    // قيمة غلط في الإعداد مرفوضة
    const bad = await request(users.admin, 'PATCH', '/settings/config', { key: 'files.allowed_types', value: 'pdf,exe' })
    assert.equal(bad.status, 400); assert.match(messageOf(bad), /أنواع ملفات مش معروفة: exe/)
  } finally { await setConfig('files.allowed_types', 'jpeg,png,webp,pdf,doc,docx,xls,xlsx') }
})

test('FU-05: أكبر من الحد في الإعداد = 400 ومفيش حاجة اتكتبت، والحد من 1 لـ50 بس', async () => {
  expectOk(await request(users.admin, 'PATCH', '/settings/config', { key: 'files.max_size_mb', value: '1' }))
  try {
    const [rows, files] = [await rowCount(), diskFiles()]
    const big = await upload(users.me, pdf(1024 * 1024 + 10), 'big.pdf', { type: 'application/pdf' })
    assert.equal(big.status, 400); assert.match(messageOf(big), /حجم الملف أكبر من الحد \(1 ميجا\)/)
    assert.deepEqual([await rowCount(), diskFiles()], [rows, files])
    assert.equal((await upload(users.me, pdf(1000), 'small.pdf')).status, 201)
    for (const value of ['0', '51', '2.5', 'عشرة']) {
      const bad = await request(users.admin, 'PATCH', '/settings/config', { key: 'files.max_size_mb', value })
      assert.equal(bad.status, 400, value)
    }
  } finally { await setConfig('files.max_size_mb', '10') }
})

test('FU-06: صورة الموظف وشعار الشركة لازم صورة حقيقية — PDF حقيقي أو PDF متسمي صورة مرفوضين', async () => {
  const photoPdf = await upload(users.me, pdf(), 'me.pdf', { type: 'image/png', query: 'entityType=employee_photo' })
  assert.equal(photoPdf.status, 400); assert.match(messageOf(photoPdf), /صورة الموظف لازم تكون صورة/)
  const disguised = await upload(users.me, pdf(), 'me.png', { type: 'image/png', query: 'entityType=employee_photo' })
  assert.equal(disguised.status, 400)
  assert.equal((await upload(users.me, png(), 'me.png', { query: 'entityType=employee_photo' })).status, 201)
  const logoPdf = await upload(users.admin, pdf(), 'logo.pdf', { query: 'entityType=company_logo' })
  assert.equal(logoPdf.status, 403); assert.match(messageOf(logoPdf), /شعار الشركة/)
  assert.equal((await upload(users.admin, png(), 'logo.png', { query: 'entityType=company_logo' })).status, 201)
})

test('FU-07 (CRP2A-B02): النوع من بنية الحاوية — ZIP بتعليق «word/document.xml» مش Word، وExcel قديم متسمي .doc مش Word، ومفيش حاجة اتكتبت', async () => {
  const { zip, oldExcel, oldWord, wordPackage } = require('./fixtures/office-containers.cjs')
  await setConfig('files.allowed_types', 'docx')
  try {
    const [rows, files] = [await rowCount(), diskFiles()]
    // حالة المراجعة بالحرف: أرشيف صحيح فيه readme.txt وتعليقه اسم جزء Word، باسم not-word.docx
    const archive = new JSZip(); archive.file('readme.txt', 'Harmless non-Office archive; no document part.'); archive.comment = 'word/document.xml'
    const commented = await upload(users.me, await archive.generateAsync({ type: 'nodebuffer' }), 'not-word.docx', { type: 'application/zip' })
    assert.equal(commented.status, 400); assert.match(messageOf(commented), /محتوى الملف مش من الأنواع المسموحة \(Word\)/)
    const handmade = await upload(users.me, zip([['readme.txt', 'word/document.xml']], { comment: '[Content_Types].xml word/document.xml' }), 'not-word.docx')
    assert.equal(handmade.status, 400)
    assert.deepEqual([await rowCount(), diskFiles()], [rows, files])
    // Word الحقيقي (من مكتبة، ومبني بالبايت) لسه بيتقبل
    assert.equal((await upload(users.me, await docx(), 'real.docx')).status, 201)
    assert.equal((await upload(users.me, wordPackage({ deflate: true }), 'minimal.docx')).status, 201)
  } finally { await setConfig('files.allowed_types', 'jpeg,png,webp,pdf,doc,docx,xls,xlsx') }
  // Word القديم بس مسموح: Excel قديم متسمي .doc نوعه الحقيقي Excel (مقفول)، وحاوية OLE تانية مش من الأنواع
  await setConfig('files.allowed_types', 'doc')
  try {
    const [rows, files] = [await rowCount(), diskFiles()]
    const sheet = await upload(users.me, oldExcel(), 'renamed.doc')
    assert.equal(sheet.status, 400); assert.match(messageOf(sheet), /نوع الملف \(Excel قديم \(\.xls\)\) مش مسموح — المسموح: Word قديم \(\.doc\)/)
    const installer = await upload(users.me, require('./fixtures/office-containers.cjs').ole(['!_StringPool', '!_Tables']), 'setup.doc')
    assert.equal(installer.status, 400); assert.match(messageOf(installer), /محتوى الملف مش من الأنواع المسموحة/)
    assert.deepEqual([await rowCount(), diskFiles()], [rows, files])
    const word = await upload(users.me, oldWord(), 'old.doc')
    assert.equal(word.status, 201, JSON.stringify(word.body)); assert.equal(word.body.mime, 'application/msword')
  } finally { await setConfig('files.allowed_types', 'jpeg,png,webp,pdf,doc,docx,xls,xlsx') }
})

test('FU-08 (CRP2B-A-B01): الرفع الفعلي — نوع ماكرو بتصريح Word جوه تعليق XML مش Word، ومجلد OLE اسمه WordDocument مش Word، والسليم لسه بيتقبل', async () => {
  const { ole, officePackage, relationships, wordPackage, oldWord, WORD_MAIN, TYPES_OPEN } = require('./fixtures/office-containers.cjs')
  const MACRO = 'application/vnd.ms-word.document.macroEnabled.main+xml', MAIN = 'word/document.xml'
  const override = type => `<Override PartName="/${MAIN}" ContentType="${type}"/>`
  const types = inner => `${TYPES_OPEN}${inner}</Types>`
  const word = options => officePackage(MAIN, WORD_MAIN, { body: '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>', deflate: true, ...options })
  await setConfig('files.allowed_types', 'docx')
  try {
    const [rows, files] = [await rowCount(), diskFiles()]
    // الضابط: النوع الفعلي ماكرو = مرفوض. حالة المراجعة بالحرف: نفس الحزمة وتصريح Word جوه تعليق XML
    const refused = [
      ['macro.docx', word({ types: types(override(MACRO)) })],
      ['commented-macro.docx', word({ types: types(override(MACRO) + `<!-- ${override(WORD_MAIN)} -->`) })],
      // نفس الصنف: CDATA، وقيمة خاصية تانية، وتصريحين، والجزء الطُّعم (العلاقة على جزء ماكرو)، ومن غير علاقة مستند
      ['cdata.docx', word({ types: types(override(MACRO) + `<![CDATA[${override(WORD_MAIN)}]]>`) })],
      ['attribute.docx', word({ types: types(`<Override note=' ContentType="${WORD_MAIN}"' PartName="/${MAIN}" ContentType="${MACRO}"/>`) })],
      ['twice.docx', word({ types: types(override(WORD_MAIN) + override(MACRO)) })],
      ['decoy.docx', word({ types: types(override(WORD_MAIN) + `<Override PartName="/word/macro.xml" ContentType="${MACRO}"/>`), rels: relationships('word/macro.xml'), extra: [['word/macro.xml', '<w:document/>']] })],
      ['no-rels.docx', word({ rels: null })],
    ]
    for (const [name, bytes] of refused) {
      const response = await upload(users.me, bytes, name)
      assert.equal(response.status, 400, `${name}: ${JSON.stringify(response.body)}`)
      assert.match(messageOf(response), /محتوى الملف مش من الأنواع المسموحة \(Word\)/, name)
    }
    assert.deepEqual([await rowCount(), diskFiles()], [rows, files], 'ولا صف ولا ملف اتكتب')
    // السليم: مبني بالبايت، ومن المكتبة، وبتعليق XML فيه نوع ماكرو (مالوش أثر)
    for (const [name, bytes] of [['minimal.docx', wordPackage({ deflate: true })], ['library.docx', await docx()],
      ['comment.docx', word({ types: types(override(WORD_MAIN) + `<!-- ${override(MACRO)} -->`) })]]) {
      const response = await upload(users.me, bytes, name)
      assert.equal(response.status, 201, `${name}: ${JSON.stringify(response.body)}`)
      assert.equal(response.body.mime, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    }
  } finally { await setConfig('files.allowed_types', 'jpeg,png,webp,pdf,doc,docx,xls,xlsx') }
  // Excel من المكتبة الحقيقية (ExcelJS) والمسموح Excel بس
  await setConfig('files.allowed_types', 'xlsx')
  try { assert.equal((await upload(users.me, await xlsx(), 'library.xlsx')).status, 201) } finally { await setConfig('files.allowed_types', 'jpeg,png,webp,pdf,doc,docx,xls,xlsx') }
  await setConfig('files.allowed_types', 'doc')
  try {
    const [rows, files] = [await rowCount(), diskFiles()]
    // حالة المراجعة بالحرف: مجلد (مش تيار) اسمه WordDocument. ونفس الصنف: تيار جوه مجلد، وتيار فاضي، وحاوية مقصوصة
    for (const [name, bytes] of [['storage.doc', ole([{ name: 'WordDocument', kind: 'storage' }])],
      ['nested.doc', ole([{ name: 'ObjectPool', kind: 'storage', children: ['WordDocument'] }])],
      ['empty.doc', ole([{ name: 'WordDocument', size: 0 }])],
      ['cut.doc', oldWord().subarray(0, oldWord().length - 1024)]]) {
      const response = await upload(users.me, bytes, name)
      assert.equal(response.status, 400, `${name}: ${JSON.stringify(response.body)}`)
      assert.match(messageOf(response), /محتوى الملف مش من الأنواع المسموحة/, name)
    }
    assert.deepEqual([await rowCount(), diskFiles()], [rows, files])
    assert.equal((await upload(users.me, oldWord(), 'old.doc')).status, 201)
  } finally { await setConfig('files.allowed_types', 'jpeg,png,webp,pdf,doc,docx,xls,xlsx') }
})

function expectOk(response) {
  assert.ok(response.status >= 200 && response.status < 300, JSON.stringify(response.body))
  return response.body ?? {}
}
