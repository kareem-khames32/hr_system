'use strict'
// B2.10: واجهة فترات الخدمة وإعادة التعيين — فحص نص الشاشات (من غير متصفح).
//  PU-01) الإرجاع القديم لموظف ملفه مُصفّى: الواجهة بتعرف رد الخادم بكوده، وبتعرض تحذيره وتاخد سبب مكتوب، وغير كده زي ما هي.
//  PU-02) «إعادة تعيين»: الزرار بصلاحية إنشاء موظف، والنافذة بتسأل الخادم عن الإتاحة وبتعرض سبب المنع بنصه، وحدود التاريخ من الخادم،
//         والتاريخ والسبب إجباريين، والضغطة التانية والطلب شغال مابتبعتش تاني؛ ونافذة الإرجاع القديم بتدلّ عليها.
//  PU-03) قسم «فترات الخدمة» في ملف الموظف: بيظهر لموظف له فترة مقفولة بس، وسبب الخروج بمسماه، والخادم على المسارين بصلاحيتهم.
// Run (من api/): node --test test/employment-periods-ui.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const root = path.join(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')
const has = (text, line) => assert.ok(text.includes(line), line)

test('PU-01: إرجاع موظف ملفه مُصفّى — الواجهة بتعرف رد الخادم بكوده، وبتاخد سبب مكتوب، وغير المُصفّى زي ما هو', () => {
  const api = read('src/lib/api.ts'), page = read('src/app/employees/archived/page.tsx'), server = require('../src/employees/employees.service')
  // نفس كود الخادم بالحرف، والسبب بيتبعت لما يتكتب بس
  has(api, `export const SETTLED_RETURN_REASON_REQUIRED = '${server.SETTLED_RETURN_REASON_REQUIRED}'`)
  has(api, 'post<ApiEmployee>(`/employees/${id}/reactivate`, reason ? { reason } : undefined)')
  // أول محاولة زي الأول (من غير سبب)، والنافذة بتتفتح لما الخادم يطلب السبب بس وبرسالته هو
  has(page, '      await reactivateEmployee(id)\n      await loadData()')
  has(page, '      if (err instanceof ApiError && err.details?.code === SETTLED_RETURN_REASON_REQUIRED) {')
  has(page, '        setSettledReturn({ id, warning: err.message })')
  has(page, '<div className="bg-amber-50 text-amber-800 rounded-xl p-4 text-sm">{settledReturn.warning}</div>')
  // السبب إجباري في الواجهة برضه، وبيتبعت من غير فراغات، والضغطة التانية والطلب شغال مابتبعتش تاني
  has(page, '    if (!settledReturn || returning) return')
  has(page, '    if (returnReason.trim().length < 5) {')
  has(page, '      await reactivateEmployee(settledReturn.id, returnReason.trim())')
  has(page, '        {settledReturn && (')
  // نصوص التأكيد القديمة زي ما هي
  has(page, "? 'الموظف منتهي الخدمة — العودة على رأس العمل هترجعه نشطاً بنفس ملفه وتاريخه الوظيفي. متأكد؟'")
  has(page, "        : 'هل تريد إعادة تفعيل هذا الموظف؟'")
})

test('PU-02: «إعادة تعيين» — الزرار بصلاحية إنشاء موظف، والإتاحة وحدود التاريخ من الخادم، والتاريخ والسبب إجباريين', () => {
  const api = read('src/lib/api.ts'), page = read('src/app/employees/archived/page.tsx'), dialog = read('src/components/RehireDialog.tsx')
  has(api, 'export const fetchEmploymentPeriods = (id: number) => get<ApiEmploymentPeriods>(`/employees/${id}/employment-periods`)')
  has(api, '  post<ApiEmployee>(`/employees/${id}/rehire`, { startDate, reason })')
  // الزرار للي معاه «إنشاء موظف» بس (نفس صلاحية الخادم)، وبيفتح النافذة للموظف المختار؛ وبعد التنفيذ القايمة بتتحدّث
  has(page, "                      {can('employees.create') && (\n                        <button\n                          onClick={() => setRehireFor({ id: emp.id, name: emp.name })}")
  has(page, '        <RehireDialog target={rehireFor} onClose={() => setRehireFor(null)} onDone={async () => { setRehireFor(null); await loadData() }} />')
  // النافذة بتسأل الخادم عن الإتاحة أول ما تتفتح، والتاريخ الافتراضي النهارده أو أول يوم مقبول لو بعده
  has(dialog, '    fetchEmploymentPeriods(targetId).then((result) => {')
  has(dialog, "      const today = localToday(), min = result.rehire?.minStartDate ?? ''\n      setStartDate(min && min > today ? min : today)")
  // قبل الترحيل، أو مش متاحة: سبب الخادم بنصه، ومن غير نموذج ولا زرار تنفيذ
  has(dialog, '  const rehire = info?.ready ? info.rehire : null')
  has(dialog, '          {info && !info.ready && (')
  has(dialog, "<div className=\"bg-amber-50 text-amber-800 rounded-xl p-4 text-sm\" data-rehire-blocked>{rehire?.blocked ?? 'إعادة التعيين مش متاحة للموظف ده'}</div>")
  assert.equal(dialog.split('{rehire?.available && (').length - 1, 2, 'النموذج وزرار التنفيذ للمتاح بس')
  // حدود التاريخ من الخادم على الخانة، والتحذير بيقول اللي هيحصل
  has(dialog, 'value={startDate} min={rehire.minStartDate ?? undefined} max={rehire.maxStartDate}')
  has(dialog, 'إعادة التعيين بتبدأ فترة خدمة جديدة بنفس الملف والكود: مدة الخدمة (مكافأة نهاية الخدمة) ورصيد الإجازات بيبدأوا من تاريخ المباشرة الجديد،')
  // التاريخ والسبب إجباريين، والسبب من غير فراغات، وطلب واحد في المرة، ورفض الخادم بيتعرض بنصه
  has(dialog, '    if (saving) return\n    if (!startDate) {')
  has(dialog, '    if (reason.trim().length < 5) {')
  has(dialog, '      await rehireEmployee(target.id, startDate, reason.trim())\n      await onDone()')
  has(dialog, "      setError(err instanceof Error ? err.message : 'تعذرت إعادة التعيين')")
  // نافذة الإرجاع القديم (الجزء أ) بتدلّ على الإجراء الجديد
  has(page, 'لو راجع بعقد جديد: اقفل النافذة دي واستخدم «إعادة تعيين» — بتبدأ مدة خدمته ورصيده من تاريخ المباشرة الجديد.')
})

test('PU-03: قسم «فترات الخدمة» في ملف الموظف لموظف له فترة مقفولة بس، والمسارين في الخادم بصلاحيتهم', () => {
  const card = read('src/components/EmploymentPeriodsCard.tsx'), file = read('src/app/employees/[id]/page.tsx'), controller = read('api/src/employees/employees.controller.ts')
  has(card, '  if (!data?.ready || data.periods.length === 0) return null')
  has(card, '    fetchEmploymentPeriods(employeeId).then((result) => { if (alive) setData(result) }).catch(() => undefined)')
  has(card, '                <td className="py-2">{terminationReasonLabel(period.exitReason)}</td>')
  has(card, '              <td className="py-2 whitespace-nowrap">{data.current.periodNo} (الحالية)</td>')
  has(file, '              <EmploymentPeriodsCard employeeId={employee.id} />')
  // الخادم: القراءة بصلاحية عرض الموظفين، والتنفيذ بصلاحية إنشاء موظف، والاتنين بنطاق فروع الحساب
  has(controller, "  @Perm('employees.view')\n  @Get(':id/employment-periods')\n  employmentPeriods(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtPayload) {\n    return this.employees.employmentPeriods(id, branchScopeOf(user))")
  has(controller, "  @Perm('employees.create')\n  @Post(':id/rehire')")
  // B4.8 (أ): الرد بياخد حكم «الإخفاء الجزئي» زي باقي ردود ملف الموظف
  has(controller, '    return projectEmployee(await this.employees.rehire(id, body, branchScopeOf(user), user.sub), user, await this.employees.partialMasking())')
})
