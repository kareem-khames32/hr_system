'use strict'
// B-ADD.15: الاجتماعات — فحص من غير قاعدة (الدورة الفعلية في meet.integration.cjs):
//  MTU-01) القواعد: حالة الاجتماع من أوقاته، وقيم الإنشاء والتعديل.
//  MTU-02) مساعد LiveKit من غير مكتبة: الإعداد من البيئة، وتوقيع التذكرة (HS256 وصلاحياتها ومدتها)، ونداءات Twirp على خادم وهمي على 127.0.0.1
//         (المسار والتذكرة والجسم، والخطأ «مش موجود» و«مش بيرد» والمهلة).
//  MTU-03) الربط: موديول جديد مقفول ومساره، والمسارات بحراسها، والكتابة تحت قفل صف الاجتماع ونداء الخادم برّه المعاملة، والكيانات من غير افتراضي،
//         وإعداد الخادم في .env.example من غير قيم، ورؤوس المتصفح (الكاميرا والمايك ومشاركة الشاشة لصفحات النظام، ومفيش connect-src)،
//         والواجهة: القايمة والعنوان والقاموس، والرنة في الإطار لما الموديول مفتوح بس، ومكتبة الغرفة بتتحمّل في المتصفح بس، وكلاسات الاتجاه.
// Run (من api/): node --test test/meet.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), http = require('node:http')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const rules = require('../src/meet/meet-rules')
const livekit = require('../src/meet/livekit')
const { MODULES, routeOwner, routeAvailable, enabledSnapshot } = require('../src/modules-registry/registry')
const root = path.resolve(__dirname, '..', '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n')
const refuses = (work, label) => assert.throws(work, error => error?.getStatus?.() === 400, label)
const MEET_FILES = fs.readdirSync(path.join(root, 'src/components/meet')).map(name => `src/components/meet/${name}`).concat(['src/app/meet/page.tsx', 'src/app/meet/[id]/page.tsx', 'src/lib/meet-api.ts'])

test('MTU-01: meeting status from its times, and the values of create and update', () => {
  const now = Date.UTC(2026, 9, 12, 10, 0, 0), at = minutes => new Date(now + minutes * 60000)
  const meeting = (extra = {}) => ({ startsAt: null, createdAt: at(-5), endedAt: null, cancelledAt: null, ...extra })
  assert.deepEqual([rules.meetStatusOf(meeting(), now), rules.meetStatusOf(meeting({ endedAt: at(-1) }), now), rules.meetStatusOf(meeting({ cancelledAt: at(-1), endedAt: at(-1) }), now),
    rules.meetStatusOf(meeting({ createdAt: at(-12 * 60 - 1) }), now), rules.meetStatusOf(meeting({ createdAt: at(-12 * 60 + 1) }), now),
    rules.meetStatusOf(meeting({ startsAt: at(16) }), now), rules.meetStatusOf(meeting({ startsAt: at(14) }), now), rules.meetStatusOf(meeting({ startsAt: at(-30), createdAt: at(-3000) }), now),
    rules.meetStatusOf(meeting({ startsAt: at(-12 * 60 - 1), createdAt: at(-3000) }), now)],
  ['live', 'ended', 'cancelled', 'ended', 'live', 'scheduled', 'live', 'live', 'ended'])
  assert.deepEqual([rules.MEET_EARLY_MS, rules.MEET_EXPIRE_MS, rules.MEET_RING_MS, rules.MEET_REJOIN_MS, rules.MEET_MAX_INVITES, rules.MEET_LIST_DAYS], [900000, 43200000, 60000, 120000, 500, 60])
  assert.ok(rules.MEET_KNOCK_FRESH_MS >= 15000, 'أطول من كذا سؤال من اللي مستني (كل 3 ثواني)')

  assert.deepEqual([rules.cleanMeetTitle('  متابعة   المشروع '), rules.cleanMeetTitle('ع'.repeat(200)).length], ['متابعة المشروع', 200])
  for (const bad of ['', '   ', null, undefined, 5, 'ع'.repeat(201)]) refuses(() => rules.cleanMeetTitle(bad), 'title')
  assert.deepEqual([rules.cleanMeetStart(undefined, now), rules.cleanMeetStart(null, now), rules.cleanMeetStart('', now), rules.cleanMeetStart(at(60).toISOString(), now).getTime(),
    rules.cleanMeetStart(at(-4).toISOString(), now).getTime(), rules.cleanMeetStart(at(365 * 24 * 60).toISOString(), now).getTime()], [undefined, null, null, at(60).getTime(), at(-4).getTime(), at(365 * 24 * 60).getTime()])
  for (const bad of ['x', 5, {}, at(-6).toISOString(), at(367 * 24 * 60).toISOString(), 'x'.repeat(41)]) {
    assert.throws(() => rules.cleanMeetStart(bad, now), error => error.getStatus() === 400 && error.getResponse().code === 'MEET_INVALID_START' && error.getResponse().message === rules.MEET_START, String(bad))
  }
  assert.deepEqual([rules.cleanMeetLobby(undefined), rules.cleanMeetLobby(true), rules.cleanMeetLobby(false)], [undefined, true, false])
  for (const bad of [null, 1, 'true']) refuses(() => rules.cleanMeetLobby(bad), 'lobby')
  assert.deepEqual([rules.cleanMeetInvites(undefined), rules.cleanMeetInvites(null), rules.cleanMeetInvites([]), rules.cleanMeetInvites([3, 5, 3])], [undefined, undefined, [], [3, 5]])
  for (const bad of ['3', [0], [-1], [1.5], ['3'], [null], Array.from({ length: 501 }, (_, index) => index + 1)]) refuses(() => rules.cleanMeetInvites(bad), 'invites')
  assert.equal(rules.cleanMeetUserId(7), 7)
  for (const bad of [0, -1, 1.5, '7', null, undefined]) refuses(() => rules.cleanMeetUserId(bad), 'user')
})

test('MTU-02: the LiveKit helper without a library — config from the environment, the signed ticket, and Twirp calls against a fake server on 127.0.0.1', async () => {
  // الإعداد: ناقص = null؛ وعنوان الأوامر الغايب بيتاخد من عنوان المتصفح
  const full = { LIVEKIT_URL: 'wss://meet.example.invalid/', LIVEKIT_API_KEY: ' APIkey ', LIVEKIT_API_SECRET: 'not-a-real-secret' }
  assert.deepEqual(livekit.livekitConfig(full), { url: 'wss://meet.example.invalid', httpUrl: 'https://meet.example.invalid', key: 'APIkey', secret: 'not-a-real-secret' })
  assert.deepEqual([livekit.livekitConfig({ ...full, LIVEKIT_URL: 'ws://127.0.0.1:7880' }).httpUrl, livekit.livekitConfig({ ...full, LIVEKIT_URL: 'wss://h.invalid/rtc' }).httpUrl,
    livekit.livekitConfig({ ...full, LIVEKIT_HTTP_URL: 'http://127.0.0.1:7880/' }).httpUrl, livekit.livekitConfig({ ...full, LIVEKIT_HTTP_URL: 'not-a-url' }).httpUrl],
  ['http://127.0.0.1:7880', 'https://h.invalid/rtc', 'http://127.0.0.1:7880', 'https://meet.example.invalid'])
  for (const broken of [{}, { ...full, LIVEKIT_URL: '' }, { ...full, LIVEKIT_URL: 'meet.example.invalid' }, { ...full, LIVEKIT_URL: 'https://meet.example.invalid' }, { ...full, LIVEKIT_API_KEY: ' ' }, { ...full, LIVEKIT_API_SECRET: undefined }]) {
    assert.equal(livekit.livekitConfig(broken), null, JSON.stringify(broken))
  }

  // التذكرة: JWT بـHS256 بسر الخادم
  const config = { key: 'APItest', secret: crypto.randomBytes(24).toString('hex') }
  const decode = token => {
    const [head, body, signature] = token.split('.')
    assert.equal(crypto.createHmac('sha256', config.secret).update(`${head}.${body}`).digest('base64url'), signature)
    assert.deepEqual(JSON.parse(Buffer.from(head, 'base64url').toString()), { alg: 'HS256', typ: 'JWT' })
    return JSON.parse(Buffer.from(body, 'base64url').toString())
  }
  const now = Date.UTC(2026, 9, 12, 10, 0, 0)
  const room = crypto.randomUUID()
  const guest = decode(livekit.participantToken(config, { room, identity: '42', name: 'بسمة', metadata: { jobTitle: 'محاسبة' }, host: false }, now))
  assert.deepEqual(guest, { sub: '42', jti: '42', name: 'بسمة', metadata: '{"jobTitle":"محاسبة"}',
    video: { room, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true, canUpdateOwnMetadata: false, roomAdmin: false }, iss: 'APItest', nbf: now / 1000, exp: now / 1000 + 7200 })
  assert.equal(decode(livekit.participantToken(config, { room, identity: '7', name: 'أحمد', metadata: {}, host: true }, now)).video.roomAdmin, true)
  assert.equal(livekit.LIVEKIT_TOKEN_TTL_SECONDS, 7200)
  assert.notEqual(livekit.signLivekitJwt({ ...config, secret: 'x' }, { sub: '1' }, 60, now).split('.')[2], livekit.signLivekitJwt(config, { sub: '1' }, 60, now).split('.')[2])

  // نداءات Twirp على خادم وهمي
  const calls = []
  let mode = 'ok'
  const server = http.createServer((req, res) => {
    let raw = ''
    req.on('data', chunk => { raw += chunk })
    req.on('end', () => {
      calls.push({ url: req.url, verb: req.method, type: req.headers['content-type'], auth: req.headers.authorization, body: JSON.parse(raw) })
      const reply = (status, json) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(typeof json === 'string' ? json : JSON.stringify(json)) }
      if (mode === 'slow') return void setTimeout(() => reply(200, {}), 400)
      if (mode === 'missing') return reply(404, { code: 'not_found', msg: 'participant does not exist' })
      if (mode === 'down') return reply(500, 'oops')
      if (req.url.endsWith('/ListRooms')) return reply(200, { rooms: [{ name: 'a', numParticipants: 3 }, { name: 'b', num_participants: 2 }, { name: 'c' }] })
      if (req.url.endsWith('/GetParticipant')) return reply(200, { tracks: [{ sid: 'T1', source: 'MICROPHONE', muted: false }, { sid: 'T2', source: 2, muted: false }, { sid: 'T3', source: 'MICROPHONE', muted: true },
        { sid: 'T4', source: 'CAMERA', muted: false }, { sid: 'T5', source: 1 }, { sid: 'T6', source: 'SCREEN_SHARE', muted: false }, { source: 'CAMERA' }] })
      return reply(200, {})
    })
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const target = { ...config, url: `ws://127.0.0.1:${server.address().port}`, httpUrl: `http://127.0.0.1:${server.address().port}` }
  try {
    assert.deepEqual([...(await livekit.livekitRoomCounts(target, ['a', 'b', 'c']))], [['a', 3], ['b', 2], ['c', 0]])
    const listed = calls.at(-1), claims = decode(listed.auth.replace(/^Bearer /, ''))
    assert.deepEqual([listed.url, listed.verb, listed.type, listed.body, claims.video, claims.iss, claims.exp - claims.nbf, /^Bearer [\w-]+\.[\w-]+\.[\w-]+$/.test(listed.auth)],
      ['/twirp/livekit.RoomService/ListRooms', 'POST', 'application/json', { names: ['a', 'b', 'c'] }, { roomList: true }, 'APItest', 600, true])
    await livekit.livekitDeleteRoom(target, room)
    assert.deepEqual([calls.at(-1).url, calls.at(-1).body, decode(calls.at(-1).auth.slice(7)).video], ['/twirp/livekit.RoomService/DeleteRoom', { room }, { roomCreate: true }])
    await livekit.livekitRemoveParticipant(target, room, '42')
    assert.deepEqual([calls.at(-1).url, calls.at(-1).body, decode(calls.at(-1).auth.slice(7)).video], ['/twirp/livekit.RoomService/RemoveParticipant', { room, identity: '42' }, { roomAdmin: true, room }])
    // الكتم: المفتوح بس من مصدره (بالاسم أو بالرقم)
    let from = calls.length
    assert.equal(await livekit.livekitMuteParticipant(target, room, '42', 'audio'), 2)
    assert.deepEqual(calls.slice(from).map(call => [call.url.split('/').pop(), call.body.track_sid ?? null, call.body.muted ?? null]), [['GetParticipant', null, null], ['MutePublishedTrack', 'T1', true], ['MutePublishedTrack', 'T2', true]])
    from = calls.length
    assert.equal(await livekit.livekitMuteParticipant(target, room, '42', 'video'), 2)
    assert.deepEqual(calls.slice(from).map(call => call.body.track_sid ?? null), [null, 'T4', 'T5'])
    // الأخطاء: مش موجود، خادم واقع، مهلة، خادم مش بيرد خالص
    mode = 'missing'
    await assert.rejects(livekit.livekitRemoveParticipant(target, room, '42'), error => error instanceof livekit.LivekitError && error.notFound && error.status === 404 && error.code === 'not_found')
    mode = 'down'
    await assert.rejects(livekit.livekitDeleteRoom(target, room), error => error instanceof livekit.LivekitError && !error.notFound && error.status === 500)
    mode = 'slow'
    await assert.rejects(livekit.livekitRoomCounts(target, ['a'], 50), error => error instanceof livekit.LivekitError && error.status === 0 && error.code === 'unreachable' && !error.notFound)
  } finally {
    await new Promise(resolve => { server.closeAllConnections?.(); server.close(resolve) })
  }
  await assert.rejects(livekit.livekitDeleteRoom(target, room), error => error instanceof livekit.LivekitError && error.status === 0, 'الخادم مقفول')
})

test('MTU-03: a new closed module and its route, guarded routes, writes under the meeting row lock with the server call outside the transaction, entities without defaults, env placeholders, browser headers, and the screens', () => {
  // السجل: موديول جديد مقفول، برّه الباقات، من غير صلاحية (مفيش إجراء إداري)
  const module = MODULES.meet
  assert.deepEqual([module.nameAr, module.defaultEnabled, module.core, module.preset, module.permissions, module.routes, module.dependsOn, module.requestTypes, module.jobs],
    ['الاجتماعات', false, false, null, [], ['/meet'], [], [], []])
  assert.deepEqual([routeOwner('/meet'), routeOwner(`/meet/${crypto.randomUUID()}`)], [{ module: 'meet', feature: null }, { module: 'meet', feature: null }])
  const off = enabledSnapshot({ modules: {}, features: {} }), on = enabledSnapshot({ modules: { meet: true }, features: {} })
  assert.deepEqual([off.modules.includes('meet'), routeAvailable('/meet', off), on.modules.includes('meet'), routeAvailable('/meet/x', on)], [false, false, true, true])
  const { ALL_PERMISSIONS } = require('../src/auth/permissions')
  assert.equal(ALL_PERMISSIONS.some(key => key.startsWith('meet')), false)

  // الخادم: الكنترولر بحراسه، والمسار الثابت قبل المتغيّر، وكل مسار بكود الاجتماع (UUID)
  const controller = read('api/src/meet/meet.controller.ts'), service = read('api/src/meet/meet.service.ts'), helper = read('api/src/meet/livekit.ts'), entities = read('api/src/meet/meet.entities.ts')
  assert.match(controller, /@RequireModule\('meet'\)\n@UseGuards\(JwtAuthGuard, RolesGuard\)\n@Controller\('meet'\)/)
  assert.equal((controller.match(/@(Get|Post|Patch|Delete)\(/g) || []).length, 17)
  assert.equal((controller.match(/@Param\('id', ParseUUIDPipe\) id: string/g) || []).length, 13)
  assert.doesNotMatch(controller, /@Param\('id'\)/)
  assert.match(read('api/src/app.module.ts'), /import \{ MeetModule \} from '\.\/meet\/meet\.module'/)
  // من غير مكتبة LiveKit للخادم، ومن غير أي نداء تسجيل
  for (const source of [controller, service, helper, read('api/package.json')]) assert.doesNotMatch(source, /livekit-server-sdk/)
  assert.deepEqual([...new Set([...helper.matchAll(/'(ListRooms|DeleteRoom|RemoveParticipant|GetParticipant|MutePublishedTrack|[A-Z]\w+Egress\w*|StartRoomCompositeEgress)'/g)].map(match => match[1]))].sort(),
    ['DeleteRoom', 'GetParticipant', 'ListRooms', 'MutePublishedTrack', 'RemoveParticipant'])
  assert.match(helper, /fetch\(`\$\{config\.httpUrl\}\/twirp\/livekit\.RoomService\/\$\{method\}`/)
  assert.doesNotMatch(helper + service, /livekit\.Egress|console\.log|this\.log\.\w+\([^)]*secret/)
  // الإعداد من البيئة وقت النداء (مش متخزّن)، والسر مابيرجعش في رد
  assert.match(service, /const config = livekitConfig\(\)\n\s+if \(!config\) throw new ServiceUnavailableException\(\{ code: 'MEET_NOT_CONFIGURED', message: MEET_NOT_CONFIGURED \}\)/)
  assert.match(service, /return \{ token, url: config\.url, host: role === 'host' \}/)
  assert.doesNotMatch(service, /config\.secret|config\.key/)
  // كل كتابة لصاحب الاجتماع: جوه معاملة، تحت قفل صف الاجتماع، والحكم بعد القفل؛ ونداء خادم الاجتماعات برّه المعاملة
  const part = (name, next) => service.slice(service.indexOf(`  async ${name}(`), service.indexOf(`  async ${next}(`))
  for (const [name, next, steps] of [
    ['update', 'cancel', ['this.ds.transaction(', 'await this.guard(em)', 'await this.load(em, code, true)', 'this.hostOnly(user, meeting)', 'this.open(meeting)', 'getRepository(Meeting).update({ id: meeting.id }, changes)']],
    ['cancel', 'end', ['this.ds.transaction(', 'await this.load(em, code, true)', 'this.hostOnly(user, meeting)', 'this.open(meeting)', 'cancelledAt: new Date()', '})\n', 'await this.closeRoom(config, code)', 'this.clearMeeting(code)']],
    ['end', 'token', ['this.ds.transaction(', 'await this.load(em, code, true)', 'this.hostOnly(user, meeting)', 'endedAt: new Date()', '})\n', 'await this.closeRoom(config, code)', 'this.clearMeeting(code)']],
    ['admit', 'deny', ['this.ds.transaction(', 'await this.load(em, code, true)', 'this.hostOnly(user, meeting)', 'this.open(meeting)', 'invites.insert(', '})\n', 'this.removeKnock(code, userId)']],
    ['remove', 'zzz', ['this.ds.transaction(', 'await this.load(em, code, true)', 'this.hostOnly(user, meeting)', 'this.open(meeting)', 'this.mark(this.blocked, code, userId)', 'getRepository(MeetingInvite).delete(', '})\n', 'livekitRemoveParticipant(config, code, String(userId))']],
  ]) {
    const body = next === 'zzz' ? service.slice(service.indexOf(`  async ${name}(`)) : part(name, next)
    let at = -1
    for (const step of steps) { const found = body.indexOf(step, at + 1); assert.ok(found > at, `${name}: ${step}`); at = found }
  }
  assert.match(service, /lock \? \{ lock: \{ mode: 'pessimistic_write' as const \} \} : \{\}/)
  const mute = part('mute', 'remove')
  assert.ok(mute.indexOf('this.hostOnly(user, meeting)') > 0 && mute.indexOf('this.hostOnly(user, meeting)') < mute.indexOf('livekitMuteParticipant('), 'صاحب الاجتماع قبل نداء الخادم')
  assert.doesNotMatch(mute, /this\.ds\.transaction/)
  // التذكرة: الحكم قبل التوقيع؛ وغير المدعو مالوش غير طلب الدخول
  const token = part('token', 'knock')
  const order = ['this.open(meeting)', 'this.mayEnter(role, meeting, user.sub)', "code: 'MEET_KNOCK_REQUIRED'", 'participantToken(config,', 'attendance.insert('].map(step => token.indexOf(step))
  assert.ok(order.every((at, index) => at > 0 && (index === 0 || at > order[index - 1])), JSON.stringify(order))
  assert.match(service, /return role === 'host' \|\| \(!this\.isBlocked\(meeting\.code, userId\) && \(role === 'invited' \|\| !meeting\.lobby\)\)/)
  // الدليل: الاسم والمسمى بس، من الحسابات النشطة
  const directory = part('directory', 'list')
  assert.match(directory, /SELECT TOP \(5000\) u\.\[id\], \$\{MEET_PERSON_NAME_SQL\} AS \[displayName\], e\.\[jobTitle\], u\.\[displayName\] AS \[accountName\], e\.\[fullNameEn\]\n\s+FROM \[users\] u LEFT JOIN \[employees\] e ON e\.\[id\] = u\.\[employeeId\]\n\s+WHERE u\.\[isActive\] = 1 AND u\.\[id\] <> @0/)
  assert.doesNotMatch(service, /\.save\(/, 'الكتابة بالخانات بس')
  assert.doesNotMatch(entities, /default:|CreateDateColumn/, 'من غير افتراضي (زي الترحيل)')
  assert.match(read('docs/migrations/payroll/20261012_191_meetings.sql'), /^-- 20261012_191: /)

  // الإعداد: أسماء المتغيرات في المثال من غير قيمة للمفتاح والسر
  const example = read('api/.env.example')
  for (const name of ['LIVEKIT_URL', 'LIVEKIT_HTTP_URL', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET']) assert.match(example, new RegExp(`^# ${name}=`, 'm'), name)
  assert.match(example, /^# LIVEKIT_API_KEY=\n# LIVEKIT_API_SECRET=$/m)

  // رؤوس المتصفح: الكاميرا والمايك ومشاركة الشاشة لصفحات النظام نفسه؛ ومفيش connect-src فاتصال المتصفح بخادم الاجتماعات مش ممنوع ومن غير عنوان مكتوب
  const next = read('next.config.js')
  assert.match(next, /\{ key: 'Permissions-Policy', value: 'camera=\(self\), microphone=\(self\), geolocation=\(self\), display-capture=\(self\)' \}/)
  assert.match(next, /\{ key: 'Content-Security-Policy', value: "frame-ancestors 'none'" \}/)
  assert.doesNotMatch(next.split('\n').filter(line => !/^\s*\/\//.test(line)).join('\n'), /connect-src|default-src|wss?:\/\//)
  assert.doesNotMatch(MEET_FILES.map(read).join('\n'), /wss?:\/\/[a-z0-9]/i, 'عنوان الخادم بييجي من الخادم مع التذكرة')

  // الواجهة: القايمة والعنوان والقاموس
  assert.match(read('src/components/layout/Sidebar.tsx'), /\{ label: 'الاجتماعات', href: '\/meet' \},/)
  const titles = read('src/components/layout/pageTitles.ts')
  assert.ok(titles.indexOf("[/^\\/meet\\/[^/]+/, 'اجتماع']") > 0 && titles.indexOf("[/^\\/meet\\/[^/]+/, 'اجتماع']") < titles.indexOf("['/meet', 'الاجتماعات']"))
  assert.match(read('src/i18n/en.ts'), /^  'الاجتماعات': 'Meetings',$/m)
  // الطبقة في الـroot layout حوالين الإطار، والسؤال الدوري لما الموديول مفتوح للحساب بس، والتبويب ظاهر
  assert.match(read('src/app/layout.tsx'), /<MeetLayer>\n\s+<AppShell>\{children\}<\/AppShell>\n\s+<\/MeetLayer>/)
  const layer = read('src/components/meet/MeetLayer.tsx'), global = read('src/components/meet/MeetGlobal.tsx'), session = read('src/components/meet/MeetSession.tsx')
  assert.match(layer, /const enabled = useModuleEnabled\('meet'\)/)
  assert.match(layer, /\{enabled && <MeetGlobal \/>\}/)
  assert.match(global, /export const MEET_POLL_MS = 5000/)
  assert.match(global, /if \(document\.visibilityState === 'visible'\) \{\n\s+try \{\n\s+const next = await fetchMeetInbox\(\)/)
  assert.match(global, /if \(!next\.ready \|\| !next\.configured\) delay = IDLE_POLL_MS/)
  assert.match(global, /const rings: MeetRing\[\] = active \? \[\] : /, 'الرنة مابتطلعش فوق اجتماع شغال')
  // اللي مستني بيسأل، والخادم بيقول له النتيجة
  assert.match(session, /fetchKnockState\(id\)\.then\(\(reply\) => \{/)
  assert.match(session, /if \(meetErrorCode\(error\) === 'MEET_KNOCK_REQUIRED'\) \{/)
  assert.match(session, /await room\.connect\(ticket\.url, ticket\.token, \{ autoSubscribe: true \}\)/)
  // مكتبة الغرفة بتتحمّل في المتصفح بس: استيراد قيمة في ملفات الغرفة (المحمّلة بـdynamic من غير ssr)، وأنواع بس في الباقي
  const valueImport = /^import (?!type )[^\n]*from 'livekit-client'/m
  const heavy = ['src/components/meet/RoomView.tsx', 'src/components/meet/Tile.tsx', 'src/components/meet/MeetLiveWindow.tsx', 'src/components/meet/MeetRoom.tsx']
  for (const file of MEET_FILES) assert.equal(valueImport.test(read(file)), heavy.includes(file), file)
  assert.match(session, /const RoomView = dynamic\(\(\) => import\('\.\/RoomView'\), \{ ssr: false \}\)\nconst MeetLiveWindow = dynamic\(\(\) => import\('\.\/MeetLiveWindow'\), \{ ssr: false \}\)/)
  assert.match(session, /lk = await import\('livekit-client'\)/)
  assert.match(read('src/app/meet/[id]/page.tsx'), /const MeetRoom = dynamic\(\(\) => import\('@\/components\/meet\/MeetRoom'\), \{\n\s+ssr: false,/)
  for (const file of MEET_FILES.filter(name => !heavy.includes(name))) assert.doesNotMatch(read(file), /from '\.\/(RoomView|Tile|MeetLiveWindow|MeetRoom)'/, `${file}: مايستوردش ملف غرفة مباشرة`)
  assert.equal(JSON.parse(read('package.json')).dependencies['livekit-client'], '^2.22.4')
  // الرابط الآمن: الشاشة بتقولها صريحة
  assert.match(read('src/app/meet/page.tsx'), /setInsecure\(!window\.isSecureContext\)/)
  assert.match(read('src/components/meet/devices.ts'), /!window\.isSecureContext \|\| !navigator\.mediaDevices/)
  assert.match(read('src/lib/meet-api.ts'), /export const MEET_NOT_CONFIGURED_TEXT = 'الاجتماعات لسه ماتظبطتش'/)
  assert.ok(read('src/app/meet/page.tsx').includes('{MEET_NOT_CONFIGURED_TEXT}') && read('src/app/meet/page.tsx').includes('{MEET_INSECURE_TEXT}'))
  // كلاسات الاتجاه: منطقية بس في شاشات الاجتماعات
  const PHYSICAL = /(^|[\s"'`:!])-?(?:(?:mr|ml|pr|pl|right|left)-[a-z0-9.\[]|text-(?:right|left)(?![a-z-])|(?:rounded|border)-(?:tr|tl|br|bl|r|l)(?![a-z]))/g
  for (const file of MEET_FILES) assert.deepEqual(read(file).match(PHYSICAL) || [], [], file)
})
