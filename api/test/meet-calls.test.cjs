'use strict'
// B-ADD.23: الاتصال من جوه النظام — فحص من غير قاعدة (الدورة الفعلية في meet-calls.integration.cjs):
//  MCU-01) القواعد: حالة المكالمة من أوقاتها (بترن، شغالة، اتردّ عليها، فايتة، مرفوضة)، ومدتها، والمطلوب (تحويلة أو حساب — واحد بالظبط)، والثوابت.
//  MCU-02) الخادم: مسارات ورا موديول الاجتماعات بحراسها، والمكالمة مالهاش صف اجتماع، وللطرفين بس، والاتصال بترتيبه (نداء الخادم برّه المعاملة،
//          وقفل صفّين الحسابين وبعده الحكم)، والرد والرفض والقفل تحت قفل صف المكالمة، والتذكرة بعد الرد ومن غير إدارة غرفة، ومن غير تسجيل،
//          والكيان من غير افتراضي، والترحيل جدول واحد جديد.
//  MCU-03) الواجهة: بند «الاتصال» وعنوانه، وشاشة لوحة الأرقام والاسم والسجل، وبطاقة «بيتصل بيك» بالتحويلة ورد / ارفض، وبطاقة المتصل، والمكالمة
//          صوت الأول في النافذة الصغيرة ومن غير غرفة انتظار، والقفل للطرفين، وزرار ملف الموظف، وكلاسات الاتجاه.
// Run (من api/): node --test test/meet-calls.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const rules = require('../src/meet/call-rules')
const { MODULES, routeOwner, routeAvailable, enabledSnapshot } = require('../src/modules-registry/registry')
const root = path.resolve(__dirname, '..', '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n')
const ordered = (body, steps, label) => { let at = -1; for (const step of steps) { const found = body.indexOf(step, at + 1); assert.ok(found > at, `${label}: ${step}`); at = found } }
const status = (work, code, label) => assert.throws(work, error => error?.getStatus?.() === code, label)

test('MCU-01: call state from its times, its duration, the target (an extension or an account — exactly one), and the constants', () => {
  const now = Date.UTC(2026, 9, 12, 10, 0, 0), ago = seconds => new Date(now - seconds * 1000)
  const call = (extra = {}) => ({ startedAt: ago(10), answeredAt: null, endedAt: null, rejected: false, ...extra })
  assert.deepEqual([rules.CALL_RING_MS, rules.CALL_MAX_MS, rules.CALL_CONNECT_GRACE_MS, rules.CALL_LOG_DAYS, rules.CALL_LOG_MAX], [45000, 43200000, 30000, 60, 100])
  assert.deepEqual([
    rules.callStateOf(call(), now), rules.callStateOf(call({ startedAt: ago(45) }), now), rules.callStateOf(call({ startedAt: ago(46) }), now),
    // المتصل لغى قبل الرد = فايتة؛ مرفوضة؛ اتردّ عليها وشغالة؛ اتردّ عليها وانتهت؛ ومحدش قفلها بعد 12 ساعة
    rules.callStateOf(call({ endedAt: ago(2) }), now), rules.callStateOf(call({ endedAt: ago(2), rejected: true }), now),
    rules.callStateOf(call({ startedAt: ago(600), answeredAt: ago(590) }), now), rules.callStateOf(call({ startedAt: ago(600), answeredAt: ago(590), endedAt: ago(5) }), now),
    rules.callStateOf(call({ startedAt: ago(12 * 3600 + 20), answeredAt: ago(12 * 3600 + 1) }), now), rules.callStateOf(call({ startedAt: ago(12 * 3600), answeredAt: ago(12 * 3600 - 1) }), now),
    // مدة الرنة بتتحقن
    rules.callStateOf(call(), now, 5000), rules.callStateOf(call(), now, 10000),
  ], ['ringing', 'ringing', 'missed', 'missed', 'rejected', 'active', 'answered', 'answered', 'active', 'missed', 'ringing'])
  assert.deepEqual([rules.callDurationSeconds(call({ answeredAt: ago(125), endedAt: ago(5) })), rules.callDurationSeconds(call({ answeredAt: ago(125) })), rules.callDurationSeconds(call({ endedAt: ago(5) })),
    rules.callDurationSeconds(call({ endedAt: ago(5), rejected: true }))], [120, null, null, null])

  assert.deepEqual([rules.cleanCallTarget({ extension: ' 0105 ' }), rules.cleanCallTarget({ extension: '١٠٠٢' }), rules.cleanCallTarget({ extension: 1002 }), rules.cleanCallTarget({ userId: 7 }), rules.cleanCallTarget({ extension: '', userId: 7 })],
    [{ extension: '0105' }, { extension: '1002' }, { extension: '1002' }, { userId: 7 }, { userId: 7 }])
  for (const bad of [undefined, null, {}, { extension: '' }, { extension: '  ' }, { extension: null }, { extension: '1002', userId: 7 }, { extension: '12a' }, { extension: '+1002' }, { extension: '12345678901' },
    { extension: {} }, { userId: '7' }, { userId: 0 }, { userId: 1.5 }]) status(() => rules.cleanCallTarget(bad), 400, JSON.stringify(bad))
  assert.throws(() => rules.cleanCallTarget({}), error => error.message === rules.CALL_TARGET)
  for (const text of [rules.CALL_MIGRATION_MISSING, rules.CALL_EXTENSION_MIGRATION]) assert.match(text, /ترحيل/)
  assert.deepEqual([rules.CALL_NOBODY, rules.CALL_YOURSELF, /مع|اسم/.test(rules.CALL_BUSY.replace('مكالمة تانية', ''))], ['مفيش حد بالتحويلة دي', 'مينفعش تتصل بنفسك', false])
})

test('MCU-02: the server — routes behind the meetings module, a call without a meeting row and for its two parties only, dialling in order with the judgment after the locks, and no recording', () => {
  const controller = read('api/src/meet/meet-calls.controller.ts'), service = read('api/src/meet/meet-calls.service.ts'), entity = read('api/src/meet/call.entity.ts')
  const meetController = read('api/src/meet/meet.controller.ts'), module = read('api/src/meet/meet.module.ts'), helper = read('api/src/meet/livekit.ts')
  // نفس الموديول (من غير موديول ولا صلاحية جديدة)، والمسارات بحراسها وبكود المكالمة (UUID)
  assert.deepEqual([MODULES.meet.routes, MODULES.meet.permissions, MODULES.meet.jobs, routeOwner('/meet/calls')], [['/meet'], [], [], { module: 'meet', feature: null }])
  const off = enabledSnapshot({ modules: {}, features: {} }), on = enabledSnapshot({ modules: { meet: true }, features: {} })
  assert.deepEqual([routeAvailable('/meet/calls', off), routeAvailable('/meet/calls', on)], [false, true])
  const { ALL_PERMISSIONS } = require('../src/auth/permissions')
  assert.equal(ALL_PERMISSIONS.some(key => /^(meet|call)/.test(key)), false)
  assert.match(controller, /@RequireModule\('meet'\)\n@UseGuards\(JwtAuthGuard, RolesGuard\)\n@Controller\('meet\/calls'\)/)
  assert.deepEqual([(controller.match(/@(Get|Post|Patch|Delete)\(/g) || []).length, (controller.match(/@Param\('id', ParseUUIDPipe\) id: string/g) || []).length, /@Param\('id'\)/.test(controller)], [7, 5, false])
  assert.match(module, /controllers: \[MeetController, MeetCallsController\],\n  providers: \[MeetService, MeetCallsService\],/)
  assert.match(module, /TypeOrmModule\.forFeature\(\[Meeting, MeetingInvite, MeetingAttendance, MeetCall, User\]\)/)
  // بترن من نفس السؤال الدوري (صندوق الاجتماعات)، من غير مهمة مجدولة ولا مؤقّت في الخادم
  assert.match(meetController, /return \{ \.\.\.\(await this\.meet\.inbox\(user\)\), calls: await this\.calls\.ringing\(user\) \}/)
  assert.doesNotMatch(service + controller, /@Cron|setInterval|setTimeout|SchedulerRegistry/)

  // المكالمة مالهاش صف اجتماع ولا دعوة: مابتظهرش في «اجتماعاتي»، ومحدش يطلب دخولها، وتذكرتها من مسارها هي بس
  assert.doesNotMatch(service, /meet\.entities|\bMeeting\b|MeetingInvite|MeetingAttendance|\[meetings\]|\[meeting_invites\]/)
  assert.doesNotMatch(read('api/src/meet/meet.service.ts'), /MeetCall|meet_calls/, 'خدمة الاجتماعات مابتقراش جدول المكالمات')
  const part = (name, next) => service.slice(service.indexOf(`  ${name}(`), next ? service.indexOf(`  ${next}(`) : undefined)
  // للطرفين بس: أي حساب تالت = مكالمة مالهاش وجود (نفس الرد)
  assert.match(part('private async load', 'private view'), /if \(!call \|\| \(call\.callerUserId !== user\.sub && call\.calleeUserId !== user\.sub\)\) throw new NotFoundException\(CALL_NOT_FOUND\)/)
  for (const [name, next] of [['async detail', 'async dial'], ['async accept', 'async reject'], ['async reject', 'async hangup'], ['async hangup', 'async token'], ['async token', null]]) {
    assert.match(part(name, next), /await this\.load\(em, user, code(, true)?\)/, `${name}: للطرفين بس`)
  }
  assert.match(part('async list', 'async detail'), /\.where\('\(c\.callerUserId = :me OR c\.calleeUserId = :me\)', \{ me: user\.sub \}\)/)
  assert.match(part('async ringing', 'async list'), /where: \{ calleeUserId: user\.sub, startedAt: MoreThanOrEqual\(new Date\(now - this\.ringMs - 1000\)\), answeredAt: IsNull\(\), endedAt: IsNull\(\), rejected: false \}/)
  // اللي بيطلع من الطرف التاني: الاسم والمسمى والتحويلة بس
  assert.match(part('private async people', 'private async accountOfExtension'), /SELECT u\.\[id\], \$\{MEET_PERSON_NAME_SQL\} AS \[displayName\], u\.\[employeeId\], e\.\[jobTitle\] FROM \[users\] u LEFT JOIN \[employees\] e ON e\.\[id\] = u\.\[employeeId\] WHERE u\.\[id\] IN /)
  assert.match(service, /export interface CallPerson \{ id: number; displayName: string; jobTitle: string \| null; extension: string \| null \}/)
  // التحويلة ← الموظف ← حسابه النشط؛ وقبل ترحيل 188 رسالته
  ordered(part('private async accountOfExtension', 'private async openCalls'), ['await extensionsReady(em)', "code: 'CALL_EXTENSION_MIGRATION'",
    'FROM dbo.employees e INNER JOIN [users] u ON u.[employeeId] = e.[id] WHERE e.[workExtension] = @0 AND u.[isActive] = 1 ORDER BY u.[id]'], 'accountOfExtension')

  // الاتصال: نداء خادم الاجتماعات برّه المعاملة، وصفّين الحسابين بيتقفلوا وبعدها الحكم كله على اتصال المعاملة
  const dial = part('async dial', 'async accept')
  ordered(dial, ['cleanCallTarget(input)', 'await this.guard(this.ds.manager)', 'if (calleeId === null) throw nobody()', 'if (calleeId === user.sub) throw new BadRequestException(CALL_YOURSELF)',
    'await this.settleGone(config, [user.sub, calleeId])', 'this.ds.transaction(', 'FROM [users] WITH (UPDLOCK, ROWLOCK) WHERE [id] IN (@0, @1) ORDER BY [id]', '(await resolve(em)) !== calleeId',
    'await this.openCalls(em, [user.sub, calleeId], now)', "code: 'CALL_SELF_BUSY'", "code: 'CALL_BUSY'", 'calls.insert('], 'dial')
  assert.match(dial, /new NotFoundException\('userId' in target \? \{ code: 'CALL_USER', message: CALL_USER \} : \{ code: 'CALL_NOBODY', message: CALL_NOBODY \}\)/)
  assert.doesNotMatch(dial.slice(dial.indexOf('this.ds.transaction(')), /livekit|this\.settleGone|this\.ds\.manager/, 'ولا نداء خادم ولا اتصال تاني جوه المعاملة')
  const settle = part('private async settleGone', 'async ringing')
  ordered(settle, ['const em = this.ds.manager', 'CALL_CONNECT_GRACE_MS', 'livekitRoomCounts(config,', 'update({ id: call.id, endedAt: IsNull() }, { endedAt: new Date() })'], 'settleGone')
  assert.doesNotMatch(settle, /transaction/)
  // الرد والرفض والقفل: جوه معاملة، تحت قفل صف المكالمة، والحكم بعد القفل، وبالخانات اللي بتتغيّر بس
  for (const [name, next, steps] of [
    ['async accept', 'async reject', ['this.ds.transaction(', 'await this.load(em, user, code, true)', "code: 'CALL_CALLEE_ONLY'", 'this.stateOf(call)', "code: 'CALL_OVER'", '{ answeredAt: new Date() }']],
    ['async reject', 'async hangup', ['this.ds.transaction(', 'await this.load(em, user, code, true)', "code: 'CALL_CALLEE_ONLY'", "this.stateOf(call) === 'ringing'", '{ rejected: true, endedAt: new Date() }']],
    ['async hangup', 'async token', ['this.ds.transaction(', 'await this.load(em, user, code, true)', 'this.stateOf(call)', '{ endedAt: new Date() }', '})\n', 'if (config) await this.closeRoom(config, code)']],
  ]) ordered(part(name, next), steps, name)
  assert.match(service, /lock \? \{ lock: \{ mode: 'pessimistic_write' as const \} \} : \{\}/)
  assert.doesNotMatch(service, /\.save\(/, 'الكتابة بالخانات بس')
  // التذكرة: بعد الرد بس، لغرفة المكالمة، ومن غير إدارة غرفة لحد
  const token = part('async token', null)
  // P8A-B05: التذكرة بتتوقّع تحت قفل صف المكالمة وبحالة متقرية بعد القفل — قراءة الاسم قبل المعاملة
  ordered(token, ['await this.load(em, user, code)', "code: 'CALL_NOT_ANSWERED'", "code: 'CALL_OVER'", 'await this.people(em, [user.sub])', 'this.ds.transaction(', 'await this.load(tx, user, code, true)',
    "if (held === 'ringing')", "if (held !== 'active')", 'participantToken(config, { room: code, identity: String(user.sub)', 'host: false })', 'url: config.url }'], 'token')
  assert.doesNotMatch(service, /host: true|config\.secret|config\.key|console\.log/)
  // من غير تسجيل ومن غير سنترال: نفس نداءات RoomService القايمة بس
  assert.deepEqual([...new Set([...(service + helper).matchAll(/livekit(RoomCounts|DeleteRoom|RemoveParticipant|MuteParticipant|Call)\b/g)].map(match => match[1]))].sort(), ['Call', 'DeleteRoom', 'MuteParticipant', 'RemoveParticipant', 'RoomCounts'])
  const code = source => source.split('\n').filter(line => !/^\s*(\/\/|\/?\*)/.test(line)).join('\n')
  assert.doesNotMatch(code(service) + code(controller) + code(helper) + read('api/package.json'), /Egress|livekit-server-sdk|\bsip\b|SIPService|asterisk|twilio/i)

  // الكيان من غير افتراضي (زي الترحيل)، والترحيل جدول واحد جديد
  assert.doesNotMatch(entity, /default:|CreateDateColumn/)
  assert.match(entity, /@Entity\('meet_calls'\)\n@Index\('UX_meet_calls_code', \['code'\], \{ unique: true \}\)\n@Index\('IX_meet_calls_caller', \['callerUserId', 'startedAt'\]\)\n@Index\('IX_meet_calls_callee', \['calleeUserId', 'startedAt'\]\)/)
  const migration = read('docs/migrations/payroll/20261012_198_meet_calls.sql')
  assert.match(migration, /^-- 20261012_198: /)
  assert.deepEqual([...migration.matchAll(/^CREATE TABLE dbo\.(\w+)/gm)].map(match => match[1]), ['meet_calls'])
  assert.deepEqual([...migration.matchAll(/THROW (\d+),/g)].map(match => Number(match[1])), [198001, 198002])
  assert.doesNotMatch(migration.split('\n').filter(line => !line.startsWith('--')).join('\n'), /\bALTER\b|\bDROP\b|dbo\.meetings\b|dbo\.meeting_/)
  assert.equal(read('docs/migrations/payroll/20261012_191_meetings.sql').includes('meet_calls'), false, 'ترحيل 191 زي ما هو')
})

test('MCU-03: the screens — the «الاتصال» entry and its dial pad, the ringing card with the caller and his extension, audio first in the small window without a lobby, hanging up for both, and the profile button', () => {
  const sidebar = read('src/components/layout/Sidebar.tsx'), titles = read('src/components/layout/pageTitles.ts'), api = read('src/lib/meet-api.ts')
  const page = read('src/app/meet/calls/page.tsx'), global = read('src/components/meet/MeetGlobal.tsx'), session = read('src/components/meet/MeetSession.tsx')
  const live = read('src/components/meet/MeetLiveWindow.tsx'), button = read('src/components/meet/CallButton.tsx'), profile = read('src/app/employees/[id]/page.tsx')
  // القايمة: جوه مجموعة «التواصل» بعد الاجتماعات، من غير صلاحية، والعنوان قبل عنوان صفحة الاجتماع
  assert.match(sidebar, /\{ label: 'الاجتماعات', href: '\/meet' \},\n\s+\{ label: 'الاتصال', href: '\/meet\/calls' \},\n\s+\],/)
  assert.ok(titles.indexOf("['/meet/calls', 'الاتصال']") > 0 && titles.indexOf("['/meet/calls', 'الاتصال']") < titles.indexOf("[/^\\/meet\\/[^/]+/, 'اجتماع']"))
  assert.match(read('src/i18n/en.ts'), /^  'الاتصال': 'Calls',$/m)
  assert.equal(require('./fixtures/menu-gates.cjs').MENU_GATES['/meet/calls'], '')
  assert.match(read('src/app/meet/page.tsx'), /<Link href=\{CALLS_PATH\} className="btn-secondary inline-flex items-center gap-2" data-meet-calls-link>/)

  // النداءات: نفس مسارات الخادم
  for (const text of ['export const CALLS_PATH = `${MEET_BASE}/calls`', 'post<{ id: string; person: CallPerson; ringSeconds: number }>(CALLS_PATH, target)', '`${CALLS_PATH}/${id}/accept`', '`${CALLS_PATH}/${id}/reject`',
    '`${CALLS_PATH}/${id}/hangup`', '`${CALLS_PATH}/${id}/token`', 'apiFetch<CallEntry>(`${CALLS_PATH}/${id}`)']) assert.ok(api.includes(text), text)
  assert.match(api, /calls\?: CallRing\[\] \}/)
  // الشاشة: لوحة أرقام للتحويلة (أرقام بس)، واتصال بالاسم من دليل الاجتماعات، وآخر المكالمات بحالتها ومدتها، وكلمة «مفيش تسجيل»
  for (const text of ['data-call-pad', 'data-call-names', 'data-call-log', 'void call({ extension: number })', 'void call({ userId: person.id })', 'void call({ userId: entry.person.id })', 'fetchMeetDirectory()',
    '{CALL_PRIVACY_TEXT}', '{CALL_NOT_READY_TEXT}', '{MEET_NOT_CONFIGURED_TEXT}', 'await session.dial(target)', 'data.extensions ? (']) assert.ok(page.includes(text), text)
  assert.match(page, /const STATE: Record<CallState, \{ label: string; style: string \}> = \{\n\s+ringing:.*\n\s+active:.*\n\s+answered: \{ label: 'اتردّ عليها'.*\n\s+missed: \{ label: 'ماتردّش عليها'.*\n\s+rejected: \{ label: 'اترفضت'/)
  assert.match(page, /\.replace\(\/\\D\/g, ''\)\.slice\(0, EXTENSION_MAX\)/)
  assert.match(api, /export const CALL_PRIVACY_TEXT = 'مفيش أي مكالمة بتتسجّل: لا صوت ولا صورة/)
  assert.doesNotMatch(page, /^import (?!type )[^\n]*from 'livekit-client'/m)

  // الرنة: بطاقة «فلان بيتصل بيك» وتحويلته، رد / ارفض — من نفس الصندوق والنغمة، ومش فوق اجتماع أو مكالمة شغالة
  assert.match(global, /const callRings: CallRing\[\] = active \|\| session\?\.call \? \[\] : \(inbox\?\.calls \?\? \[\]\)\.filter/)
  assert.match(global, /const ringing = rings\.length > 0 \|\| callRings\.length > 0/)
  assert.match(global, /<strong className="block truncate text-sm">\{ring\.from\.displayName\} بيتصل بيك<\/strong>\n\s+<span className="block truncate text-xs text-gray-500">\{callPersonLine\(ring\.from\)\}<\/span>/)
  assert.match(global, /onClick=\{\(\) => answerCall\(ring\)\}><Phone size=\{16\} \/> رد<\/button>\n\s+<button type="button" className=\{refuse\} onClick=\{\(\) => refuseCall\(ring\)\}><PhoneOff size=\{16\} \/> ارفض<\/button>/)
  assert.match(global, /session\?\.answer\(ring\)\.catch/)
  assert.match(global, /rejectCall\(ring\.id\)\.catch/)
  assert.match(api, /person\.extension \? `تحويلة \$\{person\.extension\}` : person\.jobTitle \?\? ''/)
  // بطاقة المتصل وهو مستني: إلغاء
  assert.match(global, /data-meet-calling=\{outgoing\.phase\}/)
  assert.match(global, /onClick=\{\(\) => session\?\.hangup\(\)\}><PhoneOff size=\{16\} \/> إلغاء<\/button>/)

  // الجلسة: من غير غرفة انتظار ولا صفحة قبل الدخول — الرد ← التذكرة ← الغرفة؛ صوت الأول (المايك بس)
  const connect = session.slice(session.indexOf('  const connectCall = useCallback('), session.indexOf('  const dial = useCallback('))
  ordered(connect, ['await fetchCallToken(id)', 'new lk.Room(roomOptions(lk, prefsRef.current))', 'await live.connect(ticket.url, ticket.token, { autoSubscribe: true })', "phase: 'talking', room: live",
    'await live.localParticipant.setMicrophoneEnabled(true)'], 'connectCall')
  assert.doesNotMatch(connect, /setCameraEnabled|knock|prejoin|publishTrack/, 'الكاميرا مقفولة لحد ما المستخدم يفتحها، ومن غير طلب دخول')
  // أي طرف يقفل = للاتنين: القفل بينادي الخادم، والطرف التاني اللي مشي من غير «اقفل» بينهيها، والمكالمة اللي اتقفلت واحنا بندخل
  assert.match(session, /const hangup = useCallback\(\(\) => \{\n\s+const current = callRef\.current\n\s+if \(!current\) return\n\s+hangupCall\(current\.id\)\.catch\(\(\) => undefined\)\n\s+endCall\(\)/)
  assert.match(connect, /live\.on\(lk\.RoomEvent\.ParticipantDisconnected, \(\) => \{\n\s+if \(callRef\.current\?\.room !== live \|\| live\.remoteParticipants\.size > 0\) return\n\s+hangupCall\(id\)\.catch\(\(\) => undefined\)\n\s+endCall\(CALL_ENDED\)/)
  assert.match(connect, /if \(!stale\(\) && entry\.state !== 'active'\) endCall\(CALL_ENDED\)/)
  // المتصل بيسأل لحد ما يترد عليه أو تترفض أو محدش يرد
  assert.match(session, /if \(entry\.state === 'active'\) void connectCall\(callId\)\n\s+else if \(entry\.state === 'rejected'\) endCall\(`\$\{entry\.person\.displayName\} رفض المكالمة`\)\n\s+else if \(entry\.state !== 'ringing'\) endCall\(`\$\{entry\.person\.displayName\} ماردّش`\)/)
  // اجتماع ومكالمة مع بعض لأ
  assert.match(session, /if \(callRef\.current\) return void update\(\{ joinError: CALL_FIRST \}\)/)
  assert.match(session, /if \(dialing\.current \|\| callRef\.current \|\| roomRef\.current \|\| stateRef\.current\.phase\.k === 'connecting' \|\| stateRef\.current\.phase\.k === 'knocking'\) throw new Error\(BUSY_HERE\)/)
  // النافذة الصغيرة هي المكالمة: صوت الطرف التاني منها، ومن غير «ارجع للاجتماع»، والمايك والكاميرا بإيد المستخدم
  assert.match(session, /<MeetLiveWindow key=\{call\.id\} call room=\{call\.room\} title=\{`مكالمة مع \$\{call\.person\.displayName\}`\} joinedAt=\{call\.joinedAt\} onExpand=\{expand\} onLeave=\{hangup\} \/>/)
  assert.match(live, /\{call && remotes\.flatMap\(\(participant\) =>\n\s+\[\.\.\.participant\.audioTrackPublications\.values\(\)\]\.map\(\(publication\) => \(publication\.track && publication\.isSubscribed \? <AudioTrackPlayer key=\{publication\.trackSid\} track=\{publication\.track\} \/> : null\)\)\)\}/)
  assert.match(live, /\{!call && \(\n\s+<button type="button" className=\{control\(false\)\} onClick=\{onExpand\} title="ارجع للاجتماع"/)
  assert.match(live, /else await me\.setCameraEnabled\(!camOn\)/)

  // ملف الموظف: زرار «اتصال» جنب التحويلة — للي الموديول مفتوح له، ورقم أرقام فعلًا، ومش على ملفه هو
  assert.match(profile, /\{getCurrentUser\(\)\?\.employeeId !== employee\.id && <CallButton extension=\{employee\.workExtension\} \/>\}/)
  assert.match(button, /const enabled = useModuleEnabled\('meet'\)/)
  assert.match(button, /if \(!enabled \|\| !session \|\| !\/\^\\d\{1,10\}\$\/\.test\(number\)\) return null/)
  assert.match(button, /await session\.dial\(\{ extension: number \}\)/)
  // كلاسات الاتجاه: منطقية بس
  const PHYSICAL = /(^|[\s"'`:!])-?(?:(?:mr|ml|pr|pl|right|left)-[a-z0-9.\[]|text-(?:right|left)(?![a-z-])|(?:rounded|border)-(?:tr|tl|br|bl|r|l)(?![a-z]))/g
  for (const [name, source] of [['calls page', page], ['CallButton', button], ['MeetGlobal', global], ['MeetLiveWindow', live]]) assert.deepEqual(source.match(PHYSICAL) || [], [], name)
  // مفيش رقم عشوائي ولا عنوان خادم مكتوب في الواجهة
  assert.doesNotMatch(page + button, /wss?:\/\/|tel:/i)
  assert.match(crypto.randomUUID(), /^[0-9a-f-]{36}$/)
})
