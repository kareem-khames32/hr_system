'use strict'
// B3.14: سجل المعالين — فحص من غير قاعدة (الدورة الفعلية في dependents.integration.cjs):
//  DU-01) القواعد: قيم الإضافة (الاسم والقرابة إلزاميين) والتعديل (المبعوت بس، والفاضي بيفضّي الاختياري)، وسبب الحذف، وحقول نموذج الطلب.
//  DU-02) الربط: موديول جديد مقفول في الباقة الأساسية بصلاحيته ووجهة طلبه، والكتابة تحت قفل صف الموظف ثم المعال والحكم بعده، ووجهة الطلب
//         في المحرك والإعدادات والواجهة، والبذرة زي ما هي، والكارت في الملف والملف الشخصي.
// Run (من api/): node --test test/dependents.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const rules = require('../src/dependents/dependent-rules')
const links = require('../src/dependents/dependent-requests')
const { MODULES, modulesOfPreset } = require('../src/modules-registry/registry')
const root = path.resolve(__dirname, '..', '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n')
const refuses = (work, label) => assert.throws(work, error => error?.getStatus?.() === 400, label)
const TODAY = '2026-10-08'

test('DU-01: values for adding and for editing, the removal reason, and the request form fields', () => {
  const clean = (raw, full = true) => rules.cleanDependentValues(raw, full, TODAY)
  assert.deepEqual(clean({ nameAr: '  يوسف   أحمد ', relation: 'SON' }), { nameAr: 'يوسف أحمد', nameEn: null, relation: 'SON', birthDate: null, nationalId: null, gender: null, isInsured: false })
  assert.deepEqual(clean({ nameAr: 'ليلى', nameEn: ' Layla ', relation: 'DAUGHTER', birthDate: TODAY, nationalId: ' 11 22 ', gender: 'FEMALE', isInsured: true, idExpiryDate: '2030-01-31' }),
    { nameAr: 'ليلى', nameEn: 'Layla', relation: 'DAUGHTER', birthDate: TODAY, nationalId: '11 22', gender: 'FEMALE', isInsured: true, idExpiryDate: '2030-01-31' })
  for (const bad of [{}, { nameAr: 'ي', relation: 'SON' }, { nameAr: 'ت'.repeat(151), relation: 'SON' }, { nameAr: 'يوسف' }, { nameAr: 'يوسف', relation: 'son' }, { nameAr: 'يوسف', relation: 'SON', birthDate: '2026-10-09' },
    { nameAr: 'يوسف', relation: 'SON', birthDate: '1899-12-31' }, { nameAr: 'يوسف', relation: 'SON', birthDate: '2020-02-30' }, { nameAr: 'يوسف', relation: 'SON', nationalId: 'اب' },
    { nameAr: 'يوسف', relation: 'SON', nationalId: '1'.repeat(31) }, { nameAr: 'يوسف', relation: 'SON', nationalId: 123456 }, { nameAr: 'يوسف', relation: 'SON', gender: 'M' }, { nameAr: 'يوسف', relation: 'SON', isInsured: 1 },
    { nameAr: 'يوسف', relation: 'SON', idExpiryDate: '31/01/2030' }, { nameAr: 'يوسف', relation: 'SON', nameEn: 5 }]) refuses(() => clean(bad), JSON.stringify(bad).slice(0, 60))
  // التعديل: المبعوت بس — والفاضي بيفضّي الاختياري، وتاريخ انتهاء الهوية الفاضي بيتساب
  assert.deepEqual([clean({}, false), clean({ nameEn: '', birthDate: null, gender: '', nationalId: '' }, false), clean({ isInsured: false, idExpiryDate: '' }, false), clean({ relation: 'OTHER' }, false)],
    [{}, { nameEn: null, birthDate: null, nationalId: null, gender: null }, { isInsured: false }, { relation: 'OTHER' }])
  for (const bad of [{ nameAr: '' }, { relation: null }, { birthDate: 'x' }]) refuses(() => clean(bad, false), JSON.stringify(bad))
  assert.equal(rules.cleanRemoveReason('  انفصال   موثّق '), 'انفصال موثّق')
  for (const bad of [undefined, '', 'اب', 5, 'ت'.repeat(301)]) refuses(() => rules.cleanRemoveReason(bad), 'reason')
  assert.deepEqual([rules.validDay('2024-02-29'), rules.validDay('2023-02-29'), rules.validDay('2024-2-9'), rules.validDay(20240229)], [true, false, false, false])
  assert.deepEqual([Object.keys(rules.DEPENDENT_RELATION_LABELS), Object.keys(rules.DEPENDENT_GENDER_LABELS)], [[...rules.DEPENDENT_RELATIONS], [...rules.DEPENDENT_GENDERS]])

  // حقول نموذج الطلب: حقول الوجهة الأول، وحقول الباني الخاصة بعدها، والمفاتيح المحجوزة مابتتكررش
  const form = links.dependentRequestFields(['يوسف — ابن (#3)'], { requiredFields: JSON.stringify(['dependentId', 'note']),
    customFields: JSON.stringify([{ key: 'dependentName', label: 'مكرر', type: 'text' }, { key: 'dependentId', label: 'محجوز', type: 'number' }, { key: 'hospital', label: 'المستشفى', type: 'text' }]) })
  const fields = JSON.parse(form.customFields)
  assert.deepEqual([fields.map(field => field.key), JSON.parse(form.requiredFields), fields[1].options, fields.filter(field => field.required).map(field => field.key)],
    [[...links.DEPENDENTS_REQUEST_CLIENT_KEYS, 'hospital', 'note'], ['dependentAction', 'note'], ['يوسف — ابن (#3)'], ['dependentAction', 'note']])
  assert.deepEqual([links.DEPENDENTS_REQUEST_HANDLER, [...links.DEPENDENTS_REQUEST_STAGED_KEYS], links.DEPENDENTS_REQUEST_CLIENT_KEYS.includes('isInsured')], ['dependents_update', ['dependentId'], false])
})

test('DU-02: a new closed module in the basic preset with its request handler, writes under the employee row lock then the dependent row, the request destination wiring, the seed untouched, and the card', () => {
  const module = MODULES.dependents
  assert.deepEqual([module.defaultEnabled, module.preset, module.permissions, module.routes, module.dependsOn, module.softUses, module.requestHandlers],
    [false, 'basic', ['dependents.manage'], [], ['employees'], ['documents'], ['dependents_update']])
  assert.ok(modulesOfPreset('basic').includes('dependents'))
  const { PERMISSIONS, PERMISSION_MODULES, ROLE_PRESETS } = require('../src/auth/permissions')
  assert.deepEqual(['dependents.manage' in PERMISSIONS, PERMISSION_MODULES.find(unit => unit.key === 'dependents').permissions, ROLE_PRESETS.find(role => role.code === 'hr_manager').permissions.includes('dependents.manage'),
    ROLE_PRESETS.find(role => role.code === 'employee').permissions.includes('dependents.manage')], [true, ['dependents.manage'], true, false])

  // العمليات: قفل صف الموظف والحكم عليه تحته، وبعده صف المعال؛ والكتابة بالأعمدة بس
  const source = read('api/src/dependents/dependent-rules.ts')
  const locked = source.slice(source.indexOf('async function lockedEmployee('), source.indexOf('async function assertNoDuplicate('))
  assert.match(locked, /findOne\(\{ where: \{ id: employeeId \}, lock: \{ mode: 'pessimistic_write' \} \}\)\n  if \(!employee \|\| \(actor\.allow && !actor\.allow\(employee\)\)\) throw new NotFoundException\(missing\)/)
  const add = source.slice(source.indexOf('export async function addDependent('), source.indexOf('async function lockedDependent('))
  assert.ok(add.indexOf('await lockedEmployee(') > 0 && add.indexOf('await lockedEmployee(') < add.indexOf('await assertNoDuplicate(') && add.indexOf('await assertNoDuplicate(') < add.indexOf('.insert('), 'القفل ← التكرار ← الإضافة')
  const row = source.slice(source.indexOf('async function lockedDependent('), source.indexOf('const CHANGE_LABELS'))
  assert.ok(row.indexOf('await lockedEmployee(') > 0 && row.indexOf('await lockedEmployee(') < row.indexOf("lock: { mode: 'pessimistic_write' }"), 'الموظف ثم المعال')
  assert.match(row, /if \(!row \|\| row\.status !== 'ACTIVE' \|\| row\.employeeId !== seen\.employeeId\) throw new NotFoundException\(DEPENDENT_NOT_FOUND\)/)
  assert.doesNotMatch(source, /getRepository\(Dependent\)\.save\(/, 'من غير حفظ كيان كامل')
  assert.equal((source.match(/await recordEmployeeChange\(/g) ?? []).length, 3, 'سطر تغيير للإضافة والتعديل والحذف')
  assert.match(source, /WITH \(UPDLOCK, HOLDLOCK\) WHERE \[code\] = @0 OR \[nameAr\] = @1/, 'نوع المستند تحت قفل مدى')
  assert.doesNotMatch(source.slice(source.indexOf('export class Dependent'), source.indexOf('export const DEPENDENTS_PERMISSION')), /default:/, 'الكيان من غير قيم افتراضية')
  const service = read('api/src/dependents/dependents.service.ts')
  assert.match(service, /return \{ userId: user\.sub, allow: \(employee\) => inBranchScope\(scope, employee\.branchId\) \}/)
  assert.equal((service.match(/this\.actor\(user\)/g) ?? []).length, 3, 'الإضافة والتعديل والحذف بحكم النطاق تحت القفل')
  const controller = read('api/src/dependents/dependents.controller.ts')
  assert.equal((controller.match(/@Perm\('dependents\.manage'\)/g) ?? []).length, 4)
  assert.ok(controller.indexOf("@Get('mine')") < controller.indexOf('@Get()'), '«معاليني» قبل القايمة')

  // وجهة الطلب: في المحرك والقايمة البيضا والتثبيت والإعدادات والواجهة — والبذرة زي ما هي
  const destinations = read('api/src/requests/destinations.service.ts'), requests = read('api/src/requests/requests.service.ts')
  assert.match(destinations, /\[DEPENDENTS_REQUEST_HANDLER\]: executeDependentsRequest,/)
  assert.match(destinations, /DEPENDENTS_UPDATE: \{ legacyHandler: 'employee_dependents', decision: 'RECORD_ONLY'/, 'النوع المزروع لسه «تسجيل فقط»')
  assert.match(requests, /\[DEPENDENTS_REQUEST_HANDLER\]: \[\.\.\.DEPENDENTS_REQUEST_CLIENT_KEYS, \.\.\.DEPENDENTS_REQUEST_STAGED_KEYS\],/)
  assert.match(requests, /if \(type\.destinationHandler === DEPENDENTS_REQUEST_HANDLER\) req\.payload = JSON\.stringify\(await stageDependentsRequest\(em, req\)\)/)
  assert.match(requests, /\.\.\.\(t\.destinationHandler === DEPENDENTS_REQUEST_HANDLER \? dependentRequestFields\(ownDependents, t\) : \{\}\),/)
  assert.match(read('api/src/seed/requests-seed.data.ts'), /\{ code: 'DEPENDENTS_UPDATE', nameAr: 'تحديث المعالين', category: 'personal_data', chain: 'CHAIN_HR', handler: 'none', phase: 'P2' \},/)
  assert.match(read('api/src/settings/settings.controller.ts'), /\{ key: 'dependents_update', labelAr: 'تحديث سجل المعالين \(إضافة، تعديل، حذف\)' \},/)
  assert.match(read('src/app/requests/page.tsx'), /dependents_update: 'تحديث سجل المعالين',/)
  const request = read('api/src/dependents/dependent-requests.ts')
  assert.match(request, /const actor = \{ userId: 0, requestId: req\.id \}/)
  assert.match(request, /updateDependent\(em, dependentId, values, actor, req\.requesterId\)/)
  assert.doesNotMatch(request, /isInsured/, 'الموظف مابيحددش التأمين')
  assert.doesNotMatch(request, /transaction\(/, 'كله بـem جوه معاملة المحرك')

  // الواجهة: الكارت في ملف الموظف وفي الملف الشخصي، ومابيطلبش حاجة والموديول مقفول
  const card = read('src/components/DependentsCard.tsx')
  assert.match(card, /const enabled = useModuleEnabled\('dependents'\)/)
  assert.match(card, /const manage = employeeId !== undefined && can\('dependents\.manage'\)/)
  assert.match(card, /if \(!visible\) return\n/)
  assert.match(read('src/app/employees/[id]/page.tsx'), /<DependentsCard employeeId=\{employee\.id\} \/>/)
  assert.match(read('src/app/profile/page.tsx'), /\{activeTab === 'info' && <DependentsCard \/>\}/)
  assert.match(read('src/lib/employee-history.ts'), /dependents: 'المعالين',/)
})
