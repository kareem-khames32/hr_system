const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('../node_modules/typescript')
function loadTs(file) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../../src/lib', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const module = { exports: {} }
  new Function('module', 'exports', code)(module, module.exports)
  return module.exports
}
const calendar = loadTs('calendar-range.ts')
const drafts = loadTs('employee-add-draft.ts')
class MemoryStorage {
  constructor() { this.data = new Map() }
  get length() { return this.data.size }
  key(index) { return [...this.data.keys()][index] ?? null }
  getItem(key) { return this.data.get(key) ?? null }
  setItem(key, value) { this.data.set(key, String(value)) }
  removeItem(key) { this.data.delete(key) }
}
test('week has seven local calendar dates across year and leap-month boundaries', () => {
  for (const [anchor, from, to] of [['2026-12-31', '2026-12-27', '2027-01-02'], ['2028-03-01', '2028-02-27', '2028-03-04']]) {
    const result = calendar.calendarRange(calendar.parseLocalDate(anchor), 'week')
    assert.equal(result.from, from); assert.equal(result.to, to); assert.equal(result.days.length, 7)
    assert.deepEqual(result.months, [from.slice(0, 7), to.slice(0, 7)])
    assert.equal(calendar.localDateKey(result.days.at(-1)), to)
  }
})
test('monthly ghost cells do not widen its export/statistics range and clipping is inclusive', () => {
  const result = calendar.calendarRange(calendar.parseLocalDate('2026-09-11'), 'month')
  assert.equal(result.from, '2026-09-01'); assert.equal(result.to, '2026-09-30'); assert.equal(result.days.length, 42)
  assert.deepEqual(calendar.intersectDateRange('2026-08-28', '2026-09-05', result.from, result.to), { from: '2026-09-01', to: '2026-09-05' })
  assert.equal(calendar.intersectDateRange('2026-10-01', '2026-10-05', result.from, result.to), null)
})
test('employee drafts retain entered text, qualifications and uploaded references only for their user', () => {
  global.sessionStorage = new MemoryStorage()
  const defaults = { firstNameAr: '', currency: 'SAR', status: 'probation', photoFileId: undefined }
  drafts.saveEmployeeAddDraft({ schemaVersion: 1, userId: 7, savedAt: '2026-09-11T12:00:00Z', currentStep: 4,
    form: { ...defaults, firstNameAr: 'مسودة اختبار', photoFileId: 12 }, qualifications: { education: [{ degree: 'bachelor', university: 'جامعة الاختبار' }] },
    qualificationDrafts: { skills: { name: 'كتابة جارية' } }, contractFileRef: 'file:9', contractFileName: 'contract.pdf',
    documentRefs: [{ docType: 'national_id', fileRef: 'file:10' }, { docType: 'cv', fileRef: 'javascript:bad' }] })
  assert.equal(drafts.loadEmployeeAddDraft(8, defaults), null)
  const restored = drafts.loadEmployeeAddDraft(7, defaults)
  assert.equal(restored.form.firstNameAr, 'مسودة اختبار'); assert.equal(restored.currentStep, 4)
  assert.equal(restored.form.photoFileId, 12); assert.equal(restored.qualifications.education.length, 1)
  assert.equal(restored.qualificationDrafts.skills.name, 'كتابة جارية'); assert.equal(restored.contractFileRef, 'file:9')
  assert.deepEqual(restored.documentRefs, [{ docType: 'national_id', fileRef: 'file:10' }])
  drafts.clearEmployeeAddDraft(7); assert.equal(drafts.loadEmployeeAddDraft(7, defaults), null)
})
test('logout removes every employee draft version while leaving unrelated storage alone; corrupt schema fails visibly', () => {
  const storage = new MemoryStorage(); global.sessionStorage = storage
  storage.setItem('employee-add-draft:v1:7', '{bad json'); storage.setItem('employee-add-draft:v0:8', 'old'); storage.setItem('unrelated', 'keep')
  assert.throws(() => drafts.loadEmployeeAddDraft(7, {}), /المسودة/)
  storage.setItem('employee-add-draft:v1:7', JSON.stringify({ schemaVersion: 8, userId: 7 }))
  assert.throws(() => drafts.loadEmployeeAddDraft(7, {}), /المسودة/)
  drafts.clearEmployeeAddDrafts(storage)
  assert.equal(storage.length, 1); assert.equal(storage.getItem('unrelated'), 'keep')
})
