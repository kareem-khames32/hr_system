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
    'await this.assertPublicTarget(url)', 'await fetch(url, {'].map(text => deliver.indexOf(text))
  assert.ok(order.every((at, index) => at > 0 && (index === 0 || at > order[index - 1])), JSON.stringify(order))
  assert.match(deliver, /method: 'POST', redirect: 'manual', signal: AbortSignal\.timeout\(WEBHOOK_TIMEOUT_MS\), body,/)
  assert.match(deliver, /if \(response\.status < 200 \|\| response\.status > 299\) throw new Error\(`HTTP \$\{response\.status\}`\)/)
  assert.match(service, /if \(!addresses\.length \|\| addresses\.some\(entry => isPrivateAddress\(entry\.address\)\)\) throw new Error/)
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
