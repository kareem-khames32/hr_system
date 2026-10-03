// B2.3: لوحة الطابور تحت «المهام المجدولة» وملخص /health — اختبارات نقية بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true, compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const root = path.join(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

test('QU-01: حالات الطابور الأربعة بأسمائها، والمسارات بنفس الخادم', () => {
  const ui = require('../../src/lib/queue-api')
  assert.deepEqual(Object.keys(ui.QUEUE_STATUS_LABELS), ['PENDING', 'RUNNING', 'DONE', 'DEAD'])
  const api = read('src/lib/queue-api.ts')
  assert.match(api, /apiFetch<ApiQueueOverview>\('\/queue'\)/)
  assert.match(api, /\/queue\/jobs\/\$\{encodeURIComponent\(id\)\}\/retry`, \{ method: 'POST' \}/)
  const controller = read('api/src/queue/queue.controller.ts')
  assert.match(controller, /@Controller\('queue'\)/)
  assert.match(controller, /@Post\('jobs\/:id\/retry'\)/)
})

test('QU-02: اللوحة في صفحة المهام المجدولة، بالعدّ والميتة والإعادة، وبتقول محتاجة ترحيل 086 قبله', () => {
  assert.match(read('src/app/settings/scheduled-jobs/page.tsx'), /<QueuePanel \/>/)
  const panel = read('src/components/QueuePanel.tsx')
  for (const marker of ['data-queue-panel', 'data-queue-counts', 'data-queue-dead', 'data-queue-unavailable', 'ترحيل 086', 'إعادة']) assert.ok(panel.includes(marker), marker)
})

test('QU-03: ملخص /health للطابور بالعدد بس', () => {
  const { healthQueueSummary } = require('../src/health/health.controller')
  assert.deepEqual(healthQueueSummary(null), { status: 'unknown', pending: 0, dead: 0 })
  assert.deepEqual(healthQueueSummary({ available: false }), { status: 'unknown', pending: 0, dead: 0 })
  assert.deepEqual(healthQueueSummary({ available: true, jobs: { PENDING: 2, RUNNING: 1, DONE: 9, DEAD: 0 }, outboxPending: 3 }), { status: 'ok', pending: 6, dead: 0 })
  assert.deepEqual(healthQueueSummary({ available: true, jobs: { PENDING: 0, RUNNING: 0, DONE: 1, DEAD: 2 }, outboxPending: 0 }), { status: 'dead', pending: 0, dead: 2 })
  const { queueBackoffMs } = require('../src/queue/queue.service')
  assert.deepEqual([1, 2, 3, 8, 20].map(queueBackoffMs), [30000, 60000, 120000, 3600000, 3600000])
})
