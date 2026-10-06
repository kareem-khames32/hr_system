// B2.8: واجهة التعليقات — عميل الـAPI، ومكوّن الحوار، ومكانه في تفاصيل الطلب (الشاشات التلاتة) وكارت المهمة، ولينك الإشعار. اختبارات نقية
// بلا قاعدة بيانات.
// Run (من api/): node --test test/comments-ui.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true, compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
require('../node_modules/reflect-metadata')
const root = path.join(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')

test('CU-01: عميل الـAPI على مسارات الخادم نفسها وبحدوده، والمسارات الأربعة بموديول كيانها ومن غير صلاحية خاصة', () => {
  const ui = require('../../src/lib/comments-api')
  const server = require('../src/comments/comment-rules')
  assert.deepEqual([ui.COMMENT_BODY_MAX, ui.COMMENT_FILES_MAX, ui.COMMENT_REPLIES_MAX], [server.COMMENT_BODY_MAX, server.COMMENT_FILES_MAX, server.COMMENT_REPLIES_MAX])
  const api = read('src/lib/comments-api.ts')
  for (const call of ['apiFetch<ApiCommentThread>(`/${kind}/${id}/comments`)', "apiFetch<ApiComment>(`/${kind}/${id}/comments`, { method: 'POST', body: JSON.stringify(input) })",
    "uploadFile(file, { entityType: 'comment' })", "export type CommentKind = 'requests' | 'tasks'"]) assert.ok(api.includes(call), call)
  const controller = read('api/src/comments/comments.controller.ts')
  assert.deepEqual([...controller.matchAll(/@RequireModule\('(\w+)'\)\s+@(Get|Post)\('([^']+)'\)/g)].map(match => match.slice(1, 4).join(' ')),
    ['requests Get requests/:id/comments', 'requests Post requests/:id/comments', 'tasks Get tasks/:id/comments', 'tasks Post tasks/:id/comments'])
  assert.match(controller, /@UseGuards\(JwtAuthGuard, RolesGuard\)\s+@Controller\(\)\s+export class CommentsController/)
  assert.doesNotMatch(controller, /@Perm\(/)
  // اسم الكاتب: «أنت»، والاسم لو ظاهر، وإلا وصف عام للكيان من غير اسم
  assert.deepEqual([ui.commentAuthorLabel('requests', true, { name: 'س', subject: false }), ui.commentAuthorLabel('requests', false, { name: 'سارة', subject: false }),
    ui.commentAuthorLabel('requests', false, { name: null, subject: false }), ui.commentAuthorLabel('tasks', false, { name: null, subject: false })],
  ['أنت', 'سارة', 'أحد أطراف الطلب', 'أحد أطراف المهمة'])
})

test('CU-02: مكوّن الحوار — مابيعرضش حاجة قبل الترحيل، وضغطتين تعليق واحد، والداخلي مايشاورش لصاحب الطلب ولا تعليق ظاهر يرد على داخلي', () => {
  const thread = read('src/components/comments/CommentsThread.tsx')
  for (const marker of ['data-comments=', 'data-comments-loading', 'data-comments-error', 'data-comments-empty', 'data-comment=', 'data-comment-author', 'data-comment-internal', 'data-comment-mentions',
    'data-comment-reply', 'data-comment-form', 'data-comment-replying', 'data-comment-targets', 'data-comment-internal-toggle', 'data-comment-error', 'data-comment-send']) {
    assert.ok(thread.includes(marker), marker)
  }
  // قبل ترحيل 093: ولا عنوان ولا خانة كتابة
  assert.match(thread, /if \(!thread\.available\) return null/)
  // ضغطتين ورا بعض = تعليق واحد، والملف اللي اترفع مايترفعش تاني في المحاولة اللي بعدها
  assert.match(thread, /if \(!text \|\| running\.current\) return\s+running\.current = true/)
  assert.match(thread, /finally \{\s+running\.current = false\s+setSending\(false\)/)
  assert.match(thread, /const known = uploaded\.current\.get\(file\)\s+const fileId = known \?\? \(await uploadCommentFile\(file\)\)\.id\s+uploaded\.current\.set\(file, fileId\)/)
  assert.match(thread, /disabled=\{sending \|\| !body\.trim\(\)\}/)
  // أول فتح: الإشارة الأولى المتاحة متعلّمة، وبعد الإرسال الاختيار مابيتغيّرش
  assert.match(thread, /if \(preselect\) setTargets\(loaded\.targets\.slice\(0, 1\)\.map\(target => target\.key\)\)/)
  assert.match(thread, /void load\(true\)/)
  assert.match(thread, /await load\(false\)/)
  // «داخلي»: بيشيل إشارة صاحب الطلب ويقفلها؛ ولما يتشال بيشيل الرد على تعليق داخلي؛ والرد على داخلي بيخلّي التعليق داخلي
  assert.match(thread, /if \(value\) setTargets\(current => current\.filter\(key => key !== 'REQUESTER'\)\)/)
  assert.match(thread, /else setReplyTo\(current => current\.filter\(ref => !thread\?\.comments\.find\(row => row\.ref === ref\)\?\.internal\)\)/)
  assert.match(thread, /if \(comment\.internal && !internal\) toggleInternal\(true\)/)
  assert.match(thread, /disabled=\{sending \|\| \(internal && target\.key === 'REQUESTER'\)\}/)
  assert.match(thread, /\{thread\.canInternal && \(/)
  // الحدود من عميل الـAPI (نفس حدود الخادم)
  assert.match(thread, /maxLength=\{COMMENT_BODY_MAX\}/)
  assert.match(thread, /\.slice\(0, COMMENT_FILES_MAX\)/)
  assert.match(thread, /current\.length >= COMMENT_REPLIES_MAX \? current : \[\.\.\.current, comment\.ref\]/)
  // التعليق بمرجعه مش برقمه (الخادم مابيرجّعش رقم تعليق)
  assert.match(thread, /<li key=\{comment\.ref\}/)
  assert.doesNotMatch(thread, /comment\.id\b/)
  // إعادة التحميل بعد الإرسال: الدور اللي مابقاش متاح والتعليق اللي مابقاش ظاهر بيتشالوا من الاختيار (الطلب اتحسم والخانة اختفت)
  assert.match(thread, /setTargets\(current => current\.filter\(key => loaded\.targets\.some\(target => target\.key === key\)\)\)\s+setReplyTo\(current => current\.filter\(ref => loaded\.comments\.some\(row => row\.ref === ref\)\)\)/)
  // مفيش زرار «رد» على تعليقك، والاسم من دالة واحدة
  assert.match(thread, /\{!comment\.mine && \(/)
  assert.match(thread, /const label = \(mine: boolean, author: ApiComment\['author'\]\) => commentAuthorLabel\(kind, mine, author\)/)
})

test('CU-03: الحوار في تفاصيل الطلب (الشاشات التلاتة) وفي كارت المهمة العادية بس، ولينك الإشعار بيفتح الموضوع', () => {
  const mine = read('src/app/requests/page.tsx'), inbox = read('src/app/approvals-inbox/page.tsx'), console_ = read('src/app/requests-console/page.tsx')
  for (const page of [mine, inbox, console_]) assert.ok(page.includes("import CommentsThread from '@/components/comments/CommentsThread'"))
  // الطلب السري المحجوب من غير حوار في الواجهة (الخادم بيرفضه أصلًا): «طلباتي» لما لينك يفتحه، ولوحة الطلبات
  assert.ok(mine.includes('{!requestDetail.confidentialMasked && <CommentsThread kind="requests" id={requestDetail.id} />}'))
  assert.equal(inbox.split('<CommentsThread kind="requests" id={detail.id} />').length - 1, 2, 'تفاصيل اللينك ونافذة القرار')
  assert.ok(console_.includes('{!detail.confidentialMasked && <CommentsThread kind="requests" id={detail.id} />}'))
  // «طلباتي»: لينك الإشعار بيفتح تفاصيل أي طلب الحساب يشوفه
  assert.match(mine, /const linked = Number\(new URLSearchParams\(window\.location\.search\)\.get\('request'\)\)\s+if \(!Number\.isSafeInteger\(linked\) \|\| linked < 1\) return\s+fetchRequest\(linked\)\.then\(setRequestDetail\)/)
  // كارت المهمة: مهمة تنفيذ طلب ومهمة إقرار مستند من غير حوار؛ والحوار بيتحمّل لما يتفتح بس، ومفتوح لو المهمة جاية من لينك
  const card = read('src/components/tasks/TaskCard.tsx')
  assert.match(card, /\{!task\.execution && !task\.documentAck && \(\s+<div className="mt-2" data-task-comments>/)
  assert.match(card, /const \[talk, setTalk\] = useState\(!!highlighted\)/)
  assert.match(card, /\{talk && <div className="mt-2"><CommentsThread kind="tasks" id=\{task\.id\} \/><\/div>\}/)
  // لينك الإشعار من الخادم على نفس الشاشتين، وقايمة الإشعارات بتسيبه برقم موضوعه
  const service = read('api/src/notifications/notifications.service.ts')
  assert.match(service, /link: comment\.entityType === 'request' \? `\/requests\?request=\$\{comment\.entityId\}` : `\/my\/tasks\?task=\$\{comment\.entityId\}`/)
  assert.match(read('api/src/notifications/notification-store.ts'), /link: row\.eventCode === 'comment\.mentioned' \? String\(row\.link\) : String\(row\.link\)\.split\('\?'\)\[0\]/)
  assert.match(read('src/app/notifications/page.tsx'), /comment: \{ label: 'التعليقات', icon: MessageSquare \}/)
})
