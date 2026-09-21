// قاعدة المالك: الزرار اللي بيوديك شاشة تانية علشان تعمل حاجة = عيب. الثلاث مواضع دي بقت
// بتنفّذ الإجراء في مكان المستخدم: طلب الخطاب من ملف الموظف، و«بصم رغم الإجازة» بتفتح سجل
// الإجازات على الصف نفسه، والقرار على الإذن من صفّه — بنفس نقاط الاستدعاء والصلاحيات القائمة.
// فحص مصدر الواجهة فقط؛ لا خادم ولا SQL. (الملفات على القرص CRLF — تُطبّع قبل الفحص)
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')

const EMPLOYEE_PAGE = 'src/app/employees/[id]/page.tsx'
const ATTENDANCE_PAGE = 'src/app/attendance/page.tsx'
const LEAVES_PAGE = 'src/app/leaves/page.tsx'
const PERMISSIONS_PAGE = 'src/app/attendance/permissions/page.tsx'

test('طلب الخطاب يُرسل من ملف الموظف نفسه: لا كارت يوجّه إلى «طلباتي»', () => {
  const page = read(EMPLOYEE_PAGE)
  // الكارت (في التبويب وفي النافذة) بقى زرار اختيار، مش رابط لشاشة تانية
  assert.ok(!page.includes('/requests?type='), 'لسه فيه تحويل إلى شاشة الطلبات')
  assert.equal(page.match(/onClick=\{\(\) => pickLetter\(template\.id\)\}/g)?.length, 2, 'الكارت والنسخة اللي في النافذة')
  assert.match(page, /aria-pressed=\{letterTemplate === template\.id\}/)
  // الحقل الوحيد اللي بيعرّفه الخادم لمعالج letter_pdf_generator هو «الغرض من الخطاب»
  assert.match(page, /الغرض من الخطاب/)
  assert.equal(page.match(/\{letterPanel\('(tab|modal)'\)\}/g)?.length, 2, 'نفس الحقل والنتيجة في المكانين')
})

test('الخطاب يمر بنفس نقطة الإنشاء وبوابة النيابة اللي في شاشة «طلباتي»', () => {
  const page = read(EMPLOYEE_PAGE)
  assert.match(page, /import \{[\s\S]*?\n {2}createRequest,\n[\s\S]*?\} from '@\/lib\/api'/, 'createRequest من نفس مكتبة الـAPI')
  assert.match(page, /await createRequest\(\n\s*letterTemplate,\n\s*\{ purpose: letterPurpose\.trim\(\) \},\n\s*true,\n\s*letterForSelf \? undefined : employee\.id\n\s*\)/)
  // نفس بوابة شاشة «طلباتي»: النيابة عن غيره تحتاج requests.create_on_behalf، والموظف لنفسه لا
  assert.match(page, /const letterForSelf = !!employee && getCurrentUser\(\)\?\.employeeId === employee\.id/)
  assert.match(page, /const canRequestLetter = letterForSelf \|\| can\('requests\.create_on_behalf'\)/)
  assert.equal(page.match(/\{canRequestLetter \? \(/g)?.length, 2, 'البوابة على الكروت في التبويب والنافذة')
  // النتيجة في مكانها: سطر نجاح برقم الطلب أو رسالة الخادم العربية كما هي
  assert.match(page, /setLetterDone\(`تم إرسال طلب «\$\{template\?\.name \?\? 'الخطاب'\}» برقم #\$\{created\.id\}/)
  assert.match(page, /setLetterError\(err instanceof Error \? err\.message : 'تعذّر إرسال طلب الخطاب'\)/)
  assert.match(page, /role="status"/)
  assert.match(page, /\{letterError && <p role="alert"/)
})

test('«بصم رغم الإجازة» بتفتح سجل الإجازات على الموظف ويومه، مش على قائمة كل الإجازات', () => {
  const attendance = read(ATTENDANCE_PAGE)
  assert.ok(!/href="\/leaves"/.test(attendance), 'لسه بيروح /leaves بلا فلتر')
  assert.match(attendance, /href=\{leaveConflictHref\(record\)\}/)
  assert.match(attendance, /`\/leaves\?employee=\$\{encodeURIComponent\(record\.employeeCode\.startsWith\('#'\) \? record\.employeeName : record\.employeeCode\)\}&date=\$\{record\.date\}`/)
})

test('سجل الإجازات بيقرأ employee/date ويحطهم في فلاتره القائمة (بحث + مدى التاريخ) بلا فلتر جديد', () => {
  const leaves = read(LEAVES_PAGE)
  assert.match(leaves, /const employee = \(qs\.get\('employee'\) \?\? ''\)\.trim\(\)/)
  assert.match(leaves, /const date = \(qs\.get\('date'\) \?\? ''\)\.trim\(\)/)
  // مربع البحث الموجود أصلاً (q على السيرفر: الاسم أو الكود)
  assert.match(leaves, /setSearchQuery\(employee\)\n\s*setSearch\(employee\)/)
  // فلتر «من تاريخ / إلى تاريخ» الموجود أصلاً — اليوم الواحد مدى من نفسه لنفسه
  assert.match(leaves, /if \(isDayKey\(date\)\) setDateRange\(\{ from: date, to: date \}\)/)
  assert.match(leaves, /import \{ isDayKey, validDayRange, type DayRange \} from '@\/lib\/payroll-month-range'/)
  // الرابط يُستهلك مرة واحدة فلا يرجع بعد أي تغيير فلتر
  assert.match(leaves, /window\.history\.replaceState\(null, '', window\.location\.pathname\)/)
  // ولا فلتر جديد اتضاف: نفس الحالات الأربعة
  assert.match(leaves, /const filtersKey = `\$\{activeTab\}\|\$\{selectedType\}\|\$\{search\}\|\$\{fromFilter\}\|\$\{toFilter\}`/)
})

test('القرار على الإذن من صفّه: اعتماد ورفض بسبب بنفس actOnRequest وقاعدة صندوق الموافقات', () => {
  const page = read(PERMISSIONS_PAGE)
  // الأزرار على الصف، والأهلية زي ما هي: الطلب اللي في صندوقي بس
  assert.match(page, /onClick=\{\(\) => openDecision\(request, 'APPROVE'\)\}/)
  assert.match(page, /onClick=\{\(\) => openDecision\(request, 'REJECT'\)\}/)
  assert.match(page, /\{actionable\.has\(request\.id\) && \(/)
  assert.match(page, /new Set\(rows\.filter\(\(r\) => r\.typeCode === 'PERMISSION'\)\.map\(\(r\) => r\.id\)\)/)
  // نفس نقطة القرار في صندوق الموافقات
  assert.match(page, /await actOnRequest\(id, decision\.action, reason \|\| undefined\)/)
  // نفس قاعدة الصندوق: الرفض لا يمر بلا سبب مكتوب (زرار مقفول + فحص قبل الإرسال)
  assert.match(page, /if \(decision\.action === 'REJECT' && !reason\) \{\n\s*setDecisionError\('اكتب سبب الرفض قبل تنفيذ القرار'\)/)
  assert.match(page, /disabled=\{actingId !== null \|\| \(decision\.action === 'REJECT' && !decisionReason\.trim\(\)\)\}/)
  // رسالة الخادم العربية تظهر في النافذة نفسها، والنجاح سطر في الشاشة
  assert.match(page, /setDecisionError\(e instanceof Error \? e\.message : 'تعذر تنفيذ الإجراء'\)/)
  assert.match(page, /\{decisionError && <p role="alert" className="text-sm text-red-600">\{decisionError\}<\/p>\}/)
  assert.match(page, /\{notice && <div role="status"/)
  // صندوق الموافقات يفضل خيار ثانوي للعرض الكامل (خطوات الاعتماد وإعادة الطلب للمقدّم)
  assert.match(page, /href=\{`\/approvals-inbox\?request=\$\{request\.id\}`\}[\s\S]{0,120}مراجعة في صندوق الموافقات/)
})

test('نافذة قرار الإذن بنفس مكونات «رفض بسبب» في شاشة الإضافي', () => {
  const permissions = read(PERMISSIONS_PAGE)
  const overtime = read('src/app/attendance/overtime/page.tsx')
  for (const marker of ['role="dialog" aria-modal="true"', 'className="input w-full" />', 'btn-secondary', "'جارٍ الحفظ...'"]) {
    assert.ok(overtime.includes(marker), `نمط الإضافي: ${marker}`)
    assert.ok(permissions.includes(marker), `نافذة الإذن: ${marker}`)
  }
  assert.match(permissions, /aria-labelledby="permission-decision-title"/)
  assert.match(permissions, /<label htmlFor="permission-decision-reason" className="label">/)
  assert.match(permissions, /maxLength=\{500\} rows=\{3\}/)
})
