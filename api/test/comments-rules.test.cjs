'use strict'
// B2.8: قواعد التعليقات النقية (comment-rules) — تنضيف المدخل وحدوده، وأدوار الإشارة لكل كيان، وشكل الإشارات المخزّنة. من غير قاعدة بيانات.
// Run (من api/): node --test test/comments-rules.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const rules = require('../src/comments/comment-rules')

const r5 = rules.commentRef(5), r7 = rules.commentRef(7)
const refused = (kind, input, message) => assert.throws(() => rules.cleanComment(kind, input), error => error.getStatus() === 400 && error.message === message, JSON.stringify(input).slice(0, 80))

test('CK-01: مدخل التعليق — النص بحده بعد توحيد نهايات السطور، و«داخلي» قيمة منطقية، والأرقام صالحة ومن غير تكرار وبحدودها', () => {
  assert.deepEqual(rules.cleanComment('request', { body: '  سؤال\r\nتاني  ' }), { body: 'سؤال\nتاني', internal: false, targets: [], replyTo: [], fileIds: [], notMine: false })
  assert.deepEqual(rules.cleanComment('request', { body: 'نص', internal: true, targets: ['REQUESTER', 'REQUESTER', 'CURRENT_APPROVERS'], replyTo: [r5, r5, r7], fileIds: [3, 3] }),
    { body: 'نص', internal: true, targets: ['REQUESTER', 'CURRENT_APPROVERS'], replyTo: [r5, r7], fileIds: [3], notMine: false })
  assert.deepEqual(rules.cleanComment('request', { body: 'نص', targets: null, replyTo: null, fileIds: null }).targets, [])
  // الحد بعد التوحيد: 2000 بالظبط مقبول، و2001 لأ
  assert.equal(rules.cleanComment('task', { body: `${'ن'.repeat(1998)}\r\nن` }).body.length, 2000)
  refused('task', { body: 'ن'.repeat(2001) }, 'التعليق بحد أقصى 2000 حرف')
  for (const body of [undefined, null, 5, '', '   ', '\r\n']) refused('request', { body }, 'اكتب نص التعليق')
  for (const internal of ['yes', 1, null]) refused('request', { body: 'نص', internal }, 'قيمة «داخلي» غير صالحة')
  // B2.5 (إضافة المالك): «مش بتاعتي» قيمة منطقية — مين يكتبها (مسؤول المهمة) بيتحكم في الخدمة
  assert.equal(rules.cleanComment('task', { body: 'نص', notMine: true }).notMine, true)
  for (const notMine of ['yes', 1, null]) refused('task', { body: 'نص', notMine }, 'قيمة «مش بتاعتي» غير صالحة')
  // الرد بمرجع التعليق (20 حرف hex) مش برقمه
  for (const replyTo of [[5], ['5'], [r5.toUpperCase()], [`${r5}0`], [r5.slice(1)], 'x', [null]]) refused('request', { body: 'نص', replyTo }, 'التعليقات المردود عليها غير صالحة')
  for (const fileIds of [[0], [-1], [1.5], ['1'], {}, [2147483648]]) refused('request', { body: 'نص', fileIds }, 'المرفقات غير صالحة')
  const refs = [1, 2, 3, 4, 5, 6].map(rules.commentRef)
  refused('request', { body: 'نص', replyTo: refs }, 'التعليقات المردود عليها: بحد أقصى 5')
  refused('request', { body: 'نص', fileIds: [1, 2, 3, 4] }, 'المرفقات: بحد أقصى 3')
  assert.equal(rules.cleanComment('request', { body: 'نص', replyTo: refs.slice(0, 5), fileIds: [1, 2, 3] }).replyTo.length, 5)
  // المرجع ثابت للتعليق، ومختلف لكل تعليق، ومافيهوش الرقم
  assert.match(r5, /^[a-f0-9]{20}$/)
  assert.deepEqual([rules.commentRef(5) === r5, r5 === r7, new Set(Array.from({ length: 500 }, (_, index) => rules.commentRef(index + 1))).size], [true, false, 500])
  assert.deepEqual([rules.COMMENT_BODY_MAX, rules.COMMENT_FILES_MAX, rules.COMMENT_REPLIES_MAX, rules.COMMENT_THREAD_MAX], [2000, 3, 5, 200])
})

test('CK-02: الإشارة لأدوار الكيان نفسه بس — دور كيان تاني أو اسم مش معروف مرفوض', () => {
  assert.deepEqual(rules.COMMENT_TARGETS, { request: { REQUESTER: 'صاحب الطلب', CURRENT_APPROVERS: 'المعتمد الحالي' }, task: { ASSIGNEE: 'المسؤول عن المهمة', CREATOR: 'اللي كلّف بالمهمة' } })
  assert.deepEqual(rules.cleanComment('task', { body: 'نص', targets: ['CREATOR', 'ASSIGNEE'] }).targets, ['CREATOR', 'ASSIGNEE'])
  for (const [kind, targets] of [['request', ['ASSIGNEE']], ['task', ['REQUESTER']], ['request', ['toString']], ['request', ['__proto__']], ['task', [5]], ['task', 'CREATOR'], ['request', ['']]]) {
    refused(kind, { body: 'نص', targets }, 'إشارة غير معروفة على الموضوع ده')
  }
  assert.deepEqual([rules.commentTargetLabel('request', 'REQUESTER'), rules.commentTargetLabel('task', 'REQUESTER'), rules.commentTargetLabel('request', 'constructor')], ['صاحب الطلب', null, null])
  assert.deepEqual([rules.isCommentEntity('request'), rules.isCommentEntity('task'), rules.isCommentEntity('policy'), rules.isCommentEntity(null)], [true, true, false, false])
})

test('CK-03: الإشارات المخزّنة — من غير إشارات مابيتخزنش حاجة، وأي شكل غير متوقع بيتقري «من غير إشارات»', () => {
  assert.equal(rules.storedCommentMentions({ targets: [], replyTo: [] }), null)
  assert.equal(rules.storedCommentMentions({ targets: ['REQUESTER'], replyTo: [] }), '{"targets":["REQUESTER"],"replyTo":[]}')
  assert.equal(rules.storedCommentMentions({ targets: [], replyTo: [9] }), '{"targets":[],"replyTo":[9]}')
  assert.deepEqual(rules.parseCommentMentions('{"targets":["REQUESTER"],"replyTo":[9,10]}'), { targets: ['REQUESTER'], replyTo: [9, 10], event: null })
  for (const raw of [null, undefined, '', 'مش JSON', '5', '[]', '"نص"', '{"targets":"REQUESTER","replyTo":7}']) assert.deepEqual(rules.parseCommentMentions(raw), { targets: [], replyTo: [], event: null }, String(raw))
  // قيم غلط جوه القايمة بتتشال، والباقي بيتقري
  assert.deepEqual(rules.parseCommentMentions('{"targets":["CREATOR",5,null],"replyTo":[3,"4",0,-2,1.5]}'), { targets: ['CREATOR'], replyTo: [3], event: null })
  // B2.5 (إضافة المالك): علامة سطر سجل المهمة — بتتخزن حتى من غير إشارات، ومن غيرها الشكل المخزّن زي ما كان، وأي علامة مش بالشكل ده
  // بتتقري «من غير علامة»
  assert.equal(rules.storedCommentMentions({ targets: [], replyTo: [], event: 'RETURNED' }), '{"targets":[],"replyTo":[],"event":"RETURNED"}')
  assert.equal(rules.storedCommentMentions({ targets: ['ASSIGNEE'], replyTo: [], event: null }), '{"targets":["ASSIGNEE"],"replyTo":[]}')
  assert.equal(rules.storedCommentMentions({ targets: [], replyTo: [], event: null }), null)
  assert.deepEqual(rules.parseCommentMentions('{"targets":["CREATOR"],"replyTo":[],"event":"NOT_MINE"}'), { targets: ['CREATOR'], replyTo: [], event: 'NOT_MINE' })
  for (const event of ['returned', 'A', 5, null, '<b>', 'X'.repeat(41), 'RETURNED ', ['RETURNED']]) {
    assert.equal(rules.parseCommentMentions(JSON.stringify({ targets: [], replyTo: [], event })).event, null, String(event))
  }
})
