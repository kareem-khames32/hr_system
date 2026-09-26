// عزل الفروع (قرار المالك 16 سبتمبر): أنواع الخصم والمكافأة والكتالوجات المشتركة لكل الشركة — حساب الفرع يشوفها بس؛
// وسلسلة الاعتماد اللي بتتعمل تلقائي لنوع طلب خاص بفرع بتاخد نفس الفرع (فرعه يعدّلها والفروع التانية ماتشوفهاش).
// اختبارات صرفة بلا قاعدة بيانات: الدوال الحقيقية على مستودعات وهمية.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')

const { TypedDeductionsService } = require('../src/payroll/typed-deductions.service')
const { BonusesService } = require('../src/payroll/bonuses.service')
const { CatalogsController } = require('../src/assets/catalogs.controller')
const { SettingsController } = require('../src/settings/settings.controller')

const branchHr = { sub: 12, role: 'hr_manager', branchId: 1, permissions: ['deductions.manage', 'bonuses.manage', 'settings.manage', 'request_types.manage', 'approval_chains.manage'] }
const otherBranchHr = { ...branchHr, sub: 99, branchId: 2 }
const owner = { sub: 1, role: 'super_admin', branchId: null, permissions: [] }
const companyWide403 = (err) => err.getStatus?.() === 403 && /لكل الشركة/.test(err.message)
const untouched = () => assert.fail('حساب الفرع ما يوصلش للقاعدة')
const noDb = new Proxy({}, { get: () => untouched })

test('deduction and bonus types: a branch account gets 403 on create/update before any DB access; super_admin passes the guard', async () => {
  for (const Service of [TypedDeductionsService, BonusesService]) {
    const fake = { types: noDb, manager: { transaction: untouched } }
    for (const user of [branchHr, { ...branchHr, branchId: null }]) {
      await assert.rejects(Service.prototype.createType.call(fake, user, { code: 'X' }), companyWide403, Service.name)
      await assert.rejects(Service.prototype.updateType.call(fake, user, 5, { isActive: false }), companyWide403, Service.name)
    }
    // الحساب العام يعدّي الفحص ويوصل للمعاملة
    let reached = false
    await Service.prototype.updateType.call({ manager: { transaction: async () => { reached = true; return 'ok' } } }, owner, 5, { isActive: false })
    assert.equal(reached, true, Service.name)
  }
})

test('shared catalogs: branch account is view-only (403) for every company-wide kind; devices keep their own branch check', async () => {
  const saved = []
  const repo = {
    create: (data) => data,
    findOne: async () => ({ id: 3, name: 'قديم', branchId: 1, serialNumber: 'SN1' }),
  }
  const controller = Object.create(CatalogsController.prototype)
  Object.assign(controller, {
    repoOf: () => repo,
    pick: (_kind, body) => ({ ...body }),
    validate: () => undefined,
    saveUnique: async (_repo, row) => { saved.push(row); return row },
    assertBranch: async () => undefined,
    deviceView: async (row) => row,
    withoutSecrets: (row) => row,
  })
  for (const kind of ['grades', 'job-titles', 'asset-types', 'permission-types', 'cost-centers', 'doc-types']) {
    await assert.rejects(controller.create(kind, { name: 'جديد' }, branchHr), companyWide403, kind)
    await assert.rejects(controller.update(kind, 3, { name: 'معدل' }, branchHr), companyWide403, kind)
  }
  assert.equal(saved.length, 0)
  // الأجهزة: حساب الفرع يضيف ويعدّل جهاز فرعه عادي
  await controller.create('devices', { branchId: 1, serialNumber: 'SN2' }, branchHr)
  await controller.update('devices', 3, { name: 'جهاز' }, branchHr)
  // الحساب العام يعدّل الكتالوج المشترك
  await controller.create('grades', { name: 'درجة' }, owner)
  await controller.update('job-titles', 3, { name: 'مسمى' }, owner)
  assert.equal(saved.length, 4)
})

// نوع طلب جديد بدون سلسلة: السلسلة التلقائية تتسجل بنفس فرع النوع، والبحث عنها جوه نفس النطاق
function requestTypeHarness(existingChains = []) {
  const chains = [...existingChains]
  const lookups = []
  const controller = Object.create(SettingsController.prototype)
  Object.assign(controller, {
    validateAudience: async () => null,
    isKnownHandler: () => true,
    validateCustomFields: () => undefined,
    withDestinationStatus: (row) => row,
    requestTypes: {
      manager: { getRepository: () => ({ existsBy: async () => true }) },
      count: async () => 69,
      findOne: async () => null,
      create: (row) => row,
      save: async (row) => ({ id: 80, ...row }),
    },
    chains: {
      findOne: async ({ where }) => {
        lookups.push(where)
        if (where.id !== undefined) return chains.find((c) => c.id === where.id) ?? null
        return chains.find((c) => c.code === where.code &&
          (typeof where.branchId === 'object' ? c.branchId == null : c.branchId === where.branchId)) ?? null
      },
      create: (row) => row,
      save: async (row) => { const saved = { id: 100 + chains.length, ...row }; chains.push(saved); return saved },
    },
  })
  return { controller, chains, lookups }
}

test('auto chain for a branch-only request type is saved on the same branch, and the lookup never reuses another scope', async () => {
  // حساب الفرع: النوع لفرعه، وسلسلته لفرعه برضه — حتى لو فيه سلسلة عامة قديمة بنفس الكود
  const legacy = { id: 7, code: 'CH_CUSTOM_70', branchId: null }
  const branch = requestTypeHarness([legacy])
  const type = await branch.controller.createRequestType({ nameAr: 'طلب فرع', category: 'general' }, branchHr)
  assert.equal(type.branchId, 1)
  const chain = branch.chains.find((c) => c.id === type.approvalChainId)
  assert.ok(chain && chain !== legacy, 'ما يعيدش استخدام سلسلة عامة لنوع فرع')
  assert.equal(chain.branchId, 1)
  assert.equal(chain.code, 'CH_CUSTOM_70')
  assert.equal(chain.requestTypeCode, 'CUSTOM_70')
  assert.equal(branch.lookups.at(-1).branchId, 1)

  // فرعه يقدر يعدّل سلسلته (نفس فحص مسارات تعديل السلسلة)
  assert.doesNotThrow(() => SettingsController.prototype.assertChainScope.call(branch.controller, branchHr, chain.branchId))
  assert.throws(() => SettingsController.prototype.assertChainScope.call(branch.controller, otherBranchHr, chain.branchId), (err) => err.getStatus?.() === 403)

  // الحساب العام بنوع لكل الشركة: السلسلة عامة، والبحث بـ IsNull مش بأي فرع
  const company = requestTypeHarness([{ id: 9, code: 'CH_CUSTOM_70', branchId: 1 }])
  const companyType = await company.controller.createRequestType({ nameAr: 'طلب عام', category: 'general' }, owner)
  assert.equal(companyType.branchId, null)
  const companyChain = company.chains.find((c) => c.id === companyType.approvalChainId)
  assert.notEqual(companyChain.id, 9, 'ما يربطش نوع عام بسلسلة فرع')
  assert.equal(companyChain.branchId ?? null, null)
  assert.equal(typeof company.lookups.at(-1).branchId, 'object', 'IsNull() صريح')

  // الحساب العام بنوع لفرع 1: السلسلة لفرع 1
  const ownerBranch = requestTypeHarness()
  const ownerBranchType = await ownerBranch.controller.createRequestType({ nameAr: 'طلب فرع', category: 'general', branchId: 1 }, owner)
  assert.equal(ownerBranch.chains.find((c) => c.id === ownerBranchType.approvalChainId).branchId, 1)
})

test('linking an existing chain: a branch account cannot link another branch chain, and a type cannot use a chain from a different branch', async () => {
  const { controller } = requestTypeHarness([{ id: 5, code: 'CH_B2', branchId: 2 }, { id: 6, code: 'CH_ALL', branchId: null }, { id: 8, code: 'CH_B1', branchId: 1 }])
  await assert.rejects(controller.createRequestType({ nameAr: 'x', category: 'general', approvalChainId: 5 }, branchHr), /سلسلة الاعتماد غير موجودة/)
  await controller.createRequestType({ nameAr: 'x', category: 'general', approvalChainId: 6 }, branchHr)
  await controller.createRequestType({ nameAr: 'x', category: 'general', approvalChainId: 8 }, branchHr)
  await assert.rejects(controller.createRequestType({ nameAr: 'x', category: 'general', approvalChainId: 8 }, owner), /خاصة بفرع/)
})

test('chain list: another branch never sees a chain made for a branch-only type (even a legacy null-branch row) nor its type name', async () => {
  const chains = [
    { id: 1, code: 'CH_LEAVE', branchId: null, requestTypeCode: 'LEAVE' },
    { id: 102, code: 'CH_CUSTOM_70', branchId: null, requestTypeCode: 'CUSTOM_70' },
    { id: 110, code: 'CH_CUSTOM_80', branchId: 1, requestTypeCode: 'CUSTOM_80' },
  ]
  const types = [
    { code: 'LEAVE', nameAr: 'إجازة', category: 'leave', branchId: null, approvalChainId: 1 },
    { code: 'CUSTOM_70', nameAr: 'طلب فرع اختبار', category: 'general', branchId: 1, approvalChainId: 102 },
    { code: 'CUSTOM_80', nameAr: 'طلب فرع جديد', category: 'general', branchId: 1, approvalChainId: 110 },
  ]
  const fake = {
    // IsNull() = عامة، وIn(فروع) = نسخ فروع الحساب (نطاق فرع أو أكتر)
    chains: { find: async ({ where }) => Array.isArray(where)
      ? chains.filter((c) => where.some((w) => typeof w.branchId === 'object'
        ? (w.branchId.type === 'in' ? w.branchId.value.includes(c.branchId) : c.branchId == null)
        : c.branchId === w.branchId))
      : chains },
    steps: { find: async () => [] },
    requestTypes: { find: async () => types },
  }
  const list = (user) => SettingsController.prototype.listChains.call(fake, user)
  const other = await list(otherBranchHr)
  assert.deepEqual(other.map((c) => c.id), [1])
  assert.ok(!JSON.stringify(other).includes('طلب فرع'))
  assert.deepEqual((await list(branchHr)).map((c) => c.id), [1, 102, 110])
  assert.equal((await list(branchHr)).find((c) => c.id === 110).requestTypeName, 'طلب فرع جديد')
  assert.deepEqual((await list(owner)).map((c) => c.id), [1, 102, 110])
})
