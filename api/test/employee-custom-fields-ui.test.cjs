'use strict'
// B2.9-ب: واجهة الحقول المخصصة — فحص نص الشاشات (من غير متصفح).
//  FU-01) مكتبة الواجهة بنفس قيم الخادم (الأنواع، ونعم/لا) وبمساراته.
//  FU-02) كارت «بيانات إضافية»: مابيظهرش قبل الترحيل أو من غير حقول، والتعديل للي الخادم سمح له بس، واللي اتغيّر بس بيتبعت، وفي ملف الموظف.
//  FU-03) شاشة «حقول ملف الموظف»: المفتاح والنوع مقفولين في التعديل، ورسالة قبل الترحيل، ومكانها في القوايم بصلاحية الإعدادات وفي سجل الموديولات.
//  FU-04) محرر جمهور نوع الطلب: شرط الحقل المخصص بيتبعت للحقول اللي عليها قيم بس، وبيتحمّل من المتخزّن، وشرط على حقل مابقاش متاح بيتشال.
// Run (من api/): node --test test/employee-custom-fields-ui.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const root = path.join(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')
const lib = read('src/lib/employee-fields-api.ts'), card = read('src/components/EmployeeCustomFieldsCard.tsx'), screen = read('src/app/settings/employee-fields/page.tsx')
const file = read('src/app/employees/[id]/page.tsx'), types = read('src/app/settings/request-types/page.tsx')
const has = (text, line) => assert.ok(text.includes(line), line)

test('FU-01: مكتبة الواجهة بنفس قيم الخادم وبمساراته', () => {
  const rules = require('../src/employees/employee-custom-fields')
  const listed = [...lib.matchAll(/\['(TEXT|NUMBER|DATE|CHOICE|YESNO)', '[^']+'\]/g)].map(match => match[1])
  assert.deepEqual(listed, [...rules.CUSTOM_FIELD_TYPES])
  has(lib, `export const FIELD_YES = '${rules.CUSTOM_YES}', FIELD_NO = '${rules.CUSTOM_NO}'`)
  for (const line of ["apiFetch<ApiEmployeeFieldDefinitions>('/settings/employee-fields')", "apiFetch<AudienceFieldOption[]>('/settings/employee-fields/audience')",
    "apiFetch<ApiEmployeeField>('/settings/employee-fields', { method: 'POST', body: JSON.stringify(input) })", "apiFetch<ApiEmployeeField>(`/settings/employee-fields/${id}`, { method: 'PATCH', body: JSON.stringify(input) })",
    'apiFetch<ApiEmployeeFieldValues>(`/employees/${employeeId}/custom-fields`)', "apiFetch<ApiEmployeeFieldValues>(`/employees/${employeeId}/custom-fields`, { method: 'PUT', body: JSON.stringify({ values }) })"]) has(lib, line)
  // من غير قيمة «—»، ونعم/لا بالعربي
  has(lib, "  return draft === '' ? '—' : audienceValueLabel(field.type, draft)")
  has(lib, "type !== 'YESNO' ? value : value === FIELD_YES ? 'نعم' : value === FIELD_NO ? 'لا' : value")
})

test('FU-02: كارت «بيانات إضافية» — مابيظهرش قبل الترحيل أو من غير حقول، والتعديل للي الخادم سمح له، واللي اتغيّر بس بيتبعت', () => {
  has(card, '  if (!data?.available || data.fields.length === 0) return null')
  has(card, '        {data.canEdit && !editing && (')
  // اللي اتغيّر بس، والفاضي = من غير قيمة، ومن غير تغيير مفيش نداء
  has(card, "      if (next !== employeeFieldDraft(field)) changed[field.fieldKey] = next === '' ? null : next")
  assert.match(card, /if \(Object\.keys\(changed\)\.length === 0\) \{\s+setEditing\(false\)\s+return\s+\}/)
  has(card, '      setData(await saveEmployeeFieldValues(employeeId, changed))')
  // الإلزامي بيتراجع قبل الإرسال، والمقيّد متعلّم
  has(card, "    const missing = data.fields.find((field) => field.required && (draft[field.fieldKey] ?? '').trim() === '')")
  has(card, '{field.restricted && <span className="text-xs text-amber-600"> (للموارد البشرية بس)</span>}')
  // قيمة قديمة مش في القايمة دلوقتي بتفضل اختيار ظاهر
  has(card, "field.options.includes(value) || value === '' ? field.options : [value, ...field.options]")
  // فشل التحميل = الكارت مابيظهرش (مفيش رسالة خطأ بتكشف حاجة)
  has(card, '    fetchEmployeeFieldValues(employeeId).then((result) => { if (alive) setData(result) }).catch(() => undefined)')
  // في ملف الموظف، آخر تبويب «البيانات الشخصية»
  has(file, "import EmployeeCustomFieldsCard from '@/components/EmployeeCustomFieldsCard'")
  const mounted = file.indexOf('<EmployeeCustomFieldsCard employeeId={employee.id} />')
  assert.ok(mounted > file.indexOf("{activeTab === 'personal' && (") && mounted < file.indexOf("{activeTab === 'employment' && ("))
})

test('FU-03: شاشة «حقول ملف الموظف» — المفتاح والنوع مقفولين في التعديل، ورسالة قبل الترحيل، ومكانها في القوايم وسجل الموديولات', () => {
  const rules = require('../src/employees/employee-custom-fields')
  has(screen, `const FIELD_KEY = ${rules.CUSTOM_FIELD_KEY}`)
  assert.equal((screen.match(/disabled=\{!!editing\}/g) ?? []).length, 2, 'المفتاح والنوع')
  // التعديل مابيبعتش المفتاح ولا النوع
  has(screen, '      if (editing) await updateEmployeeField(editing.id, shared)')
  has(screen, '      else await createEmployeeField({ ...shared, fieldKey: form.fieldKey.trim(), type: form.type })')
  assert.doesNotMatch(screen.slice(screen.indexOf('const shared = {'), screen.indexOf('    try {', screen.indexOf('const shared = {'))), /fieldKey|type: form\.type/)
  has(screen, "      ...(form.type === 'CHOICE' ? { options } : {}),")
  has(screen, '        {!loading && !available && (')
  has(screen, '          {available && (')
  // القوايم الثلاثة بصلاحية الإعدادات، والمسار تبع موديول الموظفين
  has(read('src/app/settings/page.tsx'), "href: '/settings/employee-fields', permission: 'settings.manage', icon: ListPlus },")
  has(read('src/components/layout/Sidebar.tsx'), "      { label: 'حقول ملف الموظف', href: '/settings/employee-fields', perm: 'settings.manage' },")
  has(read('src/components/layout/pageTitles.ts'), "  ['/settings/employee-fields', 'حقول ملف الموظف'],")
  assert.ok(require('../src/modules-registry/registry').MODULES.employees.routes.includes('/settings/employee-fields'))
})

test('FU-04: محرر الجمهور — شرط الحقل المخصص للحقول اللي عليها قيم بس، وبيتحمّل من المتخزّن، وشرط حقل مابقاش متاح بيتشال', () => {
  has(types, "  ...Object.entries(form.customConds).filter(([, values]) => values.length).map(([key, values]) => ({ field: 'custom', key, values })),")
  has(types, "    customConds: Object.fromEntries((Array.isArray(audience?.conditions) ? audience!.conditions! : []).filter((condition) => condition.field === 'custom' && condition.key)")
  has(types, '  customConds: {},')
  // الحقول من مسار الشرط (المتاح بس)، والجزء جوه شروط الصفات وقبل سطر النتيجة
  has(types, '    fetchAudienceFieldOptions().then((rows) => setCustomFields(Array.isArray(rows) ? rows : [])).catch(() => undefined)')
  const block = types.indexOf('<div data-audience-conditions>'), custom = types.indexOf('data-audience-custom={field.fieldKey}'), result = types.indexOf('<span className="font-medium">النتيجة: </span>')
  assert.ok(block > 0 && block < custom && custom < result)
  has(types, 'onChange={() => setForm({ ...form, customConds: { ...form.customConds, [field.fieldKey]: toggleId(customCondOf(form.customConds, field.fieldKey), option) } })}')
  // مفتاح حقل من أسماء Object (constructor) مايتقراش من سلسلة الوراثة (Codex CRP2T-B-N02): القراءة بالمفاتيح المملوكة بس
  has(types, "const customCondOf = (conds: Record<string, string[]>, key: string): string[] => (Object.prototype.hasOwnProperty.call(conds, key) ? conds[key] : [])")
  has(types, '<input type="checkbox" checked={(customCondOf(form.customConds, field.fieldKey)).includes(option)}')
  assert.equal(types.includes('form.customConds[field.fieldKey]'), false)
  // شرط متخزّن على حقل مابقاش متاح: ظاهر بمفتاحه، وزرار بيشيله
  has(types, '{Object.keys(form.customConds).filter((key) => form.customConds[key].length > 0 && !customFields.some((field) => field.fieldKey === key)).map((key) => (')
  has(types, 'onClick={() => setForm({ ...form, customConds: { ...form.customConds, [key]: [] } })}>إزالة الشرط</button>')
  // جملة «يظهر لـ…» بتذكر الحقل باسمه
  has(types, "      return `${field?.label ?? condition.key ?? 'حقل مخصص'}: ${values.map((value) => audienceValueLabel(field?.type ?? '', String(value))).join(' أو ')}`")
  has(types, '    custom: (key: string) => customFields.find((field) => field.fieldKey === key) }')
})
