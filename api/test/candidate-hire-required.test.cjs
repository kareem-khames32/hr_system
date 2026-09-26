'use strict'
// مراجعة 16 سبتمبر: التعيين من مرشح كان بيتخطى الحقول الإجبارية لإضافة موظف، ومرشح باسم غير عربي أو كلمة واحدة
// مكانش ينفع يتعين أبدًا. دلوقتي: زرار «تعيين» بيفتح نموذج إضافة الموظف متعبّي من المرشح، وPOST /candidates/:id/hire
// بياخد نفس بيانات الإضافة (HireCandidateDto = CreateEmployeeDto)، والخدمة نفسها بتفرض الحقول الإجبارية على كل مسار إنشاء.
const { test } = require('node:test'), assert = require('node:assert/strict'), path = require('node:path'), fs = require('node:fs')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true, compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
require('../node_modules/reflect-metadata')
const { ForbiddenException } = require('@nestjs/common')
const { plainToInstance } = require('../node_modules/class-transformer')
const { validateSync } = require('../node_modules/class-validator')
const { CandidatesController, HireCandidateDto } = require('../src/assets/candidates.controller')
const { EmployeesService, employeeCreateIssue } = require('../src/employees/employees.service')
const hire = require('../../src/lib/candidate-hire')
const root = path.resolve(__dirname, '../..')
const source = file => fs.readFileSync(path.join(root, file), 'utf8')

const complete = (extra = {}) => ({
  employeeCode: 'CAND900', fingerprintCode: '900', fullName: 'أحمد محمد السعيد', phone: '+966501234567', nationalId: '1012345678',
  birthDate: '1990-05-01', gender: 'male', nationality: 'سعودي', jobTitle: 'محاسب', departmentId: 3, branchId: 1,
  joinDate: '2026-09-01', basicSalary: 6000, ...extra,
})
const dtoMessages = body => validateSync(plainToInstance(HireCandidateDto, body), { whitelist: true }).flatMap(error => Object.values(error.constraints ?? {}))

test('POST /candidates/:id/hire بيتحقق من نفس الحقول الإجبارية بتاعة إضافة الموظف', () => {
  const old = dtoMessages({ employeeCode: 'CALRECRUIT', branchId: 1, basicSalary: 6000 })
  for (const text of ['رقم البصمة مطلوب', 'رقم الجوال مطلوب', 'رقم الهوية / الإقامة مطلوب', 'تاريخ الميلاد مطلوب', 'الجنس مطلوب',
    'الجنسية مطلوبة', 'المسمى الوظيفي مطلوب', 'القسم مطلوب', 'تاريخ التعيين مطلوب', 'الاسم الكامل بالعربي مطلوب']) {
    assert.ok(old.some(message => message.includes(text)), text)
  }
  assert.deepEqual(dtoMessages(complete()), [])
  assert.ok(dtoMessages(complete({ basicSalary: undefined })).some(message => message.includes('الراتب الأساسي مطلوب')))
})

test('الخدمة نفسها بتفرض الحقول الإجبارية وشكلها على أي مسار إنشاء، قبل أي قراءة أو كتابة', async () => {
  const today = '2026-09-16'
  assert.equal(employeeCreateIssue(complete(), today), null)
  assert.equal(employeeCreateIssue(complete({ fullName: 'Ahmed Ali' }), today), 'الاسم الكامل لازم يكون بالعربي')
  assert.equal(employeeCreateIssue(complete({ fullName: 'أحمد' }), today), 'اكتب الاسم الكامل بالعربي (الاسم الأول واسم العائلة على الأقل)')
  assert.equal(employeeCreateIssue({ employeeCode: 'X1', fullName: 'أحمد علي', branchId: 1, basicSalary: 6000 }, today), 'تاريخ الميلاد مطلوب')
  assert.equal(employeeCreateIssue(complete({ fingerprintCode: '' }), today), 'رقم البصمة مطلوب')
  assert.equal(employeeCreateIssue(complete({ basicSalary: 0 }), today), 'الراتب الأساسي لازم يكون رقم أكبر من صفر')
  // بلا مستودعات: لو الفحص اتأخر بعد أي قراءة كان هيقع TypeError مش 400
  const service = Object.create(EmployeesService.prototype)
  await assert.rejects(service.create({ employeeCode: 'CALRECRUIT', fullName: 'مرشح تعيين', branchId: 1, basicSalary: 6000, joinDate: '2026-09-16' }, 12, [1]),
    error => error.getStatus?.() === 400 && error.message === 'تاريخ الميلاد مطلوب')
  await assert.rejects(service.create(complete({ fullName: 'Ahmed Ali' }), 12, null), error => error.getStatus?.() === 400 && /بالعربي/.test(error.message))
})

test('التعيين بيبعت بيانات النموذج كاملة للخدمة بنطاق فرع المستخدم، وبيقفل المرشح؛ والفرع التاني ممنوع', async () => {
  const candidates = [{ id: 3, branchId: 1, stage: 'offer', fullName: 'Ahmed Ali' }]
  const repo = { findOne: async ({ where }) => candidates.find(row => row.id === where.id) ?? null, save: async row => row }
  const calls = []
  const controller = new CandidatesController(repo, { create: async (dto, actor, scope) => { calls.push({ dto: { ...dto }, actor, scope }); return { id: 99 } } })
  const hrBranch1 = { sub: 12, role: 'hr_manager', branchId: 1, employeeId: 21, permissions: ['candidates.manage', 'employees.create'] }
  const result = await controller.hire(3, Object.assign(new HireCandidateDto(), complete()), hrBranch1)
  assert.equal(result.candidate.stage, 'hired'); assert.equal(result.candidate.hiredEmployeeId, 99)
  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0].scope, [1]); assert.equal(calls[0].actor, 12)
  assert.equal(calls[0].dto.fullName, 'أحمد محمد السعيد', 'الاسم العربي من النموذج مش اسم المرشح القديم')
  assert.equal(calls[0].dto.status, 'probation'); assert.equal(calls[0].dto.nationalId, '1012345678'); assert.equal(calls[0].dto.fingerprintCode, '900')
  candidates.push({ id: 4, branchId: 1, stage: 'offer', fullName: 'مرشح' })
  await assert.rejects(controller.hire(4, Object.assign(new HireCandidateDto(), complete({ branchId: 4 })), hrBranch1), ForbiddenException)
  // التعيين = إضافة موظف: من غير employees.create ممنوع، حتى في فرعه وببيانات كاملة، ومن غير ما يلمس المرشح أو الخدمة
  await assert.rejects(controller.hire(4, Object.assign(new HireCandidateDto(), complete()), { ...hrBranch1, permissions: ['candidates.manage'] }),
    error => error instanceof ForbiddenException && /صلاحية إضافة موظف/.test(error.message))
  assert.equal(calls.length, 1); assert.equal(candidates[1].stage, 'offer')
  const admin = { sub: 1, role: 'super_admin', branchId: null, employeeId: null, permissions: ['*'] }
  assert.equal((await controller.hire(4, Object.assign(new HireCandidateDto(), complete({ branchId: 4 })), admin)).candidate.stage, 'hired')
  assert.equal(calls[1].scope, null)
})

test('شاشة التعيين: نموذج الإضافة متعبّي من المرشح (الاسم غير العربي في خانات الإنجليزي)، وشاشتا التوظيف بتفتحه', () => {
  assert.deepEqual(hire.candidateHireInitial({ fullName: 'Ahmed Ali', email: 'a@x.com', phone: '0501234567', positionTitle: 'محاسب', branchId: 4 }),
    { status: 'probation', nameEnFull: 'Ahmed Ali', personalEmail: 'a@x.com', phone: '0501234567', jobTitle: 'محاسب', branchId: '4' })
  assert.deepEqual(hire.candidateHireInitial({ fullName: 'Ahmed Samir Ali' }), { status: 'probation', firstNameEn: 'Ahmed', middleNameEn: 'Samir', lastNameEn: 'Ali' })
  assert.deepEqual(hire.candidateHireInitial({ fullName: 'خالد عبدالله سعد العتيبي', positionTitle: '' }),
    { status: 'probation', firstNameAr: 'خالد', fatherNameAr: 'عبدالله', grandNameAr: 'سعد', familyNameAr: 'العتيبي' })
  assert.deepEqual(hire.candidateHireInitial({ fullName: 'محمد عبد الله' }), { status: 'probation', nameArFull: 'محمد عبد الله' })
  assert.deepEqual(hire.candidateHireInitial({ fullName: 'أحمد' }), { status: 'probation', firstNameAr: 'أحمد', fatherNameAr: '', grandNameAr: '', familyNameAr: '' },
    'اسم كلمة واحدة: العائلة فاضية والنموذج بيطلبها')
  assert.equal(hire.candidateIdFromSearch('?candidateId=12'), 12)
  assert.equal(hire.candidateIdFromSearch(''), null)
  assert.equal(hire.candidateIdFromSearch('?candidateId=abc'), 'invalid')
  assert.equal(hire.candidateHireHref(7), '/employees/add?candidateId=7')
  assert.equal(hire.candidateHireBlock({ stage: 'hired' }), 'المرشح ده اتعين بالفعل')
  assert.equal(hire.candidateHireBlock({ stage: 'offer' }), null)

  const add = source('src/app/employees/add/page.tsx')
  assert.match(add, /candidate \? \(await hireCandidate\(candidate\.id, employeeData\)\)\.employee : await createEmployee\(employeeData\)/)
  assert.match(add, /initial=\{candidate \? candidateHireInitial\(candidate\) : undefined\}/)
  for (const file of ['src/app/recruitment/page.tsx', 'src/app/recruitment/applicants/page.tsx']) {
    const page = source(file)
    assert.match(page, /window\.location\.href = candidateHireHref\(candidate\.id\)/, file)
    assert.doesNotMatch(page, /hireTarget|submitHire|hireCandidate\(/, `${file}: نافذة التعيين القديمة اتشالت`)
    // زرار «تعيين» بيظهر بس لصاحب employees.create (نفس شرط POST /candidates/:id/hire)
    assert.match(page, /const canHire = can\('employees\.create'\)/, file)
    const buttons = page.match(/\w+\.stage === 'interview' \|\|/g) ?? []
    assert.ok(buttons.length > 0, file)
    assert.equal((page.match(/canHire && \(\w+\.stage === 'interview' \|\|/g) ?? []).length, buttons.length, `${file}: كل زرار تعيين ورا canHire`)
  }
  assert.match(source('src/lib/api.ts'), /export const hireCandidate = \(id: number, employee: Clearable<ApiEmployee>\)/)
})
