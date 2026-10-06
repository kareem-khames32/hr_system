'use strict'
// B2.9-أ: واجهة شروط صفات الموظف في محرر جمهور نوع الطلب — فحص نص الشاشة (من غير متصفح).
//  AU-01) الجزء موجود في المحرر، والشروط بتتبعت لما يبقى فيه شرط بس، وبتتحمّل من المتخزّن، والجملة بتذكرها، والدرجات من الكتالوج.
// Run (من api/): node --test test/request-audience-conditions-ui.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
const page = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'app', 'settings', 'request-types', 'page.tsx'), 'utf8').replace(/\r\n/g, '\n')

test('AU-01: محرر الجمهور فيه شروط صفات الموظف — بتتبعت لما يبقى فيه شرط بس، وبتتحمّل من المتخزّن، والجملة بتذكرها', () => {
  // نفس قيم الخادم بالحرف
  assert.ok(page.includes("const NATIONALITY_KINDS: Array<[string, string]> = [['SAUDI', 'سعودي'], ['EGYPTIAN', 'مصري'], ['RESIDENT', 'جنسية تانية']]"))
  assert.ok(page.includes("const CONTRACT_KINDS: Array<[string, string]> = [['permanent', 'عقد دائم'], ['fixed_term', 'عقد محدد المدة'], ['part_time', 'دوام جزئي'], ['seasonal', 'عقد موسمي']]"))
  // الفاضي مابيتبعتش: الشكل المتخزّن من غير شروط زي ما هو
  assert.ok(page.includes('...(conditionsOfForm(form).length ? { conditions: conditionsOfForm(form) } : {}),'))
  for (const line of ["...(form.natKinds.length ? [{ field: 'nationality', values: form.natKinds }] : []),", "...(form.contractKinds.length ? [{ field: 'contractType', values: form.contractKinds }] : []),",
    "...(form.gradeIds.length ? [{ field: 'grade', values: form.gradeIds }] : []),", "...(form.joinOp && form.joinDay ? [{ field: 'joinDate', op: form.joinOp, value: form.joinDay }] : []),"]) {
    assert.ok(page.includes(line), line)
  }
  // التحميل من المتخزّن، والحفظ بنفس نداء الجمهور القديم
  assert.ok(page.includes('...conditionsToForm(v),'))
  assert.ok(page.includes('const visibleTo = audienceOfForm(form, audienceIds())'))
  // شرط تاريخ من غير تاريخ مايتحفظش
  assert.match(page, /if \(form\.joinOp && !form\.joinDay\) \{\s+setModalError\('اختار التاريخ في شرط «تاريخ التعيين»'\)\s+return/)
  // الجزء في المحرر قبل سطر النتيجة، والدرجة بتظهر لما يبقى فيه درجات بس
  const block = page.indexOf('<div data-audience-conditions>'), result = page.indexOf('<span className="font-medium">النتيجة: </span>')
  assert.ok(block > 0 && block < result)
  assert.ok(page.includes('{grades.length > 0 && ('))
  assert.ok(page.includes("fetchCatalog<{ id: number; name: string }>('grades')"))
  // جملة «يظهر لـ…» بتذكر الشروط
  assert.ok(page.includes('return `${who} ${where}${conditionsText(audience, lookup.grade ?? String, lookup.custom)}`'))
  assert.ok(page.includes("return parts.length ? ` — بشرط: ${parts.join('، ')}` : ''"))
})
