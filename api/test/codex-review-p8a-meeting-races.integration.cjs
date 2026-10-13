'use strict'
// B-ADD.23: الاتصال من جوه النظام على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر (hr_meet_calls_test_<16 hex>)، عبر HTTP بتوكنات موقّعة محليًا
// ومن غير كلمات مرور. خادم الاجتماعات (LiveKit) خادم HTTP وهمي على 127.0.0.1 بيسجّل النداءات — مفيش أي اتصال بخادم حقيقي ولا مكالمة حقيقية.
//  MC-01) الموديول مقفول = المسارات مقفولة. وترحيل 198: قبله السجل فاضي بالسبب والاتصال برسالة الترحيل والاجتماعات شغالة عادي؛ والملف بيعمل الجدول
//         بنفس شكل synchronize وفرقها صفر، وآمن للتكرار، وشكل تاني بيوقّفه. ومن غير إعداد الخادم: رسالة واضحة.
//  MC-02) قبل ترحيل 188 (من غير خانة التحويلة): الاتصال بالاسم شغال، والاتصال بالتحويلة بيقول إن الخانة محتاجة ترحيلها.
//  MC-03) الاتصال بالتحويلة: بيرن عند صاحبها بس (باسم المتصل وتحويلته)، مالوش صف اجتماع، والرد وتذكرة كل طرف (من غير إدارة غرفة)، والقفل بينهيها
//         للاتنين على الخادم؛ والحساب التالت مالوش تذكرة ولا حالة ولا بيشوفها في أي قايمة؛ والسجل للطرفين بس.
//  MC-04) تحويلة مش عند حد (أو صاحبها من غير حساب نشط) بنفس الرد، والاتصال بالنفس مرفوض، والقيم، وحساب مالوش وجود — ومن غير بيانات موظف.
//  MC-05) الاتصال بالاسم، و«مشغول» من غير ما يتقال مع مين، والرفض، وإلغاء المتصل قبل الرد، واتصالين في نفس اللحظة.
//  MC-06) محدش رد: بعد مدة الرنة المكالمة فايتة (المدة متحقونة للاختبار).
//  MC-07) مكالمة اتردّ عليها ومحدش قفلها: غرفتها الفاضية على الخادم = انتهت، واللي لسه فيها حد = مشغول؛ والموديول لما يتقفل.
// Run (من api/): node --test test/meet-calls.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), crypto = require('node:crypto')
const { disposableApp, apiRoot } = require('./helpers/disposable-app.cjs')
const { moduleTools } = require('./helpers/modules.cjs')
const migrate = require('../scripts/db-migrate.cjs')
const sql = require('../node_modules/mssql')
const rules = require('../src/meet/call-rules')
const meetRules = require('../src/meet/meet-rules')
const FILE = path.join(apiRoot, '..', 'docs/migrations/payroll/20261012_198_meet_calls.sql')
const FILE_188 = path.join(apiRoot, '..', 'docs/migrations/payroll/20261012_188_employee_work_extension.sql')
const LK = { key: `APItest${crypto.randomBytes(6).toString('hex')}`, secret: crypto.randomBytes(32).toString('hex') }
const extra = {}
const t = disposableApp('meet_calls', extra)
const U = {}, E = {}
let fake, pool, modules, service, branch, number = 0, down = false
// الخادم الوهمي: النداءات اللي وصلته، واللي جوه كل غرفة
const calls = [], present = new Map()
const C = '/meet/calls'
const call = (id, tail = '') => `${C}/${id}${tail}`
const messageOf = response => [].concat(response.body?.message ?? []).join('، ')
const coded = response => [response.status, response.body?.code, messageOf(response)]
const get = async (user, route) => t.expectStatus(await t.request(user, 'GET', route), 200)
const post = (user, route, body) => t.request(user, 'POST', route, body)
const ok = async (user, route, body) => t.expectStatus(await post(user, route, body), 200)
const dial = async (user, body) => t.expectStatus(await post(user, C, body), 201)
const stateOf = async (user, id) => (await get(user, call(id))).state
const ringingAt = async user => (await get(user, '/meet/inbox')).calls.map(row => row.id)
const decode = token => {
  const [head, body, signature] = token.split('.')
  assert.equal(crypto.createHmac('sha256', LK.secret).update(`${head}.${body}`).digest('base64url'), signature, 'التوقيع بسر الخادم')
  return JSON.parse(Buffer.from(body, 'base64url').toString())
}
const person = (key, extension = E[key]?.extension ?? null) => ({ id: U[key].id, displayName: U[key].displayName, jobTitle: E[key]?.jobTitle ?? null, extension })
const account = async (key, displayName, jobTitle, extension, overrides = {}) => {
  if (jobTitle !== null) {
    E[key] = await t.repo('Employee').save({ employeeCode: `MC${String(++number).padStart(3, '0')}`, fullName: displayName, branchId: branch.id, jobTitle, nationalId: `SECRET-ID-${number}`, phone: '0500000000',
      joinDate: '2020-01-01', basicSalary: 6000, status: 'active', isActive: true, payMethod: 'cash' })
    if (extension) await t.query('UPDATE dbo.employees SET [workExtension] = @0 WHERE [id] = @1', [extension, E[key].id])
    E[key].extension = extension
  }
  if (overrides.none) return null
  U[key] = await t.user({ email: `${key}@meet-calls.invalid`, displayName, role: 'employee', permissions: '[]', branchId: branch.id, employeeId: E[key]?.id ?? null, isActive: true, ...overrides })
  return U[key]
}
const shape = async () => ({
  columns: await t.query(`SELECT c.name AS columnName, ty.name AS type, c.max_length AS maxLength, c.is_nullable AS nullable, c.is_identity AS isIdentity
    FROM sys.columns c JOIN sys.types ty ON ty.user_type_id = c.user_type_id WHERE c.object_id = OBJECT_ID(N'dbo.meet_calls') ORDER BY c.column_id`),
  indexes: await t.query(`SELECT i.name, i.is_unique AS isUnique, i.has_filter AS hasFilter,
      STUFF((SELECT ',' + c.name FROM sys.index_columns ic JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
        WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id ORDER BY ic.key_ordinal FOR XML PATH('')), 1, 1, '') AS [columns]
    FROM sys.indexes i WHERE i.object_id = OBJECT_ID(N'dbo.meet_calls') AND i.name IS NOT NULL ORDER BY i.name`),
})
const content = file => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
const runFile = async file => { for (const batch of migrate.splitBatches(content(file))) await pool.request().batch(batch) }
const rowOf = id => t.repo('MeetCall').findOneByOrFail({ code: id })
const idle = async () => { await t.repo('MeetCall').update({ endedAt: require('../node_modules/typeorm').IsNull() }, { endedAt: new Date() }) }

before(async () => {
  fake = http.createServer((req, res) => {
    let raw = ''
    req.on('data', chunk => { raw += chunk })
    req.on('end', () => {
      const method = req.url.replace('/twirp/livekit.RoomService/', ''), body = raw ? JSON.parse(raw) : {}
      calls.push({ method, body, auth: String(req.headers.authorization ?? '') })
      const reply = (status, json) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(json)) }
      if (down) return reply(500, { code: 'internal', msg: 'down' })
      if (method === 'ListRooms') return reply(200, { rooms: body.names.filter(name => present.has(name)).map(name => ({ name, numParticipants: present.get(name).size })) })
      if (method === 'DeleteRoom') { present.delete(body.room); return reply(200, {}) }
      return reply(404, { code: 'not_found', msg: 'unexpected' })
    })
  })
  await new Promise(resolve => fake.listen(0, '127.0.0.1', resolve))
  Object.assign(extra, { LIVEKIT_URL: `ws://127.0.0.1:${fake.address().port}`, LIVEKIT_HTTP_URL: '', LIVEKIT_API_KEY: LK.key, LIVEKIT_API_SECRET: LK.secret })
  await t.start()
  assert.match(t.database, migrate.DISPOSABLE_DATABASE)
  modules = moduleTools(t.app)
  service = t.app.get(require('../src/meet/meet-calls.service').MeetCallsService)
  const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
  pool = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: t.database, options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 10000, requestTimeout: 120000 }).connect()
  branch = await t.repo('Branch').save({ code: 'MC_A', name: 'فرع المكالمات', country: 'SA' })
  await account('amal', 'أمل المتصلة', 'مديرة مبيعات', '1001')
  await account('basem', 'باسم المطلوب', 'محاسب', '1002')
  await account('camelia', 'كاميليا التالتة', 'مهندسة', '0105')
  await account('dina', 'دينا من غير تحويلة', 'مصممة', null)
  await account('ghost', 'موظف من غير حساب', 'فني', '2001', { none: true })
  await account('stopped', 'حساب موقوف', 'سابق', '2002', { isActive: false })
  await account('bare', 'حساب من غير موظف', null, null)
  U.admin = await t.user({ displayName: 'مدير النظام', scopeAllBranches: true, isActive: true })
}, { timeout: 180000 })
after(async context => {
  const errors = []
  try { if (pool) await pool.close() } catch (error) { errors.push(error) }
  try { if (fake) await new Promise(resolve => { fake.closeAllConnections?.(); fake.close(resolve) }) } catch (error) { errors.push(error) }
  await t.stop(context)
  if (errors.length) context.diagnostic(errors.map(error => error.message).join(' | '))
})


test('P8A-M01: call closed before token issuance still yields a signed join grant',async()=>{
  await modules.enable('meet')
  const dialed=await dial(U.amal,{userId:U.basem.id})
  await ok(U.basem,call(dialed.id,'/accept'))
  const original=service.people
  let hit=false
  service.people=async function(...args) {
    if(!hit) {hit=true; await ok(U.basem,call(dialed.id,'/hangup'))}
    return original.apply(this,args)
  }
  let result
  try {result=await post(U.amal,call(dialed.id,'/token'))} finally {service.people=original}
  assert.equal(hit,true)
  assert.ok((await rowOf(dialed.id)).endedAt)
  assert.equal(result.status,200)
  const jwt=decode(result.body.token)
  assert.equal(jwt.video.roomJoin,true)
  assert.equal(jwt.exp-jwt.nbf,7200)
  const freshStatus=(await post(U.amal,call(dialed.id,'/token'))).status;assert.equal(freshStatus,410)
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'P8A-M01',ended:true,status:result.status,roomJoin:jwt.video.roomJoin,ttl:jwt.exp-jwt.nbf,freshStatus}))
})
test('P8A-M02: meeting ended before token issuance still yields a signed join grant',async()=>{
  const ms=t.app.get(require('../src/meet/meet.service').MeetService)
  const meeting=t.expectStatus(await post(U.amal,'/meet/rooms',{title:'P8A end race',inviteUserIds:[U.basem.id]}),201)
  const original=ms.people; let hit=false
  ms.people=async function(...args){
    if(!hit){hit=true;await ok(U.amal,'/meet/rooms/'+meeting.id+'/end')}
    return original.apply(this,args)
  }
  let result
  try { result=await post(U.basem,'/meet/rooms/'+meeting.id+'/token') }finally{ms.people=original}
  assert.equal(hit,true); assert.equal(result.status,200)
  assert.equal(decode(result.body.token).video.roomJoin,true)
  const freshStatus=(await post(U.basem,'/meet/rooms/'+meeting.id+'/token')).status;assert.equal(freshStatus,410)
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'P8A-M02',ended:true,status:result.status,roomJoin:true,freshStatus}))
})
