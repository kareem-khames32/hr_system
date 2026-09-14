// عقد طلب التأجيل وتوزيع أصل السلفة؛ اختبارات نقية بلا اتصال بقاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { BadRequestException } = require('@nestjs/common')
const { assertLoanDeferralClientPayload: client, stageLoanDeferralPayload: stage,
  readStoredLoanDeferralPayload: stored, loanScheduleAmounts: schedule, loanAmountThresholdMet } = require('../src/requests/loan-installment-requests')
const payload = extra => ({ loanId: 7, installmentId: 12, toPeriod: '2027-01', reason: 'تأجيل اختياري للقسط', ...extra })
const evidence = extra => ({ loanId: 7, installmentId: 12, sourceRevision: 3, amount: '1266.00', toPeriod: '2027-01', ...extra })
const bad = action => assert.throws(action, error => error instanceof BadRequestException && error.getStatus() === 400)
const cents = text => BigInt(text.replace('.', ''))

test('AD10 floors each installment to cents and assigns all remainder to the final installment', () => {
  const result = schedule('10000.00', 6)
  assert.deepEqual(result, { amount: '10000.00', months: 6, amounts: ['1666.66', '1666.66', '1666.66', '1666.66', '1666.66', '1666.70'] })
  assert.equal(result.amounts.reduce((sum, value) => sum + cents(value), 0n), cents(result.amount))
})

test('SPEC5-2 rejects sub-unit ordinary installments without inventing zero-balance due rows', () => {
  bad(() => schedule('0.02', 3)); bad(() => schedule(0.29, '3'))
  bad(() => schedule('1.99', 2)); bad(() => schedule('0.99', 1))
  assert.deepEqual(schedule('1.00', 1).amounts, ['1.00'])
  assert.deepEqual(schedule('2.01', 2).amounts, ['1.00', '1.01'])
})

test('DEC18,2 boundary preserves every cent without Number conversion', () => {
  const result = schedule('9999999999999999.99', 7)
  assert.equal(result.amounts.reduce((sum, value) => sum + cents(value), 0n), 999999999999999999n)
  assert.equal(result.amounts[0], '1428571428571428.57')
  assert.equal(result.amounts[6], '1428571428571428.57')
  const huge = schedule('9007199254740991.91', 1000)
  assert.equal(huge.amounts.length, 1000)
  assert.equal(huge.amounts.reduce((sum, value) => sum + cents(value), 0n), 900719925474099191n)
})

test('amount precision and technical month bounds reject without silent rounding', () => {
  for (const value of ['0', '-1', '1.001', '1e3', '', '.01', '10000000000000000', NaN, Infinity, 9007199254740991.91, null, {}, true]) bad(() => schedule(value, 3))
  for (const months of [0, -1, 1001, 1200, 2.5, NaN, Infinity, '1.5', '1e2', '01', null, {}, true]) bad(() => schedule('10000.00', months))
})

test('varied schedules conserve principal and never exceed the ordinary floor before the final installment', () => {
  for (let index = 1; index <= 100; index++) {
    const months = index % 31 + 1, total = BigInt(index * index * 127 + index + 100 * months)
    const text = `${total / 100n}.${String(total % 100n).padStart(2, '0')}`, result = schedule(text, months)
    assert.equal(result.amounts.reduce((sum, value) => sum + cents(value), 0n), total)
    result.amounts.slice(0, -1).forEach(value => assert.equal(cents(value), total / BigInt(months)))
    assert.ok(cents(result.amounts.at(-1)) >= total / BigInt(months))
  }
})

test('client admits four fields only and normalizes numeric form IDs without changing the caller', () => {
  const input = Object.freeze(payload({ loanId: '7', installmentId: '12', reason: '  تأجيل شهر للمراجعة  ' }))
  assert.deepEqual(client(input), payload({ reason: 'تأجيل شهر للمراجعة' }))
  assert.equal(input.loanId, '7'); assert.equal(input.reason, '  تأجيل شهر للمراجعة  ')
  assert.deepEqual(client({}, false), {})
})

test('client cannot supply a balance, revision, approval, actor or protected evidence even in a draft', () => {
  for (const [key, value] of Object.entries({ amount: '1', sourceRevision: 3, expectedRevision: 3, deferralEvidence: evidence(),
    approved: true, approvedBy: 3, actorId: 3, dueId: 12, employeeId: 3, requestId: 3, status: 'APPROVED', attachmentUrl: 'file' })) {
    bad(() => client(payload({ [key]: value }))); bad(() => client({ [key]: value }, false))
  }
})

test('required identifiers, period and reason reject invalid values at submission', () => {
  for (const key of ['loanId', 'installmentId', 'toPeriod', 'reason']) for (const value of [null, undefined, '']) bad(() => client(payload({ [key]: value })))
  for (const value of [0, -1, 1.5, 2147483648, '1e2', '01', true, {}, [], NaN, Infinity]) bad(() => client(payload({ loanId: value })))
  for (const toPeriod of ['0000-01', '2027-1', '2027-13', '2027-00', '2027-01-01', ' 2027-01']) bad(() => client(payload({ toPeriod })))
  for (const reason of ['ab', '    ', 'a'.repeat(501), 5, {}]) bad(() => client(payload({ reason })))
})

test('strict plain data shapes reject inherited, hidden and accessor data without invoking it', () => {
  let calls = 0
  const getter = Object.defineProperty(payload(), 'reason', { enumerable: true, get() { calls++; return 'computed reason' } })
  const hidden = Object.defineProperty(payload(), 'amount', { value: '1', enumerable: false })
  for (const value of [getter, hidden, Object.assign(Object.create({ owner: 7 }), payload()), Object.assign(payload(), { [Symbol('proof')]: true }), [], null]) bad(() => client(value))
  assert.equal(calls, 0)
  assert.deepEqual(client(Object.assign(Object.create(null), payload())), payload())
})

test('server evidence freezes the open remainder for thresholds while preserving source revision', () => {
  const server = evidence(), result = stage(payload(), server)
  assert.equal(result.amount, '1266.00'); assert.equal(result.deferralEvidence.sourceRevision, 3)
  assert.deepEqual(stored(result, true), result)
  server.amount = '400.00'
  assert.equal(result.amount, '1266.00'); assert.equal(result.deferralEvidence.amount, '1266.00')
})

test('stored source snapshot cannot mismatch the protected amount, IDs or month', () => {
  const result = stage(payload(), evidence())
  for (const patch of [{ amount: '1.00' }, { loanId: 8 }, { installmentId: 13 }, { toPeriod: '2027-02' }, { actorId: 8 }]) bad(() => stored({ ...result, ...patch }, true))
  for (const patch of [{ loanId: 8 }, { installmentId: 13 }, { toPeriod: '2027-02' }, { amount: '1.00' }, { sourceRevision: 0 }, { amount: '0.00' }, { approved: true }]) bad(() => stored({ ...result, deferralEvidence: { ...result.deferralEvidence, ...patch } }, true))
})

test('execution cannot use an unstaged draft or one half of an evidence snapshot', () => {
  assert.deepEqual(stored(payload()), payload())
  bad(() => stored(payload(), true))
  bad(() => stored({ ...payload(), amount: '1266.00' }))
  bad(() => stored({ ...payload(), deferralEvidence: evidence() }))
  bad(() => stage(payload(), evidence({ amount: '1.001' })))
})

test('financial approval comparisons preserve a one-cent difference beyond safe Number precision', () => {
  assert.equal(loanAmountThresholdMet('9999999999999999.99', '>', '9999999999999999.98'), true)
  assert.equal(loanAmountThresholdMet('9999999999999999.98', '>=', '9999999999999999.99'), false)
  assert.equal(loanAmountThresholdMet('0.01', '<', '0.02'), true)
  assert.equal(loanAmountThresholdMet('1.00', '<=', '1'), true)
  assert.equal(loanAmountThresholdMet('1', '>', '-1.00'), true)
  for (const threshold of [1, null, undefined, NaN, '1e2', '1.001', '10000000000000000.00', '']) bad(() => loanAmountThresholdMet('1.00', '>=', threshold))
  bad(() => loanAmountThresholdMet('1.00', '=', '1.00'))
})

// البذرة الحقيقية مع مخزن ذاكرة؛ لا اتصال ولا mock لقرارات حفظ السلسلة نفسها.
function memorySource() {
  let data = {}, sequence = 0
  const matches = (row, where) => Array.isArray(where) ? where.some(part => matches(row, part)) : Object.entries(where || {}).every(([key, value]) => row[key] === value)
  const source = {
    getRepository(entity) {
      const name = typeof entity === 'string' ? entity : entity.name, rows = () => data[name] ??= []
      return {
        create: value => ({ ...value }),
        findOne: async ({ where }) => structuredClone(rows().find(row => matches(row, where)) ?? null),
        save: async value => {
          if (Array.isArray(value)) return Promise.all(value.map(row => source.getRepository(entity).save(row)))
          const row = { id: value.id ?? ++sequence, ...value }, found = rows().findIndex(item => item.id === row.id)
          if (found < 0) rows().push(structuredClone(row)); else rows()[found] = structuredClone(row)
          return row
        },
        delete: async where => { data[name] = rows().filter(row => !matches(row, where)) },
      }
    },
    transaction: async callback => { const before = structuredClone(data); try { return await callback(source) } catch (error) { data = before; throw error } },
    rows: name => structuredClone(data[name] ?? []),
  }
  return source
}

test('seed preserves the actual loan chain and its branch override even when the branch is found first', async () => {
  const { seedRequests } = require('../src/seed/seed-requests'), source = memorySource()
  const repo = name => source.getRepository(name)
  const branch = await repo('ApprovalChain').save({ code: 'CHAIN_MANAGER_FINANCE_T', branchId: 8, nameAr: 'دورة الفرع', isActive: true, autoApprove: false })
  const global = await repo('ApprovalChain').save({ code: 'CHAIN_MANAGER_FINANCE_T', branchId: null, nameAr: 'دورة السلف الحالية', isActive: true, autoApprove: false })
  const branchStep = await repo('ApprovalStep').save({ chainId: branch.id, stepOrder: 1, approverRole: 'finance', thresholdField: 'amount', thresholdOp: '>=', thresholdValue: 1500 })
  const globalStep = await repo('ApprovalStep').save({ chainId: global.id, stepOrder: 1, approverRole: 'executive' })
  const loan = await repo('RequestType').save({ code: 'LOAN', nameAr: 'سلفة المالك', approvalChainId: global.id, isConfidential: false, isActive: true })
  await seedRequests(source)
  const deferral = source.rows('RequestType').find(row => row.code === 'LOAN_INSTALLMENT_DEFER')
  assert.equal(deferral.approvalChainId, global.id)
  assert.deepEqual(source.rows('RequestType').find(row => row.id === loan.id), loan)
  assert.deepEqual(source.rows('ApprovalChain').filter(row => [branch.id, global.id].includes(row.id)), [branch, global])
  assert.deepEqual(source.rows('ApprovalStep').filter(row => [branchStep.id, globalStep.id].includes(row.id)), [branchStep, globalStep])
  await seedRequests(source)
  assert.equal(source.rows('RequestType').filter(row => row.code === 'LOAN_INSTALLMENT_DEFER').length, 1)
  assert.deepEqual(source.rows('RequestType').find(row => row.code === 'LOAN_INSTALLMENT_DEFER'), deferral)
  assert.deepEqual(source.rows('ApprovalChain').find(row => row.id === branch.id), branch)
})

test('seed keeps an existing deferral reference and its old template independent of a newly selected loan chain', async () => {
  const { seedRequests } = require('../src/seed/seed-requests'), source = memorySource(), repo = name => source.getRepository(name)
  const oldBranch = await repo('ApprovalChain').save({ code: 'CHAIN_MANAGER_FINANCE_T', branchId: 4 })
  const old = await repo('ApprovalChain').save({ code: 'CHAIN_MANAGER_FINANCE_T', branchId: null })
  const current = await repo('ApprovalChain').save({ code: 'CUSTOM_LOAN', branchId: null })
  await repo('RequestType').save({ code: 'LOAN', approvalChainId: current.id })
  const deferral = await repo('RequestType').save({ code: 'LOAN_INSTALLMENT_DEFER', approvalChainId: old.id, nameAr: 'اسم المالك' })
  const step = await repo('ApprovalStep').save({ chainId: oldBranch.id, stepOrder: 1, approverRole: 'executive' })
  await seedRequests(source)
  assert.deepEqual(source.rows('RequestType').find(row => row.id === deferral.id), deferral)
  assert.deepEqual(source.rows('ApprovalChain').find(row => row.id === oldBranch.id), oldBranch)
  assert.deepEqual(source.rows('ApprovalStep').find(row => row.id === step.id), step)
})

test('an unconfigured existing loan type does not get a fabricated chain or prevent seed completion', async () => {
  const { seedRequests } = require('../src/seed/seed-requests'), source = memorySource()
  const loan = await source.getRepository('RequestType').save({ code: 'LOAN', approvalChainId: null, isConfidential: false })
  await seedRequests(source)
  assert.deepEqual(source.rows('RequestType').find(row => row.code === 'LOAN'), loan)
  assert.equal(source.rows('RequestType').find(row => row.code === 'LOAN_INSTALLMENT_DEFER').approvalChainId, null)
  assert.equal(source.rows('ApprovalChain').some(row => row.code === 'CH_LOAN'), false)
})

test('actual deferral chain uses current LOAN, requester branch and exact server amount for approval thresholds', async () => {
  const { RequestsService } = require('../src/requests/requests.service')
  const service = Object.create(RequestsService.prototype), selected = []
  const actualLoan = { code: 'LOAN', approvalChainId: 10, isConfidential: false }
  const chains = [{ id: 10, code: 'OWNER_LOAN', branchId: null, isActive: true }, { id: 11, code: 'OWNER_LOAN', branchId: 8, isActive: true }]
  const steps = [{ id: 1, chainId: 11, stepOrder: 1, approverRole: 'direct_manager_of_requester' },
    { id: 2, chainId: 11, stepOrder: 2, approverRole: 'finance', thresholdField: 'amount', thresholdOp: '>', thresholdValue: 10000000000000000 }]
  service.resolver = { resolveApproverEmployee: async role => role === 'direct_manager_of_requester' ? 21 : null }
  const manager = {
    getRepository(entity) {
      if (entity.name === 'RequestType') return { findOneBy: async where => { assert.equal(where.code, 'LOAN'); return actualLoan } }
      if (entity.name === 'ApprovalChain') return { findOne: async ({ where }) => chains.find(row => Object.entries(where).every(([key, value]) => row[key] === value)) ?? null }
      if (entity.name === 'ApprovalStep') return { find: async ({ where }) => { selected.push(where.chainId); return steps.filter(row => row.chainId === where.chainId) } }
      throw Error('unexpected repository')
    },
    query: async (text, args) => { assert.match(text, /CAST\(\[thresholdValue\] AS nvarchar\(80\)\)/); assert.deepEqual(args, [11]); return [{ id: 2, value: '9999999999999999.98' }] },
  }
  const result = await service.resolveChain({ code: 'LOAN_INSTALLMENT_DEFER', approvalChainId: 99, isConfidential: true },
    { requesterId: 7, branchId: 8, payload: JSON.stringify(stage(payload(), evidence({ amount: '9999999999999999.99' }))) }, manager)
  assert.equal(result.chain.id, 11); assert.deepEqual(selected, [11]); assert.deepEqual(result.steps.map(row => row.role), ['direct_manager_of_requester', 'finance'])
  actualLoan.approvalChainId = null
  await assert.rejects(service.resolveChain({ code: 'LOAN_INSTALLMENT_DEFER', approvalChainId: 99 }, { requesterId: 7, branchId: 8 }, manager), /سلسلة السلف الحالية/)
})

test('deferral-only seed creates one missing type without touching chains, templates, owner configuration or other types', async () => {
  const { seedLoanInstallmentDeferralOnly } = require('../src/seed/seed-requests'), source = memorySource()
  const loan = await source.getRepository('RequestType').save({ code: 'LOAN', approvalChainId: 71, nameAr: 'سلفة المالك', isConfidential: true })
  const chain = await source.getRepository('ApprovalChain').save({ id: 71, code: 'OWNER_LOAN', branchId: null, nameAr: 'ترتيب محفوظ' })
  const config = await source.getRepository('RequestsConfig').save({ key: 'loan.insufficient_net_behavior', value: 'SKIP_AND_EXTEND' })
  const first = await seedLoanInstallmentDeferralOnly(source)
  assert.equal(first.created, true)
  const types = source.rows('RequestType'); assert.equal(types.length, 2)
  assert.deepEqual(types.find(row => row.code === 'LOAN'), loan)
  assert.deepEqual(types.find(row => row.id === first.typeId), { id: first.typeId, code: 'LOAN_INSTALLMENT_DEFER', nameAr: 'تأجيل قسط سلفة',
    category: 'financial', requiredFields: '["loanId","installmentId","toPeriod","reason"]', approvalChainId: 71,
    destinationHandler: 'loan_installment_defer', affectsBalance: false, isSecurityRoute: false, isConfidential: true, autoGeneratesPdf: false, phase: 'P1' })
  assert.deepEqual(await seedLoanInstallmentDeferralOnly(source), { created: false, typeId: first.typeId })
  assert.deepEqual(source.rows('ApprovalChain'), [chain]); assert.deepEqual(source.rows('RequestsConfig'), [config])
  assert.deepEqual(source.rows('ApprovalStep'), []); assert.deepEqual(source.rows('LeaveType'), [])
})

test('deferral-only seed preserves an existing custom type and refuses to invent a missing LOAN', async () => {
  const { seedLoanInstallmentDeferralOnly } = require('../src/seed/seed-requests'), source = memorySource()
  await assert.rejects(seedLoanInstallmentDeferralOnly(source), /إنشاء نوع السلفة/)
  assert.deepEqual(source.rows('RequestType'), [])
  const custom = await source.getRepository('RequestType').save({ code: 'LOAN_INSTALLMENT_DEFER', nameAr: 'اسم خاص', approvalChainId: 81, isActive: false, customFields: '[{"key":"custom"}]' })
  assert.deepEqual(await seedLoanInstallmentDeferralOnly(source), { created: false, typeId: custom.id })
  assert.deepEqual(source.rows('RequestType'), [custom])
})
