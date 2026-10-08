'use strict'
// B3.7: دورات التقييم — فحص من غير قاعدة (الدورة الفعلية في performance-reviews.integration.cjs):
//  RU-01) النموذج: الأقسام وأوزانها وبنودها ومفاتيح الخادم؛ وقيم الدورة (النوع، التواريخ، الجمهور).
//  RU-02) الإجابات والدرجة: البنود المطلوبة، حدود التقدير، الأهداف، والدرجة بالأوزان (أهداف موزونة، قسم من غير تقدير بيخرج).
//  RU-03) الربط: الإطلاق والتسليم تحت قفل الصف والحكم بعده، ومفيش نداء خدمة تانية جوه المعاملة، والمسارات.
// Run (من api/): node --test test/performance-reviews.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const rules = require('../src/performance/review-rules')
const root = path.resolve(__dirname, '..', '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n')
const refuses = (work, label) => assert.throws(work, error => error?.getStatus?.() === 400, label)
const template = { ratingMax: 5, sections: rules.cleanSections([
  { title: ' الأهداف ', kind: 'GOALS', weight: 50 },
  { title: 'الجدارات', kind: 'COMPETENCIES', weight: 30, items: [{ label: 'التعاون', type: 'rating' }, { label: 'ملاحظة', type: 'text', required: false }] },
  { title: 'أسئلة مفتوحة', kind: 'QUESTIONS', weight: 20, items: [{ label: 'القيادة', type: 'rating', required: false }, { label: 'رأيك', type: 'text' }] },
]) }
const goals = [{ id: 7, title: 'أ', weight: 60 }, { id: 9, title: 'ب', weight: 40 }]

test('RU-01: sections with weights, items and server keys; cycle kind, dates and audience', () => {
  assert.deepEqual(template.sections.map(section => [section.key, section.title, section.kind, section.weight, section.items.map(item => [item.key, item.type, item.required])]), [
    ['s1', 'الأهداف', 'GOALS', 50, []], ['s2', 'الجدارات', 'COMPETENCIES', 30, [['s2i1', 'rating', true], ['s2i2', 'text', false]]],
    ['s3', 'أسئلة مفتوحة', 'QUESTIONS', 20, [['s3i1', 'rating', false], ['s3i2', 'text', true]]]])
  const one = (extra = {}) => [{ title: 'جدارات', kind: 'COMPETENCIES', weight: 100, items: [{ label: 'بند', type: 'rating' }], ...extra }]
  assert.equal(rules.cleanSections(one()).length, 1)
  for (const bad of [null, [], Array.from({ length: 9 }, () => one()[0]), one({ weight: 99 }), one({ weight: 100.5 }), one({ title: 'x' }), one({ kind: 'OTHER' }), one({ items: [] }), one({ items: [{ label: 'x', type: 'rating' }] }),
    one({ items: [{ label: 'بند', type: 'number' }] }), one({ items: [{ label: 'نص بس', type: 'text' }] }), one({ items: Array.from({ length: 21 }, () => ({ label: 'بند', type: 'rating' })) }),
    [{ title: 'الأهداف', kind: 'GOALS', weight: 50 }, { title: 'أهداف تاني', kind: 'GOALS', weight: 50 }], [{ title: 'الأهداف', kind: 'GOALS', weight: 100, items: [{ label: 'بند', type: 'rating' }] }]]) {
    refuses(() => rules.cleanSections(bad), JSON.stringify(bad).slice(0, 60))
  }
  // قسم وزنه صفر مسموح من غير بند تقدير (أسئلة مفتوحة للقراءة)
  assert.equal(rules.cleanSections([...one(), { title: 'أسئلة', kind: 'QUESTIONS', weight: 0, items: [{ label: 'رأيك', type: 'text' }] }]).length, 2)
  assert.deepEqual([rules.cleanRatingMax(3), rules.cleanRatingMax(10), rules.cleanCycleKind('PROBATION'), rules.cleanReviewName('  دورة  2026 ')], [3, 10, 'PROBATION', 'دورة 2026'])
  for (const bad of [2, 11, 5.5, '5', null]) refuses(() => rules.cleanRatingMax(bad), 'ratingMax ' + String(bad))
  const dates = { periodStart: '2026-01-01', periodEnd: '2026-12-31', selfDueDate: '2027-01-10', managerDueDate: '2027-01-10' }
  assert.deepEqual(rules.cleanCycleDates(dates), dates)
  for (const change of [{ periodEnd: '2025-12-31' }, { managerDueDate: '2027-01-09' }, { selfDueDate: '2027-02-30' }, { periodStart: undefined }]) refuses(() => rules.cleanCycleDates({ ...dates, ...change }), JSON.stringify(change))
  assert.deepEqual([rules.cleanCycleAudience('COMPANY', [5]), rules.cleanCycleAudience('BRANCHES', [3, 1, 3])], [{ audienceMode: 'COMPANY', ids: [] }, { audienceMode: 'BRANCHES', ids: [1, 3] }])
  for (const [mode, ids] of [['TEAMS', [1]], ['BRANCHES', []], ['DEPARTMENTS', [0]], ['DEPARTMENTS', 'all'], [null, [1]]]) refuses(() => rules.cleanCycleAudience(mode, ids), String(mode))
  assert.deepEqual([rules.parseTemplate(JSON.stringify(template)).ratingMax, rules.parseTemplate('{bad'), rules.parseTemplate(null), rules.parseTemplate('{"ratingMax":"5","sections":[]}')], [5, null, null, null])
})

test('RU-02: answers against the frozen template and the period goals, and the weighted score', () => {
  const good = { sections: { s2: { s2i1: { rating: 4 }, s2i2: { text: '  تمام ' } }, s3: { s3i2: { text: 'رأي' } } }, goals: { 7: { rating: 5, comment: ' ممتاز ' }, 9: { rating: 3 } } }
  const clean = rules.cleanAnswers(template, good, goals)
  assert.deepEqual(clean, { sections: { s2: { s2i1: { rating: 4 }, s2i2: { text: 'تمام' } }, s3: { s3i2: { text: 'رأي' } } }, goals: { 7: { rating: 5, comment: 'ممتاز' }, 9: { rating: 3 } } })
  for (const bad of [null, [], { ...good, goals: { 7: { rating: 5 } } }, { ...good, goals: { ...good.goals, 11: { rating: 2 } } }, { ...good, sections: { ...good.sections, s2: { s2i2: { text: 'x' } } } },
    { ...good, sections: { ...good.sections, s2: { s2i1: { rating: 6 } } } }, { ...good, sections: { ...good.sections, s2: { s2i1: { rating: '4' } } } }, { ...good, sections: { ...good.sections, s1: {} } },
    { ...good, sections: { ...good.sections, s3: { s3i1: { rating: 3 } } } }, { ...good, sections: { ...good.sections, s3: { s3i2: { text: 'ط'.repeat(2001) } } } }]) {
    refuses(() => rules.cleanAnswers(template, bad, goals), JSON.stringify(bad).slice(0, 60))
  }
  // الأهداف (5×60 + 3×40) ÷ 100 = 4.2 من 5 = 84 بوزن 50؛ الجدارات 4 من 5 = 80 بوزن 30؛ الأسئلة من غير تقدير = بتخرج → (84×50 + 80×30) ÷ 80 = 82.5
  assert.equal(rules.reviewScore(template, clean, goals), 82.5)
  // مع تقدير القيادة 5 (100 بوزن 20): (4200 + 2400 + 2000) ÷ 100 = 86
  const withQuestion = rules.cleanAnswers(template, { ...good, sections: { ...good.sections, s3: { s3i1: { rating: 5 }, s3i2: { text: 'رأي' } } } }, goals)
  assert.equal(rules.reviewScore(template, withQuestion, goals), 86)
  // من غير أهداف في الفترة: قسم الأهداف بيخرج والدرجة من الباقي؛ وأهداف أوزانها صفر بالتساوي
  const noGoals = rules.cleanAnswers(template, { sections: good.sections }, [])
  assert.deepEqual([noGoals.goals, rules.reviewScore(template, noGoals, [])], [{}, 80])
  const flat = [{ id: 7, title: 'أ', weight: 0 }, { id: 9, title: 'ب', weight: 0 }]
  assert.equal(rules.reviewScore(template, rules.cleanAnswers(template, good, flat), flat), 80, '(5 + 3) ÷ 2 = 4 = 80، والجدارات 80')
  refuses(() => rules.cleanAnswers(template, { sections: good.sections, goals: { 7: { rating: 5 } } }, []), 'هدف مش من أهداف الفترة')
  const onlyText = { ratingMax: 5, sections: rules.cleanSections([{ title: 'جدارات', kind: 'COMPETENCIES', weight: 100, items: [{ label: 'بند', type: 'rating', required: false }] }]) }
  assert.equal(rules.reviewScore(onlyText, rules.cleanAnswers(onlyText, { sections: {} }, []), []), null, 'ولا تقدير = من غير درجة')
})

test('RU-03: launching and submitting under the row lock with the judgment after it, no other service inside the transaction, and the routes', () => {
  const service = read('api/src/performance/reviews.service.ts')
  const launch = service.slice(service.indexOf('async launch('), service.indexOf('/** قفل الدورة'))
  const order = ['await this.resolver.directManagerOf(employee.id)', 'this.ds.transaction(', 'await this.lockedCycle(em, user, id)', "if (cycle.status !== 'DRAFT') throw new ConflictException", 'getRepository(ReviewAssignment).insert(',
    "status: 'ACTIVE', templateSnapshot: JSON.stringify("].map(part => launch.indexOf(part))
  assert.ok(order.every((at, index) => at > 0 && (index === 0 || at > order[index - 1])), JSON.stringify(order))
  assert.doesNotMatch(launch.slice(launch.indexOf('this.ds.transaction(')), /this\.resolver\./, 'حل المدير قبل المعاملة')
  const submit = service.slice(service.indexOf('async submit('))
  const submitOrder = ["lock: { mode: 'pessimistic_write' }", 'if (!assignment || !relation) throw new NotFoundException(REVIEW_NOT_FOUND)', "if (cycle.status !== 'ACTIVE')", 'throw new ConflictException(REVIEW_SUBMITTED)',
    'await this.evidenceOf(em, assignment.employeeId, cycle)', 'cleanAnswers(template, input.answers, evidence.goals)', 'getRepository(ReviewResponse).insert(', 'getRepository(ReviewAssignment).update('].map(part => submit.indexOf(part))
  assert.ok(submitOrder.every((at, index) => at > 0 && (index === 0 || at > submitOrder[index - 1])), JSON.stringify(submitOrder))
  assert.match(service, /const allowed = kind === 'SELF' \? true : relation !== 'self' \|\| announced/, 'تقييم المدير للموظف بعد الإعلان بس')
  assert.match(service, /managerScore: viewer === 'manager' \|\| announced \? score\(assignment\.managerScore\) : null/)
  assert.match(service, /return !!branches && branches\.length > 0 && branches\.every\(\(id\) => inBranchScope\(scope, id\)\)/, 'دورة «كل الشركة» مش لحساب الفروع')
  const controller = read('api/src/performance/reviews.controller.ts')
  assert.match(controller, /@RequireModule\('performance'\)\n@UseGuards\(JwtAuthGuard, RolesGuard\)\n@Controller\('performance\/reviews'\)/)
  assert.equal(controller.split("@Perm('performance.manage')").length - 1, 9, 'النماذج والدورات (والاعتماد والإعلان) بالصلاحية')
  // B3.7-ب: الاعتماد والإعلان تحت قفل صف الدورة وبشرط الحالة؛ والإقرار لصاحب التكليف تحت قفل صفه
  const advance = service.slice(service.indexOf('async advance('), service.indexOf('async acknowledge('))
  const advanceOrder = ['await this.lockedCycle(em, user, id)', 'update({ id: In(mine), status: from }, { status: rawTo })', 'await recordAudit('].map(part => advance.indexOf(part))
  assert.ok(advanceOrder.every((at, index) => at > 0 && (index === 0 || at > advanceOrder[index - 1])), JSON.stringify(advanceOrder))
  const acknowledge = service.slice(service.indexOf('async acknowledge('), service.indexOf('/** تكليفات دورة لإدارة الأداء'))
  const ackOrder = ["lock: { mode: 'pessimistic_write' }", 'assignment.employeeId !== user.employeeId) throw new NotFoundException(REVIEW_NOT_FOUND)', "if (assignment.status !== 'ANNOUNCED') throw new BadRequestException",
    "relation: 'ACK'", "update({ id: assignment.id }, { status: 'ACKNOWLEDGED' })"].map(part => acknowledge.indexOf(part))
  assert.ok(ackOrder.every((at, index) => at > 0 && (index === 0 || at > ackOrder[index - 1])), JSON.stringify(ackOrder))
  for (const fixed of ["@Get('templates')", "@Get('cycles')", "@Get('mine')", "@Get('team')"]) assert.ok(controller.indexOf(fixed) < controller.indexOf("@Get(':id')"), fixed + ' قبل ‎:id')
  assert.doesNotMatch(read('api/src/performance/review.entities.ts'), /default:|CreateDateColumn/, 'من غير افتراضي (زي الترحيلات)')
})
