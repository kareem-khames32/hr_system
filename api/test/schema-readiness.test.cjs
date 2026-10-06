'use strict'
// CRP2N (حاجز Codex في P2N): فحص «الترحيل اتطبق؟» — الموجود بس بيتحفظ. النتيجة السلبية مابتتحفظش: عملية شغالة من قبل الترحيل بتشوفه
// أول ما يتطبق، من غير إعادة تشغيل ولا مهلة. (كاش سلبي دقيقة كان بيخلّي عملية قديمة تقفل مهمة إقرار فتحتها عملية تانية كمهمة عادية.)
// Run (من api/): node --test test/schema-readiness.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')

const flag = applied => [{ ready: applied ? 1 : 0 }]
const CHECKS = [
  ['084 سجل التدقيق', '../src/audit/audit', 'auditTableReady', 'resetAuditTableCache', applied => [{ id: applied ? 1 : null }]],
  ['086 الطابور والـoutbox', '../src/queue/outbox', 'queueTablesReady', 'resetQueueTablesCache', flag],
  ['087 الإشعارات', '../src/notifications/notification-store', 'notificationTablesReady', 'resetNotificationTablesCache', flag],
  ['088 المهام', '../src/tasks/task-rules', 'tasksTableReady', 'resetTasksTableCache', flag],
  ['089 مهمة التنفيذ', '../src/requests/execution-tasks', 'executionSchemaReady', 'resetExecutionSchemaCache', flag],
  ['090 التفويض', '../src/requests/approval-delegations', 'delegationSchemaReady', 'resetDelegationSchemaCache', flag],
  ['091 السياسات', '../src/policies/policy-rules', 'policySchemaReady', 'resetPolicySchemaCache', flag],
  ['092 إقرار المستندات', '../src/hr-documents/document-acknowledgements', 'documentAckSchemaReady', 'resetDocumentAckSchemaCache', flag],
  ['093 التعليقات', '../src/comments/comment-rules', 'commentsTableReady', 'resetCommentsTableCache', flag],
]

CHECKS.forEach(([name, file, check, reset, rows], index) => {
  test(`SR-0${index + 1}: ${name} — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ`, async () => {
    const rules = require(file)
    rules[reset]()
    let applied = false, queries = 0
    const em = { query: async () => { queries++; return rows(applied) } }
    try {
      assert.equal(await rules[check](em), false)
      assert.equal(await rules[check](em), false)
      assert.equal(queries, 2, 'النتيجة السلبية مابتتحفظش')
      // الترحيل اتطبق والعملية شغالة: النداء اللي بعده على طول بيشوفه
      applied = true
      assert.equal(await rules[check](em), true)
      assert.equal(await rules[check](em), true)
      assert.equal(queries, 3, 'الموجود بيتحفظ: من غير استعلام تاني')
      // ونسيان الحالة (للاختبارات) بيرجّع الفحص
      rules[reset]()
      applied = false
      assert.equal(await rules[check](em), false)
    } finally { rules[reset]() }
  })
})
