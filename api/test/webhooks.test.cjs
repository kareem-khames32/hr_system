// B6.3 (ج) — الـwebhooks: الأحداث المتاحة، سر التوقيع المختوم، التوقيع والتحقق، فحص عنوان الاستقبال (ضد العناوين الداخلية)، ومصدر الكود
// (التوزيع والإرسال على الطابور القايم، إعادة الحكم وقت الإرسال، من غير تتبّع تحويل، وحدث تعديل الموظف جوه معاملته). حساب نقي بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const hooks = require('../src/integrations/webhooks')
const { DOMAIN_EVENTS } = require('../src/queue/outbox')
const read = rel => fs.readFileSync(path.join(apiRoot, 'src', rel), 'utf8').replace(/\r\n/g, '\n')

test('WHU-01: الأحداث — أربعة أحداث من أحداث النظام المسجّلة، وحدث «تعديل موظف» جديد؛ والقايمة المطلوبة من المعروف بس', () => {
  assert.deepEqual(hooks.WEBHOOK_EVENTS, { EMPLOYEE_HIRED: 'employee.hired', EMPLOYEE_UPDATED: 'employee.updated', EMPLOYEE_TERMINATED: 'employee.terminated', PAYROLL_RUN_APPROVED: 'payroll.approved' })
  for (const type of Object.keys(hooks.WEBHOOK_EVENTS)) assert.ok(DOMAIN_EVENTS[type], type)
  assert.equal(DOMAIN_EVENTS.EMPLOYEE_UPDATED, 'بيانات الموظف اتعدّلت')
  assert.deepEqual([hooks.cleanWebhookEvents(['payroll.approved', 'employee.hired']), hooks.cleanWebhookEvents([]), hooks.cleanWebhookEvents(['employee.deleted']), hooks.cleanWebhookEvents('employee.hired')],
    [{ events: ['employee.hired', 'payroll.approved'], issue: null }, { events: [], issue: 'اختار حدث واحد على الأقل' }, { events: [], issue: 'حدث مش معروف' }, { events: [], issue: 'اختار حدث واحد على الأقل' }])
  assert.deepEqual([hooks.storedWebhookEvents('["employee.hired","x"]'), hooks.storedWebhookEvents('broken')], [['employee.hired'], []])
})

test('WHU-02: السر والتوقيع — السر بيتخزن مختوم وبيتفك بسر الخادم نفسه بس؛ التوقيع HMAC على «الوقت.الجسم»، والتحقق بيرفض جسم اتغيّر أو وقت قديم', () => {
  const secret = hooks.generateWebhookSecret(), server = 'server-secret-one'
  assert.match(secret, /^whsec_[a-f0-9]{48}$/)
  const sealed = hooks.sealWebhookSecret(secret, server)
  assert.deepEqual([sealed.includes(secret), sealed.split('.').length, sealed.length <= 300, hooks.openWebhookSecret(sealed, server), hooks.openWebhookSecret(sealed, 'another-server-secret'), hooks.openWebhookSecret('x', server),
    hooks.openWebhookSecret(sealed.slice(0, -4) + 'AAAA', server)], [false, 4, true, secret, null, null, null])
  assert.notEqual(hooks.sealWebhookSecret(secret, server), sealed)
  const body = hooks.webhookBody({ eventId: '77', type: 'employee.hired', occurredAt: '2026-10-09T10:00:00.000Z', data: { employeeId: 5 } })
  assert.equal(body, '{"id":"evt_77","type":"employee.hired","occurredAt":"2026-10-09T10:00:00.000Z","data":{"employeeId":5}}')
  const at = 1_800_000_000, header = hooks.signatureHeader(secret, at, body)
  assert.equal(header, `t=${at},v1=${crypto.createHmac('sha256', secret).update(`${at}.${body}`).digest('hex')}`)
  assert.deepEqual([hooks.verifySignature(secret, header, body, at), hooks.verifySignature(secret, header, body, at + 300), hooks.verifySignature(secret, header, body, at + 301), hooks.verifySignature(secret, header, body + ' ', at),
    hooks.verifySignature(hooks.generateWebhookSecret(), header, body, at), hooks.verifySignature(secret, 'v1=abc', body, at), hooks.verifySignature(secret, null, body, at)], [true, true, false, false, false, false, false])
})

test('WHU-03: عنوان الاستقبال — https بس واسم نطاق عام؛ العناوين الداخلية والمحلية مرفوضة (IPv4 وIPv6)، و«محلي مسموح» للتطوير والاختبار بس', () => {
  for (const address of ['10.0.0.1', '127.0.0.1', '172.16.5.4', '172.31.255.255', '192.168.1.10', '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1', '::1', '::', 'fc00::1', 'fd12:3456::1', 'fe80::1', '::ffff:10.0.0.1', '[::1]', 'not-an-ip'])
    assert.equal(hooks.isPrivateAddress(address), true, address)
  for (const address of ['8.8.8.8', '172.32.0.1', '172.15.0.1', '100.63.0.1', '1.1.1.1', '2001:4860:4860::8888', '::ffff:8.8.8.8']) assert.equal(hooks.isPrivateAddress(address), false, address)
  const issue = (url, allowLocal = false) => hooks.targetIssue(url, allowLocal)
  assert.deepEqual([issue('https://hooks.example.com/hr'), issue('https://8.8.8.8/hr'), issue('http://127.0.0.1:9000/hook', true), issue('https://localhost/hook', true)], [null, null, null, null])
  assert.deepEqual([issue('http://hooks.example.com/hr'), issue('ftp://hooks.example.com/hr'), issue('https://localhost/hook'), issue('https://intranet/hook'), issue('https://db.internal/hook'), issue('https://10.0.0.5/hook'),
    issue('https://[::1]/hook'), issue('https://169.254.169.254/latest'), issue('https://user:pass@hooks.example.com/hr'), issue('https://hooks.example.com/hr#x'), issue('nope'), issue(5), issue('https://a.co/' + 'x'.repeat(500))],
  ['عنوان نقطة الاستقبال لازم يبدأ بـhttps://', 'عنوان نقطة الاستقبال لازم يبدأ بـhttps://', 'عنوان نقطة الاستقبال لازم يكون اسم نطاق عام', 'عنوان نقطة الاستقبال لازم يكون اسم نطاق عام', 'عنوان نقطة الاستقبال لازم يكون اسم نطاق عام',
    'عنوان نقطة الاستقبال ماينفعش يكون عنوان داخلي', 'عنوان نقطة الاستقبال ماينفعش يكون عنوان داخلي', 'عنوان نقطة الاستقبال ماينفعش يكون عنوان داخلي', 'العنوان من غير اسم مستخدم ولا كلمة سر', 'العنوان من غير #',
    'عنوان نقطة الاستقبال من 10 لحد 500 حرف', 'عنوان نقطة الاستقبال من 10 لحد 500 حرف', 'عنوان نقطة الاستقبال من 10 لحد 500 حرف'])
})

test('WHU-04: مصدر الكود — مستهلك على الطابور القايم، إعادة الحكم وقت الإرسال، من غير تتبّع تحويل وبمهلة وبعد حل الاسم، والإدارة بصلاحيتها ولحساب بكل الفروع، وحدث التعديل جوه معاملته', () => {
  const service = read('integrations/webhooks.service.ts'), controller = read('integrations/integrations.controller.ts'), employees = read('employees/employees.service.ts')
  // على الطابور والـoutbox القايمين: اشتراك في الأحداث الأربعة، ومهمة إرسال لكل نقطة بمفتاح منع تكرار، وإعادة محاولة من الطابور
  assert.match(service, /for \(const type of Object\.keys\(WEBHOOK_EVENTS\) as DomainEventType\[\]\) this\.queue\.subscribe\(type, WEBHOOK_FANOUT_JOB\)/)
  assert.match(service, /this\.queue\.registerHandler\(WEBHOOK_DELIVER_JOB, [^\n]+, \{ maxAttempts: WEBHOOK_DELIVER_MAX_ATTEMPTS \}\)/)
  assert.match(service, /this\.ds\.transaction\(em => this\.queue\.enqueue\(em, \{ jobType: WEBHOOK_DELIVER_JOB, payload, key: `webhook:\$\{event\.id\}:\$\{endpoint\.id\}` \}\)\)/)
  // الإرسال: الموديول والنقطة والاشتراك والنطاق بيتحكموا تاني، وبعدهم السر والعنوان وحل الاسم، وبعدين الإرسال
  const deliver = service.slice(service.indexOf('async deliver('))
  const order = [`this.modules.isEnabled('integrations')`, '!endpoint?.isActive', 'await this.inScope(storedBranchScope(endpoint.branchIds), payload.type, payload.data)', 'openWebhookSecret(endpoint.secret', 'targetIssue(endpoint.url, this.allowLocal())',
    'const pinned = await this.pinnedTarget(url)', 'await postPinned(url, pinned, {'].map(text => deliver.indexOf(text))
  assert.ok(order.every((at, index) => at > 0 && (index === 0 || at > order[index - 1])), JSON.stringify(order))
  // CRP6A-B04: الإرسال على العنوان المثبّت (اللي اتفحص) — مفيش fetch بيحل الاسم تاني
  assert.doesNotMatch(service, /\bfetch\(/)
  assert.match(deliver, /\}, body, WEBHOOK_TIMEOUT_MS\)\n      if \(status < 200 \|\| status > 299\) throw new Error\(`HTTP \$\{status\}`\)/)
  assert.match(service, /if \(!addresses\.length \|\| \(!this\.allowLocal\(\) && addresses\.some\(entry => isPrivateAddress\(entry\.address\)\)\)\) throw new Error/)
  assert.match(service, /return \{ address: addresses\[0\]\.address, family: addresses\[0\]\.family \}/)
  // «محلي مسموح» متغير بيئة ومش في الإنتاج — مش إعداد من جوه النظام
  assert.match(service, /return process\.env\.HR_WEBHOOKS_ALLOW_LOCAL === '1' && process\.env\.NODE_ENV !== 'production'/)
  // الرسالة مراجع بس: مفيش قراءة اسم ولا راتب ولا هوية في الخدمة
  assert.doesNotMatch(service, /fullName|salary|Salary|nationalId|iban|\[phone\]|netPay/)
  // الإدارة: الصلاحية و«كل الفروع»، والسر في رد الإنشاء بس ومابيرجعش في القايمة
  assert.equal((controller.match(/@Perm\('integrations\.manage'\)/g) || []).length, 6)
  assert.equal((service.match(/assertCompanyWideWrite\(user\)/g) || []).length, 3)
  assert.match(service, /return \{ \.\.\.view\(row\), secret \}/)
  assert.doesNotMatch(service.slice(service.indexOf('const view = '), service.indexOf('@Injectable()')), /secret/)
  // حدث «تعديل موظف» جوه معاملة التعديل نفسها
  const update = employees.slice(employees.indexOf('  async update(id: number, dto: UpdateEmployeeDto'), employees.indexOf('\n  // الأرشفة بدل الحذف'))
  const inside = update.slice(0, update.indexOf('      return result\n    })'))
  assert.match(inside, /await recordOutboxEvent\(em, \{ type: 'EMPLOYEE_UPDATED', entityType: 'employee', entityId: id, payload: \{ employeeId: id, branchId: result\.branchId \?\? null \} \}\)\s*$/)
})

test('WHU-05 (CRP6A-B04): الإرسال المثبّت — الاتصال بيروح للعنوان اللي اتفحص حتى لو الاسم مابيتحلش أو بيتحل لحاجة تانية، والاسم بيفضل في Host، ومن غير تتبّع تحويل', async () => {
  const http = require('node:http')
  const seen = []
  const server = http.createServer((request, response) => {
    const chunks = []
    request.on('data', chunk => chunks.push(chunk))
    request.on('end', () => {
      seen.push({ method: request.method, url: request.url, host: request.headers.host, event: request.headers['x-hr-event'], body: Buffer.concat(chunks).toString('utf8') })
      if (request.url.startsWith('/moved')) { response.writeHead(302, { Location: 'http://127.0.0.1:1/elsewhere' }); response.end(); return }
      response.writeHead(204); response.end()
    })
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  try {
    // اسم مابيتحلش أصلًا: الطلب بيوصل للعنوان المثبّت — يعني مفيش حل اسم وقت الاتصال
    const status = await hooks.postPinned(new URL(`http://hooks.example.invalid:${port}/hook?x=1`), { address: '127.0.0.1', family: 4 }, { 'Content-Type': 'application/json', 'X-HR-Event': 'employee.hired' }, '{"a":1}', 3000)
    assert.deepEqual([status, seen[0]], [204, { method: 'POST', url: '/hook?x=1', host: `hooks.example.invalid:${port}`, event: 'employee.hired', body: '{"a":1}' }])
    // تحويل: بيرجع برقمه ومابيتتبعش
    assert.equal(await hooks.postPinned(new URL(`http://hooks.example.invalid:${port}/moved`), { address: '127.0.0.1', family: 4 }, {}, '{}', 3000), 302)
    assert.equal(seen.length, 2)
    // عنوان مثبّت مفيش حد سامع عليه: فشل (مابيرجعش للاسم)
    await assert.rejects(hooks.postPinned(new URL('http://localhost:' + port + '/hook'), { address: '127.0.0.1', family: 4 }, {}, '{}', 3000).then(() => hooks.postPinned(new URL('http://hooks.example.invalid:1/hook'), { address: '127.0.0.1', family: 4 }, {}, '{}', 2000)))
  } finally { await new Promise(resolve => server.close(resolve)) }
})

test('WHU-06 (CRP6B، P6B-B01): الإرسال المثبّت مابيعلّقش — رد متقطع بعد الترويسة بيتحسم برقم حالته فورًا، ومستقبِل مابيردّش بيتحسم بالمهلة، وانقطاع قبل الرد بيتحسم بخطأ', async () => {
  const http = require('node:http')
  const sockets = new Set()
  const server = http.createServer((request, response) => {
    request.resume()
    if (request.url === '/partial') { response.writeHead(200, { 'Content-Length': '1000' }); response.write('جزء'); setTimeout(() => request.socket.destroy(), 30); return }
    if (request.url === '/silent') return
    if (request.url === '/drop') { request.socket.destroy(); return }
    response.writeHead(200); response.end('ok')
  })
  server.on('connection', socket => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)) })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port, pinned = { address: '127.0.0.1', family: 4 }
  const timed = async work => { const started = Date.now(); try { return { value: await work(), ms: Date.now() - started } } catch (error) { return { error: String(error.message), ms: Date.now() - started } } }
  try {
    const partial = await timed(() => hooks.postPinned(new URL(`http://hooks.example.invalid:${port}/partial`), pinned, {}, '{}', 4000))
    assert.deepEqual([partial.value, partial.ms < 1500], [200, true], JSON.stringify(partial))
    const silent = await timed(() => hooks.postPinned(new URL(`http://hooks.example.invalid:${port}/silent`), pinned, {}, '{}', 400))
    assert.deepEqual([silent.error, silent.ms >= 350 && silent.ms < 2000], ['انتهت مهلة نقطة الاستقبال', true], JSON.stringify(silent))
    const dropped = await timed(() => hooks.postPinned(new URL(`http://hooks.example.invalid:${port}/drop`), pinned, {}, '{}', 4000))
    assert.deepEqual([typeof dropped.error, dropped.ms < 1500], ['string', true], JSON.stringify(dropped))
    // وبعد كل ده الإرسال العادي لسه شغال
    assert.equal(await hooks.postPinned(new URL(`http://hooks.example.invalid:${port}/ok`), pinned, {}, '{}', 4000), 200)
  } finally { for (const socket of sockets) socket.destroy(); await new Promise(resolve => server.close(resolve)) }
  const source = read('integrations/webhooks.ts')
  assert.doesNotMatch(source, /response\.on\('end'/, 'مفيش انتظار لآخر الجسم')
  assert.match(source, /deadline = setTimeout\(expired, timeoutMs\)/)
})
