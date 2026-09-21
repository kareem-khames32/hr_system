// سلسلة اعتماد المسير (قرار المالك 22 سبتمبر) — المنطق الصافي وخطافات المسير الكبير. لا SQL ولا خدمة.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const chain = require('../src/payroll/payroll-approval-chain')
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8').replace(/\r\n/g, '\n')
const codeOf = fn => { try { fn(); return null } catch (error) { return error.getResponse().code } }

const steps = chain.normalizePayrollChainSteps([{ kind: 'USER', userId: 11 }, { kind: 'USER', userId: 12, label: ' مراجع تاني ' }, { kind: 'ROLE', roleCode: ' finance_manager ' }, { kind: 'USER', userId: 1 }])
const resolved = { chainId: 5, scope: 'COMPANY', seriesName: '', revision: 1, steps, hash: chain.payrollChainHash(steps) }
const at = minute => new Date(Date.UTC(2026, 8, 22, 9, minute))
const decision = (stepOrder, actorUserId, extra = {}) => ({ snapshotVersion: 3, chainHash: resolved.hash, stepOrder, stepCount: 4, stepLabel: steps[stepOrder - 1].label,
  approverKind: steps[stepOrder - 1].kind, approverRoleCode: steps[stepOrder - 1].roleCode, decision: 'APPROVED', reason: null, actorUserId, decidedAt: at(stepOrder), voidedAt: null, ...extra })
const progress = (approvals, run = { status: 'CALCULATED', snapshotVersion: 3 }, of = resolved) => chain.payrollChainProgress({ run, chain: of, approvals })

test('CHAIN-01: خطوات السلسلة تتنضف وتترتب، وأسماء الخطوات الافتراضية «مراجعة N» والأخيرة «الاعتماد النهائي»', () => {
  assert.deepEqual(steps, [
    { order: 1, kind: 'USER', userId: 11, roleCode: null, label: 'مراجعة 1' }, { order: 2, kind: 'USER', userId: 12, roleCode: null, label: 'مراجع تاني' },
    { order: 3, kind: 'ROLE', userId: null, roleCode: 'finance_manager', label: 'مراجعة 3' }, { order: 4, kind: 'USER', userId: 1, roleCode: null, label: 'الاعتماد النهائي' }])
  assert.deepEqual(chain.normalizePayrollChainSteps([{ kind: 'USER', userId: 3 }, { kind: 'USER', userId: 4 }]).map(step => step.label), ['مراجعة', 'الاعتماد النهائي'])
  assert.deepEqual(chain.normalizePayrollChainSteps([]), [], 'قائمة فاضية = مفيش سلسلة')
  assert.equal(codeOf(() => chain.normalizePayrollChainSteps(null)), 'PAYRUN-CHAIN-STEPS')
  assert.equal(codeOf(() => chain.normalizePayrollChainSteps([{}])), 'PAYRUN-CHAIN-STEP-KIND')
  assert.equal(codeOf(() => chain.normalizePayrollChainSteps([{ kind: 'USER' }])), 'PAYRUN-CHAIN-STEP-USER')
  assert.equal(codeOf(() => chain.normalizePayrollChainSteps([{ kind: 'USER', userId: 1.5 }])), 'PAYRUN-CHAIN-STEP-USER')
  assert.equal(codeOf(() => chain.normalizePayrollChainSteps([{ kind: 'ROLE', roleCode: '' }])), 'PAYRUN-CHAIN-STEP-ROLE')
  assert.equal(codeOf(() => chain.normalizePayrollChainSteps([{ kind: 'ROLE', roleCode: 'employee' }])), 'PAYRUN-CHAIN-STEP-ROLE-OPEN')
  assert.equal(codeOf(() => chain.normalizePayrollChainSteps([{ kind: 'USER', userId: 7 }, { kind: 'ROLE', roleCode: 'x' }, { kind: 'USER', userId: 7 }])), 'PAYRUN-CHAIN-STEP-DUPLICATE')
  assert.equal(codeOf(() => chain.normalizePayrollChainSteps([{ kind: 'USER', userId: 7, label: 'ط'.repeat(101) }])), 'PAYRUN-CHAIN-STEP-LABEL')
  assert.equal(codeOf(() => chain.normalizePayrollChainSteps(Array.from({ length: chain.PAYROLL_CHAIN_MAX_STEPS + 1 }, (_, index) => ({ kind: 'USER', userId: index + 1 })))), 'PAYRUN-CHAIN-TOO-LONG')
  // نفس الدور في خطوتين مسموح (حاملان مختلفان)، ونفس الشخص لا
  assert.equal(chain.normalizePayrollChainSteps([{ kind: 'ROLE', roleCode: 'hr_manager' }, { kind: 'ROLE', roleCode: 'hr_manager' }]).length, 2)
})

test('CHAIN-02: بصمة السلسلة = هوية المعتمدين بترتيبهم؛ اسم الخطوة برّاها، وأي تغيير في شخص أو ترتيب يغيّرها', () => {
  const relabeled = steps.map(step => ({ ...step, label: `${step.label} — اسم جديد` }))
  assert.equal(chain.payrollChainHash(relabeled), resolved.hash)
  assert.notEqual(chain.payrollChainHash([steps[1], steps[0], steps[2], steps[3]].map((step, index) => ({ ...step, order: index + 1 }))), resolved.hash)
  assert.notEqual(chain.payrollChainHash(steps.map(step => step.order === 4 ? { ...step, userId: 2 } : step)), resolved.hash)
  assert.notEqual(chain.payrollChainHash(steps.slice(0, 3)), resolved.hash)
  assert.match(resolved.hash, /^[a-f0-9]{64}$/)
  assert.deepEqual(chain.parsePayrollChainSteps(JSON.stringify(steps)), steps)
  assert.deepEqual(chain.parsePayrollChainSteps(null), [])
  assert.equal(codeOf(() => chain.parsePayrollChainSteps('{bad')), 'PAYRUN-CHAIN-CORRUPT')
})

test('CHAIN-03: التقدم — الخطوات بالترتيب، والمسير يفضل منتظر صاحب أول خطوة مش معتمدة', () => {
  assert.deepEqual(progress([], { status: 'CALCULATED', snapshotVersion: 3 }, null), { state: 'NONE', steps: [], currentStep: null, rejection: null, actedUserIds: [] })
  let view = progress([])
  assert.deepEqual([view.state, view.steps.map(step => step.status), view.currentStep.order, view.actedUserIds], ['WAITING', ['CURRENT', 'PENDING', 'PENDING', 'PENDING'], 1, []])
  view = progress([decision(1, 11), decision(2, 12)])
  assert.deepEqual([view.state, view.steps.map(step => step.status), view.currentStep.order, view.currentStep.kind, view.actedUserIds], ['WAITING', ['APPROVED', 'APPROVED', 'CURRENT', 'PENDING'], 3, 'ROLE', [11, 12]])
  assert.deepEqual([view.steps[1].actorUserId, view.steps[1].decidedAt], [12, at(2)])
  // قرار على خطوة متقدمة من غير اللي قبلها (مايحصلش تحت القفل) مابيتحسبش
  view = progress([decision(1, 11), decision(3, 40)])
  assert.deepEqual([view.steps.map(step => step.status), view.currentStep.order, view.actedUserIds], [['APPROVED', 'CURRENT', 'PENDING', 'PENDING'], 2, [11]])
  // مسودة أو ملغى: السلسلة ظاهرة وغير فعّالة
  assert.deepEqual([progress([decision(1, 11)], { status: 'DRAFT', snapshotVersion: 3 }).state, progress([], { status: 'CANCELLED', snapshotVersion: 3 }).currentStep], ['INACTIVE', null])
})

test('CHAIN-04: القرارات تخص نسخة حساب واحدة وبصمة سلسلة واحدة — نسخة أقدم أو قرار ملغى أو بصمة قديمة لا تُحتسب', () => {
  assert.equal(progress([decision(1, 11, { snapshotVersion: 2 })]).currentStep.order, 1, 'إعادة الحساب بتصفّر التقدم')
  assert.equal(progress([decision(1, 11, { voidedAt: at(30) })]).currentStep.order, 1, 'القرار الملغى (رفض/إعادة فتح) مابيتحسبش')
  assert.equal(progress([decision(1, 11, { chainHash: 'b'.repeat(64) })]).currentStep.order, 1, 'تغيير السلسلة بيبدأ الاعتماد من الأول')
  assert.equal(progress([decision(1, 11)]).currentStep.order, 2)
})

test('CHAIN-05: الرفض بسبب يرجّع نسخة الحساب لمسؤول الرواتب — مفيش خطوة حالية، وتغيير السلسلة مايمسحش الرفض', () => {
  const rejected = decision(2, 12, { decision: 'REJECTED', reason: 'غياب محسوب غلط', decidedAt: at(40) })
  const voidedFirst = decision(1, 11, { voidedAt: at(40) })
  let view = progress([voidedFirst, rejected])
  assert.deepEqual([view.state, view.currentStep, view.steps.map(step => step.status), view.actedUserIds], ['RETURNED', null, ['PENDING', 'PENDING', 'PENDING', 'PENDING'], []])
  assert.deepEqual(view.rejection, { stepOrder: 2, stepLabel: 'مراجع تاني', reason: 'غياب محسوب غلط', actorUserId: 12, decidedAt: at(40), snapshotVersion: 3 })
  const other = { ...resolved, hash: 'c'.repeat(64) }
  assert.equal(progress([voidedFirst, rejected], undefined, other).state, 'RETURNED', 'الرفض يحجب النسخة مهما اتغيرت السلسلة')
  // إعادة الحساب (نسخة جديدة) ← السلسلة تبدأ من الأول
  view = progress([voidedFirst, rejected], { status: 'CALCULATED', snapshotVersion: 4 })
  assert.deepEqual([view.state, view.currentStep.order, view.rejection], ['WAITING', 1, null])
  assert.equal(codeOf(() => chain.payrollChainReason('  ')), 'PAYRUN-CHAIN-REJECT-REASON')
  assert.equal(codeOf(() => chain.payrollChainReason('لا')), 'PAYRUN-CHAIN-REJECT-REASON')
  assert.equal(codeOf(() => chain.payrollChainReason('ط'.repeat(501))), 'PAYRUN-CHAIN-REJECT-REASON')
  assert.equal(chain.payrollChainReason('  راجعوا الحضور '), 'راجعوا الحضور')
})

test('CHAIN-06: مسير معتمد أو مصروف — الشريط من القرارات نفسها (تاريخ ثابت مهما اتغيرت السلسلة)، ومسير اتعتمد بخطوة واحدة بلا شريط', () => {
  const all = [decision(1, 11), decision(2, 12), decision(3, 40), decision(4, 1)]
  const changed = { ...resolved, steps: steps.slice(0, 1), hash: 'd'.repeat(64) }
  for (const status of ['APPROVED', 'PAID']) {
    const view = progress(all, { status, snapshotVersion: 3 }, changed)
    assert.deepEqual([view.state, view.steps.map(step => [step.order, step.label, step.status, step.actorUserId]), view.currentStep],
      ['COMPLETED', [[1, 'مراجعة 1', 'APPROVED', 11], [2, 'مراجع تاني', 'APPROVED', 12], [3, 'مراجعة 3', 'APPROVED', 40], [4, 'الاعتماد النهائي', 'APPROVED', 1]], null])
  }
  assert.equal(progress([], { status: 'APPROVED', snapshotVersion: 3 }).state, 'NONE')
  assert.equal(progress(all.map(row => ({ ...row, voidedAt: at(50) })), { status: 'APPROVED', snapshotVersion: 3 }).state, 'NONE')
})

test('CHAIN-07: صاحب الخطوة — الشخص المسمّى برقمه، والدور بكود دور التوكن', () => {
  assert.equal(chain.payrollChainStepMatchesUser(steps[0], { sub: 11, role: 'employee' }), true)
  assert.equal(chain.payrollChainStepMatchesUser(steps[0], { sub: 12, role: 'super_admin' }), false, 'مدير النظام مش صاحب خطوة غيره')
  assert.equal(chain.payrollChainStepMatchesUser(steps[2], { sub: 99, role: 'finance_manager' }), true)
  assert.equal(chain.payrollChainStepMatchesUser(steps[2], { sub: 99, role: 'hr_manager' }), false)
  assert.equal(chain.payrollChainSeriesKey('  مسير فرع المعادي '), chain.payrollChainSeriesKey('مسير فرع المعادي'))
  assert.equal(chain.payrollChainSeriesKey('Run A'), chain.payrollChainSeriesKey(' run a'))
})

test('CHAIN-07b: حل سلسلة المسير — الخاصة باسمه الدائم أولًا ثم سلسلة الشركة؛ سلسلة بلا خطوات = غير موجودة؛ بلا أي سلسلة = null (الاعتماد بخطوة واحدة)', () => {
  const company = { chainId: 1, scope: 'COMPANY', seriesName: '', revision: 3, steps: steps.slice(0, 2), hash: chain.payrollChainHash(steps.slice(0, 2)) }
  const own = { chainId: 2, scope: 'RUN_SERIES', seriesName: 'مسير فرع المعادي', revision: 1, steps, hash: resolved.hash }
  const cleared = { chainId: 3, scope: 'RUN_SERIES', seriesName: 'مسير الجيزة', revision: 4, steps: [], hash: chain.payrollChainHash([]) }
  const resolve = chain.buildPayrollChainResolver([company, own, cleared])
  assert.equal(resolve({ name: '  مسير فرع المعادي ' }).chainId, 2, 'نفس الاسم كل شهر = نفس السلسلة، بلا نسخ')
  assert.equal(resolve({ name: 'مسير الجيزة' }).chainId, 1, 'سلسلة خاصة اتشالت ← سلسلة الشركة')
  assert.equal(resolve({ name: 'مسير جديد' }).chainId, 1); assert.equal(resolve({ name: null }).chainId, 1)
  assert.equal(chain.buildPayrollChainResolver([own])({ name: 'مسير تاني' }), null, 'بلا سلسلة شركة: المسير التاني بخطوة واحدة')
  assert.equal(chain.buildPayrollChainResolver([{ ...company, steps: [] }])({ name: 'أي مسير' }), null)
  assert.equal(chain.buildPayrollChainResolver([])({ name: 'أي مسير' }), null)
})

test('CHAIN-08: خطافات المسير الكبير قليلة ومحددة — الاعتماد القديم يتحقق من السلسلة، وآخر خطوة تنادي approveLocked نفسها، والقسيمة على APPROVED/PAID كما هي', () => {
  const service = read('src/payroll/payroll.service.ts')
  const approve = service.slice(service.indexOf('  async approve(user: JwtPayload, runId: number) {'), service.indexOf('  async approveLocked('))
  for (const text of ['await this.lockRun(em, runId)', 'await this.assertRunAccess(user, run, em)', "if (run.status !== 'CALCULATED')", 'await assertPayrollRunHasNoChain(em, run)',
    'return this.approveLocked(em, user, run, null)']) assert.ok(approve.includes(text), text)
  assert.ok(approve.indexOf('assertPayrollRunHasNoChain') < approve.indexOf('approveLocked'), 'فحص السلسلة قبل الاعتماد')
  const locked = service.slice(service.indexOf('  async approveLocked('), service.indexOf('  // ===== الصرف: يقفل الأوفرتايم'))
  for (const text of ['payrollSelfApprovalIssue({ calculatedBy, approverId: user.sub, selfApprovalAllowed })', 'await claimPayrollPeriod(em, run, employeeIds)',
    'reservePayrollInstallments(', "run.status = 'APPROVED'", 'approvalChain: chain']) assert.ok(locked.includes(text), text)
  assert.doesNotMatch(locked, /this\.runs\.manager\.transaction|this\.lockRun\(/, 'الاعتماد النهائي يعمل داخل معاملة وقفل المنادي')
  // إعادة الفتح والإلغاء وإعادة الحساب بيلغوا القرارات السارية
  assert.ok(service.includes("await voidPayrollRunApprovals(em, runId, status === 'CALCULATED' ? 'REOPENED' : 'CANCELLED')"))
  assert.ok(service.includes("await voidPayrollRunApprovals(em, run.id, 'RECALCULATED')"))
  // لحظة ظهور القسيمة للموظف لم تتغير: APPROVED أو PAID فقط
  assert.ok(service.includes("if (!['APPROVED', 'PAID'].includes(run.status)) return null"), 'قسائمي: المعتمد والمصروف فقط')
  assert.ok(service.includes("const ownPublished = item.employeeId === user.employeeId && ['APPROVED', 'PAID'].includes(run.status)"), 'قسيمتي: المعتمد والمصروف فقط')
  const chainService = read('src/payroll/payroll-approval-chain.service.ts')
  assert.ok(chainService.includes('await this.payroll.approveLocked(em, user, run, {'))
  assert.ok(chainService.includes('await lockPayrollRunForCorrection(em, runId)'), 'قرار الخطوة تحت نفس قفل المسير')
  const controller = read('src/payroll/payroll-approval-chain.controller.ts')
  // الإعداد بصلاحيته، وقرار الخطوة بلا @Perm (التسمية هي المنحة والخدمة تحكم)
  assert.equal((controller.match(/@Perm\(PAYROLL_CHAIN_MANAGE_PERMISSION\)/g) ?? []).length, 4)
  assert.equal(chain.PAYROLL_CHAIN_MANAGE_PERMISSION, 'payroll.chain_manage')
  for (const route of ["@Post('runs/:id/approval-chain/approve')", "@Post('runs/:id/approval-chain/reject')", "@Get('approval-chain/my-pending')"]) {
    const index = controller.indexOf(route)
    assert.ok(index > 0, route)
    assert.doesNotMatch(controller.slice(controller.lastIndexOf('\n\n', index), index), /@Perm\(/, `${route} بلا @Perm`)
  }
})
