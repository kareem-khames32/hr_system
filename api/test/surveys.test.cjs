'use strict'
// B3.13: الاستبيانات — فحص من غير قاعدة (الدورة الفعلية والسرية في surveys.integration.cjs):
//  SU-01) القواعد: العنوان والنوع والحد الأدنى والأسئلة (المفاتيح من الخادم) والإجابات (كل مطلوب، وكل قيمة من نوع سؤالها، ومفيش مفتاح زيادة).
//  SU-02) الحساب: eNPS والملخص، والمجموعات المعروضة — من غير مجموعة تخلّي مجموعة مخفية تتحسب بالطرح — وحد التعليقات من إعداده.
//  SU-03) الربط: موديول جديد مقفول بصلاحيته، ورد على مرحلتين (علامة مشروطة على الدعوة تحت قفل الاستبيان، وصف الرد برّه المعاملة من غير
//         موظف في المجهول ولا رقم دعوة ولا ساعة)، ومن غير سطر تدقيق، والمسارات والواجهة.
// Run (من api/): node --test test/surveys.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const rules = require('../src/surveys/survey-rules')
const { MODULES } = require('../src/modules-registry/registry')
const root = path.resolve(__dirname, '..', '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n')
const refuses = (work, label) => assert.throws(work, error => error?.getStatus?.() === 400, label)

const QUESTIONS = [
  { label: '  راضي عن   شغلك؟ ', type: 'rating' },
  { label: 'ترشّح الشركة لصاحبك؟', type: 'enps', required: true },
  { label: 'أكتر حاجة عاجباك', type: 'choice', required: false, options: ['الفريق', ' الفريق ', 'المرتب', ''] },
  { label: 'تعليق', type: 'text', required: false },
]

test('SU-01: title, kind, minimum group, questions keyed by the server, and answers of each question type only', () => {
  assert.deepEqual([rules.cleanSurveyTitle('  رضا   الربع '), rules.cleanSurveyKind('ENPS'), rules.cleanMinGroup(undefined), rules.cleanMinGroup(null), rules.cleanMinGroup(3), rules.cleanMinGroup(50)], ['رضا الربع', 'ENPS', 5, 5, 3, 50])
  for (const bad of ['', 'اب', 'ت'.repeat(201), 5, null]) refuses(() => rules.cleanSurveyTitle(bad), 'title')
  for (const bad of ['enps', 'OTHER', 1, undefined]) refuses(() => rules.cleanSurveyKind(bad), 'kind')
  // تحت 3 مفيش سرية — والحد مايتقبلش نص ولا كسر
  for (const bad of [2, 51, 4.5, '5', 0]) refuses(() => rules.cleanMinGroup(bad), 'min group ' + String(bad))

  const questions = rules.cleanSurveyQuestions(QUESTIONS)
  assert.deepEqual(questions, [
    { key: 'q1', label: 'راضي عن شغلك؟', type: 'rating', required: true },
    { key: 'q2', label: 'ترشّح الشركة لصاحبك؟', type: 'enps', required: true },
    { key: 'q3', label: 'أكتر حاجة عاجباك', type: 'choice', required: false, options: ['الفريق', 'المرتب'] },
    { key: 'q4', label: 'تعليق', type: 'text', required: false },
  ], 'المفاتيح من الخادم والاختيارات فريدة')
  assert.deepEqual(rules.cleanSurveyQuestions([{ key: 'employeeId', label: 'سؤال', type: 'text' }])[0].key, 'q1', 'مفتاح العميل مابيتاخدش')
  for (const bad of [[], 'x', null, Array.from({ length: 31 }, () => ({ label: 'سؤال', type: 'rating' })), [{ label: 'س', type: 'rating' }], [{ label: 'سؤال', type: 'number' }], [null],
    [{ label: 'سؤال', type: 'choice', options: ['واحد'] }], [{ label: 'سؤال', type: 'choice' }], [{ label: 'سؤال', type: 'choice', options: Array.from({ length: 11 }, (_, index) => 'ا' + index) }]]) refuses(() => rules.cleanSurveyQuestions(bad), 'questions')
  assert.deepEqual([rules.parseSurveyQuestions(JSON.stringify(questions)).length, rules.parseSurveyQuestions('x'), rules.parseSurveyQuestions(null), rules.parseSurveyQuestions('{}')], [4, [], [], []])

  assert.deepEqual(rules.cleanSurveyAnswers(questions, { q1: 5, q2: 0, q3: 'المرتب', q4: '  كله تمام\r\nشكرًا ' }), { q1: 5, q2: 0, q3: 'المرتب', q4: 'كله تمام\nشكرًا' })
  assert.deepEqual(rules.cleanSurveyAnswers(questions, { q1: 1, q2: 10, q3: '', q4: '   ' }), { q1: 1, q2: 10 }, 'الاختياري الفاضي مابيتسجّلش')
  for (const bad of [null, [], 'x', { q1: 5 }, { q1: 0, q2: 5 }, { q1: 6, q2: 5 }, { q1: 4.5, q2: 5 }, { q1: '5', q2: 5 }, { q1: 5, q2: 11 }, { q1: 5, q2: -1 }, { q1: 5, q2: 5, q3: 'غيره' }, { q1: 5, q2: 5, q4: 7 },
    { q1: 5, q2: 5, q4: 'ت'.repeat(2001) }, { q1: 5, q2: 5, employeeId: 9 }]) refuses(() => rules.cleanSurveyAnswers(questions, bad), 'answers ' + JSON.stringify(bad)?.slice(0, 40))
})

test('SU-02: eNPS and the summary, groups shown without one that lets a hidden group be subtracted, and the comment threshold from its setting', () => {
  assert.deepEqual([rules.enpsScore([]), rules.enpsScore([10, 9, 8, 7, 6, 0]), rules.enpsScore([10, 10]), rules.enpsScore([0, 6]), rules.enpsScore([7, 8]), rules.enpsScore([9, 9, 3])], [null, 0, 100, -100, 0, 33])

  const questions = rules.cleanSurveyQuestions(QUESTIONS)
  const three = [{ q1: 5, q2: 10, q3: 'المرتب', q4: 'تمام' }, { q1: 4, q2: 6 }, { q1: 3, q2: 9, q3: 'المرتب' }]
  assert.deepEqual(rules.summarize(questions, three, 2), [
    { key: 'q1', label: 'راضي عن شغلك؟', type: 'rating', answered: 3, average: 4 },
    { key: 'q2', label: 'ترشّح الشركة لصاحبك؟', type: 'enps', answered: 3, average: 8.33, enps: 33 },
    { key: 'q3', label: 'أكتر حاجة عاجباك', type: 'choice', answered: 2, counts: [{ option: 'الفريق', count: 0 }, { option: 'المرتب', count: 2 }] },
  ], 'النص مش في الملخص')
  // Codex P3K-B13: الحد على إجابات كل سؤال — السؤال اللي جاوب عليه أقل من الحد من غير متوسط ولا توزيع ولا عدد
  assert.deepEqual(rules.summarize(questions, three, 3).map(row => [row.key, row.hidden, 'answered' in row, 'counts' in row]), [['q1', undefined, true, false], ['q2', undefined, true, false], ['q3', true, false, false]])
  assert.deepEqual([rules.summarize(questions, three, 4).every(row => row.hidden === true && Object.keys(row).length === 4), rules.summarize(questions, [], 3)[0]],
    [true, { key: 'q1', label: 'راضي عن شغلك؟', type: 'rating', hidden: true }])

  const groups = (counts, min) => rules.visibleGroups(counts.map((count, index) => ({ key: index + 1, count })), min)
  assert.deepEqual(groups([10, 8, 5], 5), [1, 2, 3], 'كله فوق الحد')
  assert.deepEqual(groups([10, 8, 2], 5), [1], 'مخفي 2 < الحد: أصغر معروض (8) بيتخفى معاه عشان مايتحسبش بالطرح')
  assert.deepEqual(groups([10, 8, 3, 3], 5), [1, 2], 'المخفيين مجموعهم 6 ≥ الحد: الطرح مابيكشفش واحد')
  assert.deepEqual(groups([6, 2], 5), [], 'مجموعة واحدة معروضة ومخفي تحت الحد: مفيش تفصيل')
  assert.deepEqual(groups([4, 4, 4], 5), [], 'كله تحت الحد')
  assert.deepEqual(groups([7, 0, 9], 5), [1, 3], 'مجموعة من غير ردود مش مخفية ولا معروضة')
  assert.deepEqual(groups([5, 5, 1, 1, 1], 5), [2], 'مخفي 3: أصغر معروض بالمفتاح الأصغر بيتخفى ومجموع المخفي يبقى 8')

  assert.deepEqual(['10', '3', '100', '2', '101', '5.5', 'x', '', null, undefined].map(raw => rules.commentMin(raw)), [10, 3, 100, 10, 10, 10, 10, 10, 10, 10])
})

test('SU-03: a new closed module, a one-transaction answer with no link from the response to the invitation, no audit line, the routes and the screens', () => {
  const module = MODULES.surveys
  assert.deepEqual([module.defaultEnabled, module.permissions, module.routes, module.dependsOn], [false, ['surveys.manage'], ['/surveys', '/surveys/*'], ['employees']])
  const { PERMISSIONS, PERMISSION_MODULES, ROLE_PRESETS } = require('../src/auth/permissions')
  assert.deepEqual(['surveys.manage' in PERMISSIONS, PERMISSION_MODULES.find(unit => unit.key === 'surveys').permissions, ROLE_PRESETS.find(role => role.code === 'hr_manager').permissions.includes('surveys.manage'),
    ROLE_PRESETS.find(role => role.code === 'employee').permissions.includes('surveys.manage')], [true, ['surveys.manage'], true, false])

  // صف الرد: مجموعة وإجابات ويوم بس — من غير رقم دعوة ولا حساب ولا ساعة
  const entities = read('api/src/surveys/survey-rules.ts')
  const response = entities.slice(entities.indexOf('export class SurveyResponse'), entities.indexOf('export const SURVEYS_PERMISSION'))
  assert.deepEqual([...response.matchAll(/^  (\w+)[!?]?:/gm)].map(match => match[1]), ['id', 'surveyId', 'departmentId', 'branchId', 'employeeId', 'answers', 'submittedOn'])
  assert.doesNotMatch(response, /invitationId|userId|createdAt|datetime/)
  assert.doesNotMatch(entities, /default:/, 'الكيانات من غير قيم افتراضية (الترحيل هو المصدر)')

  const service = read('api/src/surveys/surveys.service.ts')
  const respond = service.slice(service.indexOf('  async respond('))
  // Codex P3L-B02: علامة الدعوة وصف الرد في معاملة واحدة تحت قفل صف الاستبيان — القفل (close) بياخد نفس القفل فبيستنى الرد الجاري
  const lock = respond.indexOf("lock: { mode: 'pessimistic_write' }"), mark = respond.indexOf('update({ id: invitation.id, respondedOn: IsNull() }, { respondedOn: today })'),
    insert = respond.indexOf('em.getRepository(SurveyResponse).insert('), end = respond.indexOf('\n    })\n')
  assert.ok(lock > 0 && mark > lock && insert > mark && end > insert, 'قفل الاستبيان ← علامة مشروطة على الدعوة ← صف الرد ← المعاملة بتقفل')
  assert.match(respond, /if \(!marked\.affected\) throw new ConflictException\(SURVEY_ANSWERED\)/)
  assert.match(respond, /employeeId: fresh\.isAnonymous === true \? null : invitation\.employeeId/)
  assert.doesNotMatch(respond, /this\.ds\.getRepository\(SurveyResponse\)/, 'مفيش صف رد برّه المعاملة')
  const close = service.slice(service.indexOf('  async close('), service.indexOf('  async results('))
  assert.match(close, /await this\.managed\(em, user, id, true\)/, 'القفل تحت قفل صف الاستبيان')
  assert.doesNotMatch(service, /recordAudit|\.save\(/, 'من غير سطر تدقيق ومن غير حفظ كيان كامل')
  // النتايج: تحت الحد مفيش حاجة، والتفصيل بالمجموعات المعروضة بس
  const results = service.slice(service.indexOf('  async results('), service.indexOf('  // ===== الموظف ====='))
  assert.match(results, /if \(responses\.length < row\.minGroup\) return \{ \.\.\.base, visible: false, overall: \[\], groups: \[\], comments: \[\], commentsHidden: true \}/)
  // Codex P3K-B13: النتايج بعد القفل بس، والحد على كل سؤال وكل تعليقات سؤال، واسم القسم بفرعه الحالي، والرد المجهول من غير يومه
  assert.match(results, /if \(row\.status !== 'CLOSED'\) throw new BadRequestException\(SURVEY_RESULTS_AFTER_CLOSE\)/)
  assert.deepEqual([(results.match(/summarize\(questions, /g) ?? []).length, results.includes('overall: summarize(questions, parsed.map((entry) => entry.answers), row.minGroup)'),
    results.includes('summary: summarize(questions, byDepartment.get(key)!, row.minGroup, hiddenIn(key))')], [2, true, true], 'الإجمالي وكل مجموعة بحد كل سؤال (والإخفاء التكميلي لكل سؤال)')
  assert.match(results, /\.filter\(\(entry\) => entry\.texts\.length >= row\.minGroup\)/)
  assert.match(results, /\.filter\(\(entry\) => inBranchScope\(scope, entry\.branchId\)\)\.map\(\(entry\) => \[entry\.id, entry\.name\]\)/)
  assert.match(respond, /submittedOn: fresh\.isAnonymous === true \? \(fresh\.openedAt \? localDateOf\(new Date\(fresh\.openedAt\)\) : today\) : today/)
  assert.match(results, /visibleGroups\(/)
  assert.doesNotMatch(results, /employeeId/, 'النتايج من غير موظف')
  // الإدارة بنطاق الفروع وإلا غير موجود
  assert.match(service, /if \(!row \|\| !announcementAudienceInScope\(row\.audience, branchScopeOf\(user\)\)\) throw new NotFoundException\(SURVEY_NOT_FOUND\)/)

  const controller = read('api/src/surveys/surveys.controller.ts')
  assert.equal((controller.match(/@Perm\('surveys\.manage'\)/g) ?? []).length, 6)
  assert.ok(controller.indexOf("@Get('mine')") < controller.indexOf("@Get(':id')"), '«استبياناتي» قبل المسار بالرقم')

  // الواجهة: القايمة والعنوان والصفحتين
  assert.match(read('src/components/layout/Sidebar.tsx'), /\{ label: 'الاستبيانات', href: '\/surveys' \},/)
  assert.match(read('src/components/layout/pageTitles.ts'), /\['\/surveys', 'الاستبيانات'\]/)
  const page = read('src/app/surveys/page.tsx'), form = read('src/app/surveys/[id]/page.tsx')
  assert.match(page, /const manage = can\('surveys\.manage'\)/)
  assert.match(page, /if \(manage\) fetchSurveys\(\)/, 'قايمة الإدارة مابتتطلبش من غير الصلاحية')
  assert.match(page, /!data\.visible &&/)
  assert.match(page, /\{row\.status === 'CLOSED' && \(\n\s+<button onClick=\{\(\) => show\(row\.id\)\}/, 'النتايج بعد القفل بس')
  assert.match(form, /form\?\.isAnonymous && !done && !form\.answered/)
  assert.doesNotMatch(page + form, /employeeName|employeeId/, 'الواجهة مابتعرضش صاحب رد')
})

test('SU-06: Codex P3L-B02 — per-question complementary suppression between the shown groups', () => {
  const questions = rules.cleanSurveyQuestions([{ label: 'إجباري', type: 'choice', options: ['أ', 'ب'] }, { label: 'اختياري', type: 'choice', options: ['أ', 'ب'], required: false }, { label: 'تعليق', type: 'text', required: false }])
  const answers = (count, optional) => Array.from({ length: count }, (_, index) => ({ q1: 'أ', ...(index < optional ? { q2: 'ب' } : {}) }))
  const hidden = (groups, others, min = 5) => Object.fromEntries([...rules.complementaryHidden(questions, groups, others, min)].map(([key, set]) => [key, [...set].sort()]))
  // مثال Codex S02: مجموعتين بخمس ردود، السؤال الاختياري 5 في الأولى و1 في التانية — ملخص الأولى بيتخفى كمان
  assert.deepEqual(hidden([{ key: 1, answers: answers(5, 5) }, { key: 2, answers: answers(5, 1) }], []), { q2: [1] })
  // المخفي فاضي (محدش جاوب) أو وصل الحد: مفيش إخفاء زيادة
  assert.deepEqual(hidden([{ key: 1, answers: answers(5, 5) }, { key: 2, answers: answers(5, 0) }], []), {})
  assert.deepEqual(hidden([{ key: 1, answers: answers(6, 6) }, { key: 2, answers: answers(6, 5) }], []), {})
  // إجابات السؤال في المجموعات اللي مش معروضة داخلة في المخفي
  assert.deepEqual(hidden([{ key: 1, answers: answers(5, 5) }, { key: 2, answers: answers(7, 6) }], answers(5, 2)), { q2: [1] })
  assert.deepEqual(hidden([{ key: 1, answers: answers(5, 5) }, { key: 2, answers: answers(7, 6) }], answers(5, 5)), {})
  // بالتسلسل: أصغر معروض الأول، ولحد ما المخفي يوصل الحد أو مايفضلش معروض
  assert.deepEqual(hidden([{ key: 1, answers: answers(9, 2) }, { key: 2, answers: answers(9, 1) }, { key: 3, answers: answers(9, 5) }, { key: 4, answers: answers(9, 6) }], [], 5), { q2: [3] })
  assert.deepEqual(hidden([{ key: 1, answers: answers(3, 3) }, { key: 2, answers: answers(3, 1) }], [], 3), { q2: [1] })
  // السؤال النصي مالوش ملخص مجموعات
  assert.equal(rules.complementaryHidden(questions, [{ key: 1, answers: [{ q1: 'أ', q3: 'نص' }] }], [], 5).has('q3'), false)
  // الملخص بيخفي السؤال المطلوب إخفاؤه حتى لو إجاباته فوق الحد — من غير عدد ولا توزيع
  const summary = rules.summarize(questions, answers(6, 6), 5, new Set(['q2']))
  assert.deepEqual(summary.map(entry => [entry.key, entry.hidden === true, 'answered' in entry]), [['q1', false, true], ['q2', true, false]])
  const service = read('api/src/surveys/surveys.service.ts')
  assert.match(service, /summarize\(questions, byDepartment\.get\(key\)!, row\.minGroup, hiddenIn\(key\)\)/)
})
