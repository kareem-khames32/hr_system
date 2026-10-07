// B2.7 (أ): مكتبة السياسات وبوابة الإقرار — القواعد الصافية، وعميل الـAPI على مسارات الخادم، وربط البوابة في الواجهة (التحويل بكود الخادم،
// والفحص مرة مع كل دخول، وشاشة الإقرار والقارئ)، والقايمة الجانبية وصلاحيات المسارات، وملف السياسة بالتدفق. اختبارات نقية بلا قاعدة بيانات.
// Run (من api/): node --test test/policies-ui.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true, compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const root = path.join(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')
const count = (text, part) => text.split(part).length - 1

test('PU-01: القواعد الصافية — النسخة السارية والجاية، وأساس الإقرار، وموعد القفل، وحالة الموظف', () => {
  const rules = require('../src/policies/policy-rules')
  const version = (versionNo, effectiveDate, isMaterial) => ({ id: versionNo * 10, policyId: 1, versionNo, effectiveDate, isMaterial, contentHash: 'x' })
  const versions = [version(1, '2026-01-01', true), version(2, '2026-03-01', false), version(3, '2026-06-01', true), version(4, '2026-09-01', false)]
  // النسخة السارية: أحدث نسخة تاريخها جه (يوم السريان نفسه محسوب)
  assert.deepEqual(['2025-12-31', '2026-01-01', '2026-05-31', '2026-06-01', '2026-12-01'].map(today => rules.currentPolicyVersion(versions, today)?.versionNo ?? null), [null, 1, 2, 3, 4])
  // والجاية: أول نسخة لسه تاريخها ماجاش (مش آخر واحدة منشورة)
  assert.deepEqual(['2025-12-31', '2026-01-01', '2026-03-01', '2026-08-31', '2026-09-01'].map(today => rules.upcomingPolicyVersion(versions, today)?.versionNo ?? null), [1, 2, 3, 4, null])
  // أساس الإقرار: آخر نسخة سارية عليها «تغيير جوهري»
  assert.deepEqual(['2025-12-31', '2026-02-01', '2026-05-31', '2026-06-01', '2026-12-01'].map(today => rules.baselinePolicyVersion(versions, today)?.versionNo ?? null), [null, 1, 1, 3, 3])
  // من غير أي نسخة جوهرية: أقدم نسخة سارية هي الأساس
  assert.equal(rules.baselinePolicyVersion([version(1, '2026-01-01', false), version(2, '2026-02-01', false)], '2026-03-01').versionNo, 1)
  // موعد القفل: الأبعد من (سريان الأساس، تعيين الموظف، يوم بداية الإلزام) + المهلة؛ ومهلة صفر = نفس اليوم
  assert.deepEqual([rules.policyLockDate('2026-06-01', '2020-01-01', 7), rules.policyLockDate('2026-06-01', '2026-06-20', 7), rules.policyLockDate('2026-06-01', null, 0),
    rules.policyLockDate('2026-06-01', '2026-06-01', 0), rules.policyLockDate('2026-12-28', null, 5), rules.policyLockDate('2026-06-01', null, -3),
    rules.policyLockDate('2026-06-01', '2026-06-20', 7, '2026-07-10'), rules.policyLockDate('2026-06-01', '2026-06-20', 7, '2026-05-01'), rules.policyLockDate('2026-06-01', undefined, 2, null)],
  ['2026-06-08', '2026-06-27', '2026-06-01', '2026-06-01', '2027-01-02', '2026-06-01', '2026-07-17', '2026-06-27', '2026-06-03'])
  // الحالة: أقرّ بنسخة الأساس أو بعدها = أقرّ؛ بنسخة قبلها = لسه/متأخر؛ ويوم موعد القفل نفسه متأخر
  const state = (acknowledged, today, grace = 7, join = '2020-01-01', mandatory, graceFrom) => rules.policyAckState(versions, acknowledged, join, grace, today, mandatory, graceFrom)
  assert.deepEqual([state([3], '2026-12-01'), state([4], '2026-12-01'), state([1, 2], '2026-12-01'), state([], '2026-06-07'), state([], '2026-06-08'), state([2], '2026-05-01'),
    state([], '2025-06-01'), state([], '2026-06-05', 0)],
  [{ state: 'ACKNOWLEDGED', lockDate: null }, { state: 'ACKNOWLEDGED', lockDate: null }, { state: 'OVERDUE', lockDate: '2026-06-08' }, { state: 'PENDING', lockDate: '2026-06-08' },
    { state: 'OVERDUE', lockDate: '2026-06-08' }, { state: 'ACKNOWLEDGED', lockDate: null }, null, { state: 'OVERDUE', lockDate: '2026-06-01' }])
  // السياسة بقت إلزامية (أو جمهورها اتغيّر) بعد سريان النسخة: المهلة من يومها، فمحدش بيتقفل بمهلة خلصت قبل ما الإلزام يبدأ
  assert.deepEqual([state([], '2026-12-01', 7, '2020-01-01', true, '2026-12-01'), state([], '2026-12-08', 7, '2020-01-01', true, '2026-12-01')],
    [{ state: 'PENDING', lockDate: '2026-12-08' }, { state: 'OVERDUE', lockDate: '2026-12-08' }])
  // غير الإلزامية: من غير مهلة ولا قفل
  assert.deepEqual([state([], '2026-12-01', 0, '2020-01-01', false), state([3], '2026-12-01', 0, '2020-01-01', false)], [{ state: 'PENDING', lockDate: null }, { state: 'ACKNOWLEDGED', lockDate: null }])
  // البصمة sha256 للنص بترميز UTF-8 أو لبايتات الملف
  assert.equal(rules.policyContentHash('نص السياسة'), crypto.createHash('sha256').update('نص السياسة', 'utf8').digest('hex'))
  assert.equal(rules.policyContentHash(Buffer.from([1, 2, 3])), crypto.createHash('sha256').update(Buffer.from([1, 2, 3])).digest('hex'))
  assert.deepEqual(['2026-02-28', '2026-02-30', '2026-13-01', '26-01-01', 20260101, null].map(rules.isPolicyDate), [true, false, false, false, false, false])
  assert.deepEqual([rules.policyAddDays('2026-02-27', 2), rules.policyAddDays('2028-02-28', 1), rules.policyLocalDate(new Date(2026, 0, 5, 23, 59))], ['2026-03-01', '2028-02-29', '2026-01-05'])
  // حد النص جوه حجم الطلب (100 ك.ب) حتى لو كل حرف 3 بايت
  assert.ok(rules.POLICY_BODY_MAX * 3 < 100 * 1024)
})

test('PU-02: عميل الـAPI على مسارات الخادم نفسها وبنفس الحدود، والمسارات الثابتة قبل ‎:id، والمسارات المسموحة والحساب مقفول', () => {
  const ui = require('../../src/lib/policies-api')
  const rules = require('../src/policies/policy-rules')
  assert.deepEqual([ui.POLICY_GRACE_MAX, ui.POLICY_BODY_MAX], [rules.POLICY_GRACE_MAX, rules.POLICY_BODY_MAX])
  assert.deepEqual([Object.keys(ui.POLICY_STATUS_LABELS), Object.keys(ui.POLICY_ACK_LABELS)], [['DRAFT', 'PUBLISHED', 'WITHDRAWN'], ['ACKNOWLEDGED', 'PENDING', 'OVERDUE']])
  assert.match(ui.POLICY_ACK_STATEMENT, /إقرار إلكتروني بالاطلاع والموافقة/); assert.match(ui.POLICY_ACK_STATEMENT, /مش توقيع معتمد/)
  assert.deepEqual([1, 2, 3, 10, 11].map(ui.policyCountText), ['سياسة واحدة', 'سياستين', '3 سياسات', '10 سياسات', '11 سياسة'])
  assert.deepEqual([0, 1, 2, 5, 10, 30].map(ui.policyGraceText), ['من غير مهلة', 'مهلة يوم واحد', 'مهلة يومين', 'مهلة 5 أيام', 'مهلة 10 أيام', 'مهلة 30 يوم'])
  const api = read('src/lib/policies-api.ts')
  for (const call of ["apiFetch<ApiPolicies>('/policies')", "send<{ id: number }>('POST', '/policies', input)", "send<{ id: number }>('PATCH', `/policies/${id}`, input)",
    "'POST', `/policies/${id}/versions`, input)", "send<{ id: number }>('POST', `/policies/${id}/withdraw`)", "apiFetch<ApiPolicyReport>(`/policies/${id}/report`)",
    "'/policies/mine')", "'/policies/pending')", "apiFetch<ApiPolicyContent>(`/policies/versions/${versionId}`)", "`/policies/versions/${versionId}/acknowledge`, { contentHash })",
    "`${API_BASE}/policies/versions/${versionId}/file`", "uploadFile(file, { entityType: 'policy' })"]) assert.ok(api.includes(call), call)
  // رسالة الخادم العربي بتتعرض زي ما هي؛ ورسالة الإطار الإنجليزي (خطأ خادم) بتتبدّل بجملة عربي
  assert.ok(api.includes("throw new ApiError(response.status, typeof body.message === 'string' && /[\\u0600-\\u06FF]/.test(body.message) ? body.message : 'تعذر تحميل ملف السياسة')"))
  // والرد اللي اتقطع والملف بيتحمّل برسالة عربي (مش نص المتصفح)
  assert.ok(api.includes("try { file = await response.blob() } catch { throw new ApiError(0, 'تحميل ملف السياسة اتقطع — حاول تاني') }"))
  // سطر الموظف من غير بصمة النسخة (البصمة من قراءة النسخة نفسها)
  assert.match(api, /version: Omit<ApiPolicyVersion, 'contentHash'>/)
  assert.match(read('api/src/policies/policies.service.ts'), /const \{ contentHash: _hash, \.\.\.version \} = this\.versionView\(item\.current\)/)
  const controller = read('api/src/policies/policies.controller.ts')
  // مسارات الموظف الثابتة قبل ‎:id (وإلا «mine» و«pending» و«versions» يتقروا رقم سياسة)
  const order = ["@Get('mine')", "@Get('pending')", "@Get('versions/:versionId')", "@Get('versions/:versionId/file')", "@Post('versions/:versionId/acknowledge')", "@Get(':id')"].map(route => controller.indexOf(route))
  assert.ok(order.every(at => at > 0) && order.every((at, index) => index === 0 || at > order[index - 1]), JSON.stringify(order))
  // القايمة المسموحة والحساب مقفول على إقرار: مسارات الموظف الخمسة، وسحب السياسة لمديرها، و«مين أنا»، والموديولات المفعّلة — ومفيش غيرهم
  assert.equal(count(controller, '@AllowDuringPolicyGate()'), 6)
  for (const [route, method] of [["@Get('mine')", 'mine('], ["@Get('pending')", 'pending('], ["@Get('versions/:versionId')", 'version('], ["@Get('versions/:versionId/file')", 'async versionFile('],
    ["@Post('versions/:versionId/acknowledge')", 'acknowledge(']]) assert.ok(controller.includes(`@AllowDuringPolicyGate()\n  ${route}\n  ${method}`), route)
  assert.ok(controller.includes("@AllowDuringPolicyGate()\n  @Perm('policies.manage')\n  @Post(':id/withdraw')\n  withdraw("))
  const sources = fs.readdirSync(path.join(root, 'api/src'), { recursive: true }).filter(file => String(file).endsWith('.controller.ts')).map(file => [String(file).replace(/\\/g, '/'), read(path.join('api/src', String(file)))])
  assert.deepEqual(sources.filter(([, text]) => text.includes('@AllowDuringPolicyGate()')).map(([file, text]) => [file, count(text, '@AllowDuringPolicyGate()')]).sort(),
    // B2.17: + «بيانات الجلسة» (الواجهة بتجيب منه الحساب ورمز CSRF حتى والحساب مقفول على إقرار)
    // B2.17-ج: + حالة تطبيق المصادقة وتفعيله وتأكيده (صاحب دور إلزامي ومقفول على إقرار برضه لازم يقدر يفعّل)
    [['auth/auth.controller.ts', 5], ['modules-registry/modules.controller.ts', 1], ['policies/policies.controller.ts', 6]])
  assert.match(read('api/src/auth/auth.controller.ts'), /@AllowDuringPolicyGate\(\)\n\s+@Get\('me'\)/)
  assert.match(read('api/src/auth/auth.controller.ts'), /@AllowDuringPolicyGate\(\)\n\s+@Get\('session'\)/)
  assert.match(read('api/src/modules-registry/modules.controller.ts'), /@AllowDuringPolicyGate\(\)\n\s+@Get\('enabled'\)/)
  // والبوابة معترض عام بيرفض بكود، وبيعدّي المعلَّم، ومابيفحصش حساب من غير موظف، وكلمة السر المؤقتة الأول
  const gate = read('api/src/policies/policy-gate.ts')
  assert.match(gate, /if \(user\?\.employeeId && !user\.mustChangePassword\n\s+&& !this\.reflector\.getAllAndOverride<boolean \| undefined>\(ALLOW_DURING_POLICY_GATE, \[ctx\.getHandler\(\), ctx\.getClass\(\)\]\)\n\s+&& await this\.gate\.blocks\(user\)\) \{\n\s+throw new ForbiddenException\(\{ statusCode: 403, code: POLICY_ACK_REQUIRED, message: POLICY_ACK_REQUIRED_MESSAGE \}\)/)
  assert.match(read('api/src/policies/policies.module.ts'), /\{ provide: APP_INTERCEPTOR, useClass: PolicyGateInterceptor \}/)
  // والعلامة بتتحدّث في الخلفية في التشغيل العادي (مش في الاختبارات، زي عامل الطابور)
  assert.match(gate, /await this\.refresh\(\)\n\s+\/\/[^\n]*\n\s+if \(process\.env\.NODE_ENV !== 'test'\) this\.startBackgroundRefresh\(\)/)
  assert.equal(rules.POLICY_ACK_REQUIRED, 'POLICY_ACK_REQUIRED')
})

test('PU-03: ربط البوابة في الواجهة — التحويل بكود الخادم، والفحص مرة مع كل دخول، وشاشة الإقرار والقارئ', () => {
  const client = read('src/lib/api.ts')
  assert.match(client, /export const POLICY_GATE_PATH = '\/login\/policies'/)
  // كود الخادم بيحوّل لشاشة الإقرار، من غير تحويل لو الشاشة تحت ‎/login أصلًا
  assert.match(client, /res\.status === 403 &&\n\s+details\?\.code === 'POLICY_ACK_REQUIRED' &&\n\s+typeof window !== 'undefined' &&\n\s+!window\.location\.pathname\.startsWith\('\/login'\)\n\s+\) \{\n\s+window\.location\.href = POLICY_GATE_PATH/)
  const layout = read('src/components/layout/MainLayout.tsx')
  // شاشة الإقرار تحت ‎/login: من غير إطار النظام ومن غير حارسه
  assert.match(layout, /const BARE_PATHS = \['\/login'\]/)
  assert.match(layout, /if \(!authed \|\| bare \|\| policiesCheckedThisSession\(\)\) return\n\s+let cancelled = false\n\s+fetchPendingPolicies\(\)\n\s+\.then\(\(pending\) => \{\n\s+if \(cancelled\) return\n\s+if \(pending\.policies\.length\) window\.location\.href = POLICY_GATE_PATH\n\s+else markPoliciesChecked\(\)\n\s+\}\)\n\s+\.catch\(\(\) => undefined\)/)
  // العلامة قيمتها علامة الجلسة (B2.17: مفيش توكن في التخزين): دخول جديد بيعرض الشاشة تاني، و«بعدين» بيحطها؛ وتخزين مقفول = من غير فحص عند الدخول
  const ui = require('../../src/lib/policies-api')
  const stored = new Map()
  const storage = { getItem: key => stored.has(key) ? stored.get(key) : null, setItem: (key, value) => stored.set(key, String(value)), removeItem: key => stored.delete(key) }
  const previous = { window: global.window, localStorage: global.localStorage, sessionStorage: global.sessionStorage }
  try {
    global.window = {}; global.localStorage = storage; global.sessionStorage = storage
    const tokenKey = /const MARK_KEY = '([^']+)'/.exec(client)[1]
    assert.equal(ui.policiesCheckedThisSession(), false, 'من غير جلسة: مفيش علامة')
    stored.set(tokenKey, 'first-login-mark-0001')
    assert.equal(ui.policiesCheckedThisSession(), false)
    ui.markPoliciesChecked()
    assert.equal(ui.policiesCheckedThisSession(), true)
    stored.set(tokenKey, 'second-login-mark-0002')
    assert.equal(ui.policiesCheckedThisSession(), false, 'دخول جديد = علامة جديدة = الفحص تاني')
    global.sessionStorage = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
    assert.equal(ui.policiesCheckedThisSession(), true, 'تخزين مقفول: من غير فحص عند الدخول (ومن غير لفّة تحويل)')
    assert.doesNotThrow(() => ui.markPoliciesChecked())
  } finally { Object.assign(global, previous) }
  const page = read('src/app/login/policies/page.tsx')
  // مفيش حاجة مستنياه = يدخل النظام؛ والمتأخرة الأول؛ وبعد كل إقرار (أو نسخة بطلت) القايمة بتتحمّل تاني
  assert.match(page, /if \(!data\.policies\.length\) \{ enter\(\); return \}/)
  assert.match(page, /const enter = \(\) => \{ markPoliciesChecked\(\); window\.location\.href = '\/' \}/)
  assert.match(page, /\.sort\(\(a, b\) => Number\(b\.state === 'OVERDUE'\) - Number\(a\.state === 'OVERDUE'\)\)/)
  assert.match(page, /<PolicyReader key=\{current\.version\.id\} versionId=\{current\.version\.id\} canAcknowledge onAcknowledged=\{\(\) => void load\(\)\} onStale=\{\(\) => void load\(\)\} \/>/)
  // الجلسة خلصت (في تحميل القايمة أو في السحب): الشاشة تحت ‎/login فبتحوّل بنفسها
  assert.match(page, /const expired = \(cause: unknown\) => \{\n\s+if \(!\(cause instanceof ApiError\) \|\| cause\.status !== 401\) return false\n\s+clearSession\(\); window\.location\.href = '\/login\?expired=1'\n\s+return true\n\s+\}/)
  assert.match(page, /if \(!expired\(cause\)\) setError\(cause instanceof Error \? cause\.message : 'تعذر تحميل السياسات'\)/)
  assert.match(page, /if \(!expired\(cause\)\) \{ setError\(cause instanceof Error \? cause\.message : 'تعذر سحب السياسة'\); setWithdrawing\(null\) \}/)
  // «بعدين» جوه مهلة السماح بس
  assert.match(page, /\{pending && !pending\.blocked && \(\n\s+<button type="button" onClick=\{enter\}[^>]*data-policy-gate-later>بعدين<\/button>/)
  assert.equal(count(page, 'onClick={enter}'), 1)
  // سحب السياسة من الشاشة لمدير السياسات اللي نطاقه كل الفروع بس (حكم الخادم)، وبتأكيد، ومرة واحدة
  assert.match(page, /setManager\(can\('policies\.manage'\) && isCompanyWideUser\(getCurrentUser\(\)\)\)/)
  assert.match(page, /const withdraw = async \(policyId: number\) => \{\n[^\n]*\n\s+if \(running\.current\) return\n\s+running\.current = true; setBusy\(true\)/)
  assert.match(page, /\} finally \{ running\.current = false; setBusy\(false\) \}/)
  assert.match(page, /<button type="button" disabled=\{busy\} onClick=\{\(\) => void withdraw\(current\.policyId\)\}/)
  assert.match(page, /\{manager && \(\n\s+<p className="text-xs text-gray-500" data-policy-gate-withdraw>/)
  assert.match(page, /withdrawing === current\.policyId\n\s+\? <>[^\n]*onClick=\{\(\) => void withdraw\(current\.policyId\)\}/)
  // موعد القفل هو أول يوم قفل، مش «آخر يوم للإقرار»
  assert.match(page, /`النظام هيقفل معاك من يوم \$\{formatDate\(current\.lockDate\)\} لو مااقرّيتش`/)
  for (const file of ['src/app/login/policies/page.tsx', 'src/app/my/policies/page.tsx', 'src/components/policies/PolicyReport.tsx', 'src/app/policies/page.tsx']) {
    assert.equal(read(file).includes('آخر يوم للإقرار'), false, file)
  }
  const reader = read('src/components/policies/PolicyReader.tsx')
  // الإقرار ببصمة النسخة اللي اتعرضت، وبعد علامة «قرأت»، وبعد ما المحتوى يتعرض فعلًا (الملف بعد ما يترسم)
  assert.match(reader, /const shown = !!content && \(content\.kind === 'TEXT' \|\| fileState === 'rendered'\)/)
  assert.match(reader, /if \(!content \|\| !shown \|\| !agreed \|\| saving\) return/)
  assert.match(reader, /await acknowledgePolicy\(content\.versionId, content\.contentHash\)/)
  assert.match(reader, /\{canAcknowledge \? shown && \(\n\s+<div [^>]*data-policy-acknowledge>/)
  assert.match(reader, /<PdfPreview url=\{fileUrl\} subject="السياسة" onStatus=\{setFileState\} failureText="تعذر عرض ملف السياسة\." \/>/)
  // والملف لسه بيتحمّل: سطر حالة بدل شاشة فاضية
  assert.match(reader, /: fileState === 'loading' && <p role="status"[^>]*data-policy-file-loading>جارٍ تحميل ملف السياسة…<\/p>\}/)
  assert.match(reader, /if \(isCurrent\(\)\) \{ setFileState\('failed'\); setError\(/)
  // النسخة مابقتش السارية (404) أو اتغيّرت (409) أو الجلسة خلصت (401)، في تحميل النسخة أو في الإقرار: الشاشة اللي فوق بتحمّل تاني
  assert.match(reader, /const gone = useCallback\(\(cause: unknown\) => \{ if \(cause instanceof ApiError && \[401, 404, 409\]\.includes\(cause\.status\)\) stale\.current\?\.\(\) \}, \[\]\)/)
  assert.match(reader, /const stale = useRef\(onStale\)\n\s+stale\.current = onStale/)
  assert.match(reader, /if \(isCurrent\(\)\) \{ setError\(cause instanceof Error \? cause\.message : 'تعذر تحميل السياسة'\); gone\(cause\) \}/)
  assert.match(reader, /setError\(cause instanceof Error \? cause\.message : 'تعذر تسجيل الإقرار'\)\n\s+gone\(cause\)/)
  assert.match(reader, /<button type="button" disabled=\{!agreed \|\| saving\} onClick=\{acknowledge\}/)
  assert.match(reader, /\{POLICY_ACK_STATEMENT\}/)
  assert.match(reader, /useEffect\(\(\) => \(\) => \{ if \(fileUrl\) URL\.revokeObjectURL\(fileUrl\) \}, \[fileUrl\]\)/)
  // عارض الملف بيبلّغ إن الصفحة اترسمت أو اتعذّرت
  const preview = read('src/components/PdfPreview.tsx')
  assert.match(preview, /if \(!cancelled\) \{ setLoading\(false\); report\.current\?\.\('rendered'\) \}/)
  assert.equal(count(preview, "report.current?.('failed')"), 2)
  // نص تعذّر العرض: الافتراضي للي عنده زرار تحميل فوق المعاينة، والقارئ بنصه
  assert.match(preview, /failureText = 'تعذر عرض المعاينة\. يمكنك تحميل ملف PDF من الزر أعلاه\.'/)
  assert.match(preview, /\{error && <p role="alert"[^>]*>\{failureText\}<\/p>\}/)
  // لوحة الرسم شمال ليمين دايمًا: لو ورثت اتجاه الصفحة العربي، حروف ملف بخط غير مضمّن بتترسم في غير مكانها والأقواس بتتعكس
  assert.match(preview, /<canvas ref=\{canvas\} dir="ltr" /)
})

test('PU-04: الشاشات والقايمة الجانبية وصلاحيات المسارات والتقرير', () => {
  const registry = require('../src/modules-registry/registry')
  assert.deepEqual([registry.MODULES.policies.core, registry.MODULES.policies.routes, registry.MODULES.policies.permissions, registry.MODULES.policies.dependsOn],
    [true, ['/policies', '/my/policies'], ['policies.manage', 'policies.report'], ['documents']])
  for (const file of ['src/app/policies/page.tsx', 'src/app/policies/reports/page.tsx', 'src/app/my/policies/page.tsx', 'src/app/login/policies/page.tsx']) assert.ok(fs.existsSync(path.join(root, file)), file)
  const sidebar = read('src/components/layout/Sidebar.tsx')
  assert.match(sidebar, /id: 'policies',\n\s+label: 'السياسات',\n\s+icon: <ScrollText size=\{20\} \/>,\n\s+children: \[\n\s+\{ label: 'مكتبة السياسات', href: '\/policies', perm: 'policies\.manage' \},\n\s+\{ label: 'تقرير الإقرارات', href: '\/policies\/reports', perm: 'policies\.report' \},\n\s+\],/)
  assert.match(sidebar, /\{ id: 'my-policies', label: 'سياساتي', icon: <ScrollText size=\{20\} \/>, href: '\/my\/policies' \},/)
  const layout = read('src/components/layout/MainLayout.tsx')
  // التقرير مفتوح في الإطار (الخادم بيحكم بأي واحدة من الصلاحيتين)، والمكتبة لمديرها؛ والتقرير قبل المكتبة في القايمة (أول تطابق)
  assert.ok(layout.indexOf("['/policies/reports', null],") > 0 && layout.indexOf("['/policies/reports', null],") < layout.indexOf("['/policies', 'policies.manage'],"))
  const permissions = read('api/src/auth/permissions.ts')
  assert.ok(permissions.includes("'policies.manage': 'إدارة السياسات'") && permissions.includes("'policies.report': 'تقرير إقرارات السياسات'"))
  // المكتبة: التعديل والنشر والسحب لمديرها بس (canManage من الخادم)، والعنوان مابيتبعتش ولا بيتعدل بعد النشر
  const library = read('src/app/policies/page.tsx')
  assert.match(library, /const canManage = data\?\.available === true && data\.canManage/)
  assert.match(library, /\{canManage && policy\.status !== 'WITHDRAWN' && \(/)
  assert.match(library, /\{data\?\.available && !data\.canManage && <CompanyWideReadOnlyNote \/>\}/)
  assert.match(library, /const fileId = version\.kind === 'FILE' \? \(await uploadPolicyFile\(version\.file!\)\)\.id : null/)
  assert.match(library, /published: !!policy && policy\.status !== 'DRAFT'/)
  assert.match(library, /const input = \{ \.\.\.\(form\.published \? \{\} : \{ title, category: form\.category\.trim\(\) \|\| null \}\), isMandatory: form\.isMandatory,/)
  assert.match(library, /maxLength=\{200\} disabled=\{form\.published\}/)
  // والفئة زي العنوان بعد النشر
  assert.match(library, /value=\{form\.category\} maxLength=\{100\} placeholder="[^"]*" disabled=\{form\.published\}/)
  // ملف PDF بيتعاين قبل نشره، والنشر بعد ما المعاينة تظهر فعلًا: ملف مابيتعرضش في المتصفح مابيتنشرش من الشاشة (الموظف مابيقرّش غير بعد ما يشوفه)
  assert.match(library, /if \(version\.kind === 'FILE' && version\.fileShown !== 'rendered'\) \{ setModalError\('استنى معاينة الملف تظهر قبل النشر'\); return \}/)
  assert.match(library, /<PdfPreview key=\{version\.fileUrl\} url=\{version\.fileUrl\} subject="السياسة" failureText="[^"]*"\n\s+onStatus=\{status => patchVersion\(\{ fileShown: status \}\)\} \/>/)
  // تعديلات الحوار على آخر حالة: نتيجة المعاينة مابتتكتبش فوقها بحالة أقدم
  assert.match(library, /const patchVersion = \(patch: Partial<VersionForm>\) => setVersion\(current => \(current \? \{ \.\.\.current, \.\.\.patch \} : current\)\)/)
  assert.equal(count(library, 'setVersion({ ...version'), 0)
  assert.match(library, /disabled=\{saving \|\| \(version\.kind === 'FILE' && !!version\.file && version\.fileShown !== 'rendered'\)\}/)
  assert.match(library, /patchVersion\(\{ file, fileUrl: file \? URL\.createObjectURL\(file\) : null, fileShown: 'loading' \}\)/)
  // والنشر شغال: الحوار مابيتقفلش، والملف مابيتبدّلش (النشر اللي اتبعت مابيقفش، والنشر تاني كان هيطلّع نسخة تانية)
  assert.match(library, /const closeVersion = \(\) => \{\n\s+if \(saving\) return\n\s+if \(version\?\.fileUrl\) URL\.revokeObjectURL\(version\.fileUrl\)\n\s+setVersion\(null\)\n\s+\}/)
  assert.match(library, /<button type="button" onClick=\{closeVersion\} disabled=\{saving\}[^>]*>رجوع<\/button>/)
  assert.match(library, /<input type="file" accept="application\/pdf" className="block text-sm" disabled=\{saving\} onChange=\{event => chooseFile\(/)
  // واللي يدخل الجمهور بعد النشر مالوش مهلة جديدة: مكتوب للمدير جنب المهلة
  assert.ok(library.includes('واللي يدخل الجمهور بعد كده (نقل أو ترقية) مالوش مهلة جديدة'))
  // التقرير: تصدير بالصفوف الظاهرة، وغير الإلزامية من غير «عدّى المهلة»
  const report = read('src/components/policies/PolicyReport.tsx')
  assert.match(report, /downloadCsv\(`policy-acknowledgements-\$\{report\.policy\.id\}-\$\{csvDateStamp\(\)\}\.csv`/)
  assert.match(report, /state === 'PENDING' && report && !report\.policy\.isMandatory \? 'لسه' : POLICY_ACK_LABELS\[state\]/)
  assert.equal(count(report, "'القفل من يوم'"), 2)
  // «سياساتي»: القراءة للكل، والإقرار للي لسه مااقرّش؛ ونسخة بطلت بتقفل القارئ وتحمّل القايمة
  const mine = read('src/app/my/policies/page.tsx')
  assert.match(mine, /<PolicyReader versionId=\{open\.version\.id\} canAcknowledge=\{open\.state !== 'ACKNOWLEDGED'\} acknowledgedAt=\{open\.acknowledgedAt\}/)
  assert.match(mine, /onAcknowledged=\{\(\) => \{ setOpen\(null\); load\(\) \}\} onStale=\{\(\) => \{ setOpen\(null\); load\(\) \}\} \/>/)
  assert.match(mine, /\{policy\.state !== 'ACKNOWLEDGED' && policy\.isMandatory \? 'اقرا ووافق' : 'قراءة'\}/)
})

test('PU-05: ملف السياسة بالتدفق — البصمة والحجم من غير تحميل الملف كله، وتيار الإرسال بيقطع قبل ما يكمل لو الملف مش هو', async () => {
  const files = require('../src/files/stored-file-hash'), rules = require('../src/policies/policy-rules')
  const { Readable } = require('node:stream')
  const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
  const chunks = [Buffer.from('%PDF-1.4 '), Buffer.alloc(70_000, 0x41), Buffer.from(' middle '), Buffer.from('%%EOF')], whole = Buffer.concat(chunks)
  const digest = bytes => ({ sha256: sha(bytes), size: bytes.length })
  // البصمة والحجم من التيار = بصمة وحجم الملف كله (والفاضي فاضي)
  assert.deepEqual([await files.sha256OfStream(Readable.from(chunks)), await files.sha256OfStream(Readable.from([]))], [digest(whole), digest(Buffer.alloc(0))])
  const send = async (parts, expected) => {
    const out = []
    try { for await (const chunk of Readable.from(parts).pipe(files.sha256VerifiedStream(expected))) out.push(chunk) } catch (cause) { return { error: cause.message, out: Buffer.concat(out) } }
    return { error: null, out: Buffer.concat(out) }
  }
  // مطابق: كل البايتات بترتيبها (وأجزاء فاضية في النص وفي الآخر مابتغيّرش حاجة)
  for (const parts of [chunks, [chunks[0], Buffer.alloc(0), ...chunks.slice(1), Buffer.alloc(0)], [whole]]) {
    const good = await send(parts, digest(whole))
    assert.deepEqual([good.error, good.out.equals(whole)], [null, true])
  }
  // ملف تاني بنفس الحجم: خطأ، وآخر جزء ماخرجش
  const other = Buffer.from(whole); other[100] ^= 1
  const bad = await send([other.subarray(0, 9), other.subarray(9, 70_009), other.subarray(70_009)], digest(whole))
  assert.deepEqual([bad.error, bad.out.length, bad.out.equals(other.subarray(0, 70_009))], [files.STORED_FILE_CHANGED, 70_009, true])
  // واللي طلع قبل الخطأ أقل من الحجم المتحقق منه دايمًا — ملف أصغر، أو أكبر (جزء واحد أو أجزاء)، أو آخره جزء فاضي — فالرد المعلَن بالحجم ده مابيكملش
  const longer = Buffer.concat([whole, Buffer.from('extra bytes')])
  for (const parts of [[whole.subarray(0, 50_000)], [whole.subarray(0, 50_000), whole.subarray(50_000, 60_000)], [longer], [whole, Buffer.from('extra')],
    [whole.subarray(0, 70_000), longer.subarray(70_000)], [other, Buffer.alloc(0)], [other.subarray(0, whole.length - 1), other.subarray(whole.length - 1), Buffer.alloc(0)]]) {
    const cut = await send(parts, digest(whole))
    assert.deepEqual([cut.error, cut.out.length < whole.length], [files.STORED_FILE_CHANGED, true], `${parts.map(part => part.length)}`)
  }
  // ملف من جزء واحد مش مطابق: ولا بايت
  const tiny = Buffer.from('tiny file')
  assert.deepEqual([await send([tiny], digest(Buffer.from('tiny f1le'))), await send([tiny], digest(tiny))], [{ error: files.STORED_FILE_CHANGED, out: Buffer.alloc(0) }, { error: null, out: tiny }])
  assert.equal(rules.POLICY_FILE_MISMATCH, 'ملف السياسة على التخزين مش مطابق للنسخة المنشورة — بلّغ مسؤول النظام')
  // الخدمة بتحسب البصمة بالتدفق (نشر وعرض)، والمتحكم بيبعت بالتيار المتحقق وبحجمه — مش ببايتات محمّلة في الذاكرة
  const service = read('api/src/policies/policies.service.ts'), controller = read('api/src/policies/policies.controller.ts')
  assert.equal(count(service, 'sha256OfStream(storage.read(file.storedName))'), 2)
  assert.equal(/Buffer\.concat|chunks\.push/.test(service), false)
  assert.match(controller, /if \(res\.destroyed\) return\n\s+res\.setHeader\('Content-Type', file\.mime\)\n\s+res\.setHeader\('Content-Length', stored\.size\)/)
  assert.match(controller, /const source = fileStorage\(\)\.read\(file\.storedName\)\n\s+try \{\n[^\n]*\n\s+pipeline\(source, sha256VerifiedStream\(stored\), res, error => \{/)
  assert.match(controller, /\} catch \{\n[^\n]*\n\s+source\.destroy\(\)\n\s+res\.destroy\(\)\n\s+\}/)
  assert.equal(/res\.(end|send)\(/.test(controller), false)
})
