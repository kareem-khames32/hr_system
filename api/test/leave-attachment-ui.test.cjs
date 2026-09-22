// شاشتا تقديم الإجازة ومرفق نوعها «مع الطلب»: زر الرفع يظهر فقط لنوع بيطلب مستند وقت التقديم،
// نص القاعدة (مطلوب / اختياري / فوق N يوم) جنب الزر، والإرسال محجوب بلا الملف المطلوب —
// والمرجع المرسَل حقل واحد اسمه attachmentUrl بمرجع file:N من رفع الملفات (entityType=request
// عشان المعتمِد يقدر يفتحه، والمسار «بعد الرجوع» بـleave_attachment للموارد البشرية).
// منطق الواجهة ونصوصها فقط؛ لا SQL ولا خدمة. (الملفات على القرص CRLF — تُطبّع قبل الفحص)
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')

test('قاعدة المرفق بنصها: مطلوب مع الطلب، اختياري، وفوق N يوم — وبلا نص لنوع «بعد الرجوع» أو بلا مرفق', () => {
  const src = read('src/lib/leave-catalog.ts')
  // الاسم فاضي = النوع مابيطلبش مرفق وقت التقديم (بعد الرجوع أو NONE) ⇒ لا نص ولا زر
  assert.match(src, /export function leaveAttachmentName[\s\S]*?attachmentTiming === 'AFTER_RETURN'\) return ''/)
  assert.match(src, /attachmentRule === 'NONE' \? '' : name/)
  const ruleText = /export function leaveAttachmentRuleText[\s\S]*?\n}/.exec(src)?.[0] ?? ''
  assert.match(ruleText, /const name = leaveAttachmentName\(lt\)\n\s*if \(!name\) return ''/)
  assert.match(ruleText, /'OPTIONAL'\) return `\$\{name\} اختياري مع الطلب`/)
  assert.match(ruleText, /'REQUIRED_ABOVE_DAYS'\)[\s\S]*?مطلوب مع الطلب لو المدة أكتر من \$\{ruleNum\(lt\.attachmentAboveDays\) \?\? 0\} يوم/)
  assert.match(ruleText, /return `\$\{name\} مطلوب مع الطلب`/)
  // «فوق N يوم» يعضّ فوق N فقط، ولا يُطلب قبل حساب المدة
  assert.match(src, /'REQUIRED_ABOVE_DAYS'\) return days !== null && days > \(ruleNum\(lt\.attachmentAboveDays\) \?\? 0\)/)
})

test('شاشة «طلب إجازة»: الزر بقاعدة النوع، النص جنبه، والإرسال محجوب بلا المرفق المطلوب', () => {
  const src = read('src/app/leaves/request/page.tsx')
  assert.match(src, /const attachmentRuleText = leaveAttachmentRuleText\(selectedLeaveType\)/)
  // الزر داخل شرط اسم المرفق: نوع بلا مرفق وقت التقديم مايعرضش خانة رفع
  assert.match(src, /\{attachmentName && \(\n\s*<div>/)
  assert.match(src, /<p className="text-xs text-gray-500 mb-2">\{attachmentRuleText\}<\/p>/)
  // الحجب: سبب مكتوب تحت الزر + زر معطّل + رفض في المعالج قبل النداء
  assert.match(src, /attachmentRequired && !attachmentRef\n\s*\? `\$\{attachmentRequired\} \(مرفق مطلوب مع الطلب\)`/)
  assert.match(src, /!!\(attachmentRequired && !attachmentRef\)/)
  assert.match(src, /if \(attachmentRequired && !attachmentRef\) \{[\s\S]*?return\n\s*\}/)
  // حقل واحد: attachmentUrl بمرجع الرفع، وentityType=request عشان معتمِد الطلب يفتح الملف
  assert.match(src, /uploadFile\(file, \{ entityType: 'request' \}\)/)
  assert.match(src, /\.\.\.\(attachmentRef \? \{ attachmentUrl: attachmentRef \} : \{\}\)/)
  assert.ok(!/attachmentRef:\s*attachmentRef/.test(src), 'مفيش اسم تاني للحقل في الحمولة')
})

test('شاشة «الطلبات» الموحّدة: نفس القاعدة ونفس الحقل ونفس الحجب', () => {
  const src = read('src/app/requests/page.tsx')
  assert.match(src, /const leaveAttachmentRuleHint = leaveAttachmentRuleText\(selectedLeaveTypeDef\)/)
  assert.match(src, /\{selectedType && isLeave && leaveAttachmentLabel && \(/)
  assert.match(src, /<p className="text-xs text-gray-500 mb-2">\{leaveAttachmentRuleHint\}<\/p>/)
  assert.match(src, /\|\| !!\(leaveAttachmentRequired && !\(fieldValues\.attachmentUrl \?\? ''\)\.trim\(\)\)/)
  assert.match(src, /if \(leaveAttachmentRequired && !attachRef\) \{[\s\S]*?return\n\s*\}/)
  assert.match(src, /if \(attachRef\) payload\.attachmentUrl = attachRef/)
  assert.match(src, /uploadFile\(file, \{ entityType: 'request' \}\)/)
})

test('مرفق «بعد الرجوع» في «إجازاتي» كما هو: PENDING فقط، وentityType=leave_attachment', () => {
  const src = read('src/app/my/leaves/page.tsx')
  assert.match(src, /attachmentStatus === 'PENDING'/)
  assert.match(src, /uploadFile\(file, \{ entityType: 'leave_attachment', entityId: leave\.id \}\)/)
})
