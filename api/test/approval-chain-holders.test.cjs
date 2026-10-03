// B1.11 / D05: تحذير محرر السلاسل — خطوة وظيفية مالهاش حساب نشط بيحملها في فرع. اختبارات نقية بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { ApproverResolver, FUNCTIONAL_APPROVER_ROLES, holdsFunctionalStep } = require('../src/requests/approver-resolver.service')
const { chainHolderGaps } = require('../src/settings/approval-chain-holders')
const { holderGapLines } = require('../../src/components/approvals/chainEditorModel')

test('CH-01: حامل الخطوة الوظيفية = نفس حكم satisfies بالحرف لكل دور وصلاحية (من غير مدير النظام ولا مخرج الموارد البشرية)', () => {
  const resolver = Object.create(ApproverResolver.prototype)
  const grants = [[], ['approve.hr'], ['hr'], ['approve.finance'], ['finance'], ['approve.it'], ['it'], ['approve.custody'], ['custody_officer'],
    ['approve.executive'], ['executive'], ['approve.payroll'], ['payroll.approve'], ['*'], ['approve.finance', 'approve.payroll']]
  let held = 0
  for (const role of FUNCTIONAL_APPROVER_ROLES) {
    for (const userRole of ['employee', 'hr_manager', 'branch_manager', 'finance']) {
      for (const permissions of grants) {
        const user = { sub: 1, email: 'x', role: userRole, branchId: 1, employeeId: 9, permissions }
        const step = { stepOrder: 1, role, approverEmployeeId: null, slaDays: null, escalateTo: null, dueAt: null, actedAt: null, action: null }
        assert.equal(holdsFunctionalStep(user, role), resolver.satisfies(user, step), `${role} / ${userRole} / ${permissions}`)
        if (holdsFunctionalStep(user, role)) held++
      }
    }
  }
  assert.ok(held > 20, 'الجدول فيه حاملين فعلًا')
  // «*» مش حامل لخطوة وظيفية (satisfies مابيقبلهاش غير لمدير النظام بالدور)، وكود الدور مش تفويض
  assert.equal(holdsFunctionalStep({ role: 'employee', permissions: ['*'] }, 'finance'), false)
  assert.equal(holdsFunctionalStep({ role: 'finance', permissions: [] }, 'finance'), false)
  assert.equal(holdsFunctionalStep({ role: 'hr_manager', permissions: [] }, 'hr'), true)
  assert.equal(holdsFunctionalStep({ role: 'employee', permissions: ['approve.payroll'] }, 'direct_manager_of_requester'), false)
})

const branches = [{ id: 1, name: 'فرع الرياض', isActive: true }, { id: 2, name: 'فرع جدة', isActive: true }, { id: 3, name: 'فرع مقفول', isActive: false }]
const chains = [
  { id: 10, code: 'LEAVE', branchId: null, isActive: true },
  { id: 11, code: 'LEAVE', branchId: 2, isActive: true },
  { id: 12, code: 'OLD', branchId: null, isActive: false },
  { id: 13, code: 'SIMPLE', branchId: null, isActive: true },
]
const steps = [
  { id: 100, chainId: 10, stepOrder: 1, approverRole: 'direct_manager_of_requester', escalateTo: 'hr' },
  { id: 101, chainId: 10, stepOrder: 2, approverRole: 'finance', escalateTo: 'executive' },
  { id: 110, chainId: 11, stepOrder: 1, approverRole: 'finance', escalateTo: null },
  { id: 120, chainId: 12, stepOrder: 1, approverRole: 'finance', escalateTo: null },
  { id: 130, chainId: 13, stepOrder: 1, approverRole: 'specific_employee', escalateTo: null },
]
const finance = scope => ({ role: 'employee', permissions: ['approve.finance'], scope })
const hr = scope => ({ role: 'hr_manager', permissions: [], scope })

test('CH-02: السلسلة العامة على الفروع الشغالة اللي مالهاش نسخة، ونسخة الفرع على فرعها، والمعطّلة والفرع المقفول مالهمش تحذير', () => {
  const gaps = chainHolderGaps({ chains, steps, branches, holders: [finance([1]), hr([1, 2])], viewer: null })
  // العامة: جدة عندها نسخة فخارجها؛ الرياض فيها مالية وموارد بشرية، ومفيش تنفيذي → تحذير التصعيد بس
  assert.deepEqual(gaps.get(10), [{ stepId: 101, stepOrder: 2, kind: 'ESCALATION', role: 'executive', branches: [{ id: 1, name: 'فرع الرياض' }] }])
  // نسخة جدة: مفيش مالية في جدة
  assert.deepEqual(gaps.get(11), [{ stepId: 110, stepOrder: 1, kind: 'APPROVER', role: 'finance', branches: [{ id: 2, name: 'فرع جدة' }] }])
  assert.equal(gaps.has(12), false, 'المعطّلة مالهاش طلبات')
  assert.equal(gaps.has(13), false, 'خطوة «موظف بعينه» مش وظيفية')
  assert.deepEqual(holderGapLines({ holderGaps: gaps.get(11) }), ['الخطوة 1 «المالية»: مفيش حساب نشط معاه الصلاحية دي في فرع جدة — طلبات الفرع هتقف عندها'])
  assert.match(holderGapLines({ holderGaps: gaps.get(10) })[0], /^تصعيد الخطوة 2 لـ«التنفيذي»: .* فرع الرياض/)
})

test('CH-03: حساب على مستوى الشركة بيغطي كل الفروع، والنطاق الفاضي مابيغطيش حاجة، وتعطيل نسخة الفرع بيرجّع الفرع للعامة', () => {
  const company = chainHolderGaps({ chains, steps, branches, holders: [finance(null), hr(null), { role: 'employee', permissions: ['approve.executive'], scope: null }], viewer: null })
  assert.equal(company.size, 0)
  const empty = chainHolderGaps({ chains, steps, branches, holders: [finance([]), hr([1, 2]), { role: 'employee', permissions: ['approve.executive'], scope: null }], viewer: null })
  assert.deepEqual(empty.get(10).map(gap => [gap.kind, gap.role, gap.branches.map(b => b.id)]), [['APPROVER', 'finance', [1]]])
  const copyOff = chains.map(chain => chain.id === 11 ? { ...chain, isActive: false } : chain)
  const fallback = chainHolderGaps({ chains: copyOff, steps, branches, holders: [finance([1]), hr([1, 2]), { role: 'employee', permissions: ['approve.executive'], scope: null }], viewer: null })
  assert.deepEqual(fallback.get(10).map(gap => [gap.kind, gap.role, gap.branches.map(b => b.id)]), [['APPROVER', 'finance', [2]]])
  assert.equal(fallback.has(11), false)
})

test('CH-04: القارئ بيشوف فروع نطاقه بس — فرع برّه نطاقه مايتذكرش، والسلسلة اللي كل ثغراتها برّه نطاقه من غير تحذير', () => {
  const riyadh = chainHolderGaps({ chains, steps, branches, holders: [hr([1, 2])], viewer: [1] })
  assert.deepEqual(riyadh.get(10).map(gap => [gap.kind, gap.role, gap.branches.map(b => b.name)]),
    [['APPROVER', 'finance', ['فرع الرياض']], ['ESCALATION', 'executive', ['فرع الرياض']]])
  assert.equal(riyadh.has(11), false, 'نسخة جدة برّه نطاق قارئ الرياض')
  assert.equal(JSON.stringify([...riyadh.values()]).includes('جدة'), false)
  assert.equal(chainHolderGaps({ chains, steps, branches, holders: [], viewer: [] }).size, 0)
})

test('CH-05: الواجهة بتعرض التحذير في كارت السلسلة، والرد بيرجّع holderGaps، وصلاحيات الحسابات من نفس حساب التوكن', () => {
  const root = path.join(__dirname, '..', '..')
  const page = fs.readFileSync(path.join(root, 'src/app/settings/approvals/page.tsx'), 'utf8')
  assert.match(page, /holderGapLines\(chain\)\.map/)
  assert.match(page, /محدش هيشوف الطلبات دي غير مدير النظام/)
  const controller = fs.readFileSync(path.join(__dirname, '..', 'src/settings/settings.controller.ts'), 'utf8')
  assert.match(controller, /holderGaps: holderGaps\.get\(c\.id\) \?\? \[\]/)
  assert.match(controller, /this\.auth\.resolvePermissionsMany\(counted\)/)
  assert.match(controller, /account\.role !== 'super_admin'/)
  const auth = fs.readFileSync(path.join(__dirname, '..', 'src/auth/auth.service.ts'), 'utf8')
  assert.equal((auth.match(/this\.composeBreakdown\(/g) || []).length, 2, 'الحساب الفردي والجماعي من نفس الدالة')
})

test('CH-06 (D12): كشف «المدير المسجل غير قائد الفريق» في شاشة الفرق — الاسم والمخفي والمحذوف، والعدّاد مابيعدّش القائد نفسه', () => {
  const { mismatchPersonLabel } = require('../../src/lib/team-manager-mismatches')
  assert.equal(mismatchPersonLabel({ id: 5, employeeCode: 'E-5', fullName: 'سارة', isActive: true }), 'E-5 — سارة')
  assert.equal(mismatchPersonLabel({ id: 5, employeeCode: 'E-5', fullName: 'سارة', isActive: false }), 'E-5 — سارة (غير نشط)')
  assert.equal(mismatchPersonLabel({ id: null, employeeCode: null, fullName: 'موظف خارج نطاق صلاحيتك', isActive: null }), 'موظف خارج نطاق صلاحيتك')
  assert.equal(mismatchPersonLabel({ id: 9, employeeCode: null, fullName: null, isActive: false }), 'موظف #9')
  const page = fs.readFileSync(path.join(__dirname, '..', '..', 'src/app/settings/teams/page.tsx'), 'utf8')
  assert.match(page, /fetchManagerLeaderMismatches\(\)/)
  assert.match(page, /موظف مديرهم المسجّل غير قائد فريقهم/)
  assert.match(page, /e\.id !== team\.leaderEmployeeId/)
  const controller = fs.readFileSync(path.join(__dirname, '..', 'src/org/org.controller.ts'), 'utf8')
  assert.match(controller, /@Get\('teams\/manager-mismatches'\)\s*\n\s*@Perm\('org\.manage', 'employees\.view'\)/)
})
