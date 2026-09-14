// OT-04: نختبر البذرة الفعلية دون تشغيلها على بيانات المراجعة أو تغيير سلاسل المالك.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '../tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const { seedRequests } = require('../src/seed/seed-requests')

function memorySource(failStep = false) {
  let data = {}, sequence = 0
  const matches = (row, where) => Array.isArray(where) ? where.some(value => matches(row, value)) : Object.entries(where || {}).every(([key, value]) => row[key] === value)
  const source = {
    getRepository(entity) {
      const name = typeof entity === 'string' ? entity : entity.name
      const rows = () => data[name] ??= []
      return {
        create: value => ({ ...value }),
        findOne: async ({ where }) => structuredClone(rows().find(row => matches(row, where)) ?? null),
        save: async value => {
          if (Array.isArray(value)) return Promise.all(value.map(item => source.getRepository(entity).save(item)))
          if (failStep && name === 'ApprovalStep') throw new Error('اختبار فشل حفظ خطوة الاعتماد')
          const item = { id: value.id ?? ++sequence, ...value }
          const index = rows().findIndex(row => row.id === item.id)
          if (index < 0) rows().push(structuredClone(item)); else rows()[index] = structuredClone(item)
          return item
        },
        delete: async where => { data[name] = rows().filter(row => !matches(row, where)) },
      }
    },
    transaction: async callback => {
      const before = structuredClone(data)
      try { return await callback(source) } catch (error) { data = before; throw error }
    },
    rows: name => structuredClone(data[name] ?? []),
  }
  return source
}

test('OT-04 seed: new installation has three ordered approval steps and rerun does not duplicate them', async () => {
  const source = memorySource()
  await seedRequests(source)
  for (const code of ['OVERTIME', 'OVERTIME_AUTO']) {
    const type = source.rows('RequestType').find(row => row.code === code)
    const chain = source.rows('ApprovalChain').find(row => row.id === type.approvalChainId)
    assert.equal(chain.autoApprove, false)
    const steps = source.rows('ApprovalStep').filter(row => row.chainId === chain.id).sort((a, b) => a.stepOrder - b.stepOrder)
    assert.deepEqual(steps.map(row => row.approverRole), ['direct_manager_of_requester', 'department_manager_of_requester', 'hr'])
  }
  const before = source.rows('ApprovalStep')
  await seedRequests(source)
  assert.deepEqual(source.rows('ApprovalStep'), before)
})

test('OT-04 seed: customized existing shared overtime chain and request definition remain unchanged', async () => {
  const source = memorySource()
  const chain = await source.getRepository('ApprovalChain').save({ code: 'CHAIN_OVERTIME_MANAGER_DEPT_HR', nameAr: 'سلسلة اختارها المالك', autoApprove: false })
  const step = await source.getRepository('ApprovalStep').save({ chainId: chain.id, stepOrder: 1, approverRole: 'executive', slaDays: 9 })
  const type = await source.getRepository('RequestType').save({ code: 'OVERTIME', approvalChainId: chain.id, nameAr: 'تعريف مخصص', isActive: true })
  await seedRequests(source)
  assert.deepEqual(source.rows('RequestType').find(row => row.id === type.id), type)
  assert.deepEqual(source.rows('ApprovalChain').find(row => row.id === chain.id), chain)
  assert.deepEqual(source.rows('ApprovalStep').find(row => row.id === step.id), step)
})

test('OT-04 seed: failure while adding steps leaves no partial overtime chain or request type', async () => {
  const source = memorySource(true)
  await assert.rejects(seedRequests(source), /فشل حفظ خطوة/)
  assert.equal(source.rows('ApprovalChain').some(row => row.code === 'CH_OVERTIME'), false)
  assert.equal(source.rows('RequestType').some(row => row.code === 'OVERTIME'), false)
})
