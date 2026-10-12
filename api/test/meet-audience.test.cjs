'use strict'
// B-ADD.22: دعوة الاجتماع بالفلاتر المعتادة — فحص من غير قاعدة (الدورة الفعلية في meet-audience.integration.cjs):
//  MAU-01) القواعد: خانة الجمهور (الفاضية = من غير فلاتر، والكائن الفاضي = الشركة كلها، والشكل المحفوظ هو شكل الاستهداف الموحد)، والحد ورسالته.
//  MAU-02) الخادم: الصلاحية قبل المعاملة، والتحويل بترتيبه (النطاق ← وجود الأرقام ← أعضاء الجمهور بنطاق الحساب ← الحد ← قفل الصفوف ← القراءة
//          تاني ← الحسابات)، والاجتماع مابيحفظش الجمهور، والتعديل بيرفضه.
//  MAU-03) الواجهة: نافذة الإنشاء بـOrgAudienceField جنب منتقي الأسماء زي ما هو، للي معاه صلاحية شجرة المنتقي (نفس قايمة الخادم)، والكارت بعدد المدعوين.
// Run (من api/): node --test test/meet-audience.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const rules = require('../src/meet/meet-rules')
const root = path.resolve(__dirname, '..', '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n')
const refuses = (work, label) => assert.throws(work, error => error?.getStatus?.() === 400, label)
const ordered = (body, steps, label) => { let at = -1; for (const step of steps) { const found = body.indexOf(step, at + 1); assert.ok(found > at, `${label}: ${step}`); at = found } }

test('MAU-01: the audience field of a new meeting — empty means no filters, an empty object means the whole company, and the cap with its message', () => {
  assert.deepEqual([rules.cleanMeetAudience(undefined), rules.cleanMeetAudience(null)], [undefined, undefined])
  assert.deepEqual([rules.cleanMeetAudience({}), rules.cleanMeetAudience({ mode: 'all' }), rules.cleanMeetAudience({ mode: 'all', where: { mode: 'company' } })], [{ text: null }, { text: null }, { text: null }])
  assert.deepEqual(JSON.parse(rules.cleanMeetAudience({ mode: 'all', where: { mode: 'units', ids: [9, 3, 9], branchId: 2 }, exclude: [7, 5] }).text),
    { mode: 'all', ids: [], where: { mode: 'units', ids: [3, 9], branchId: 2 }, exclude: [5, 7] })
  assert.deepEqual(JSON.parse(rules.cleanMeetAudience({ mode: 'employees', ids: [4, '2'] }).text), { mode: 'employees', ids: ['2', '4'], where: null })
  assert.deepEqual(JSON.parse(rules.cleanMeetAudience({ where: { mode: 'branches', ids: [3] } }).text), { mode: 'all', ids: [], where: { mode: 'branches', ids: [3] } })
  for (const bad of ['x', 5, true, [], [1], { mode: 'roles', ids: ['hr'] }, { mode: 'positions', ids: ['team_leader'] }, { conditions: {} }, { mode: 'employees' }, { where: { mode: 'units', ids: [1] } },
    { where: { mode: 'departments', ids: [1] } }, { where: { mode: 'teams', ids: [] } }, { exclude: 'x' }, { exclude: Array.from({ length: 501 }, (_, index) => index + 1) }]) {
    refuses(() => rules.cleanMeetAudience(bad), JSON.stringify(bad))
  }
  assert.deepEqual([rules.MEET_MAX_INVITES, rules.meetTooManyInvites(612), rules.MEET_AUDIENCE_LABEL], [500, 'الاجتماع لـ500 مدعو بالكتير — الاختيار ده 612. صغّر الجمهور', 'جمهور الاجتماع'])
  for (const text of [rules.MEET_AUDIENCE_PERM, rules.MEET_AUDIENCE_NOBODY, rules.MEET_AUDIENCE_NO_ACCOUNTS, rules.MEET_AUDIENCE_ON_CREATE]) assert.ok(text.length > 10)
})

test('MAU-02: the server — permission before the transaction, the one-time expansion in order with the judgment after the row locks, nothing of the audience stored, and update refusing it', () => {
  const service = read('api/src/meet/meet.service.ts'), controller = read('api/src/meet/meet.controller.ts'), entities = read('api/src/meet/meet.entities.ts')
  const part = (name, next) => service.slice(service.indexOf(`  ${name}(`), service.indexOf(`  ${next}(`))
  // الخانة في جسم الإنشاء، والصلاحية هي صلاحية شجرة المنتقي ومعاينته، قبل فتح المعاملة
  assert.match(controller, /@IsOptional\(\) audience\?: unknown/)
  const create = part('async create', 'private async audienceInvites')
  ordered(create, ['cleanMeetAudience(input?.audience)', 'ORG_AUDIENCE_PERMS.some((perm) => userHasPerm(user, perm))', "code: 'MEET_AUDIENCE_PERM'", 'this.ds.transaction(', 'await this.guard(em)',
    'await this.audienceInvites(em, user, audience.text)', 'await this.activeUsers(em, wanted, user.sub)', 'invitees.length > MEET_MAX_INVITES', 'getRepository(Meeting).insert(', 'getRepository(MeetingInvite).insert('], 'create')
  assert.match(create, /if \(!expanded\) return \{ id: code \}/, 'من غير جمهور الرد زي الأول')
  // التحويل: كله على اتصال المعاملة (em)، بنطاق فروع الحساب، والحكم بعد قفل الصفوف
  const expand = part('private async audienceInvites', 'async detail')
  ordered(expand, ['const scope = branchScopeOf(user)', '!scope.includes(Number(where.branchId))', 'await assertAudienceTargets(em, audience, MEET_AUDIENCE_LABEL)', 'await audienceMembersNow(em, audience, scope)',
    'MEET_AUDIENCE_NOBODY', 'MEET_AUDIENCE_NO_ACCOUNTS', 'first.length > MEET_MAX_INVITES', 'WITH (UPDLOCK, ROWLOCK)', 'await audienceMembersNow(em, audience, scope)', 'await accountsOf('], 'audienceInvites')
  assert.match(expand, /member\.id !== user\.employeeId/, 'صاحب الاجتماع برّه')
  assert.match(expand, /u\.\[isActive\] = 1 AND u\.\[id\] <> @1 AND u\.\[employeeId\] IN /, 'الحسابات النشطة بس، ومن غير حساب صاحب الاجتماع')
  assert.doesNotMatch(expand, /this\.ds\.(manager|query)/, 'ولا قراءة برّه اتصال المعاملة')
  assert.equal((expand.match(/audienceMembersNow\(em, audience, scope\)/g) || []).length, 2)
  // مرة واحدة: الاجتماع وجداوله من غير أي عمود للجمهور
  assert.doesNotMatch(entities, /audience/i)
  assert.doesNotMatch(read('docs/migrations/payroll/20261012_191_meetings.sql'), /audience/i)
  // التعديل بالاسم بس
  assert.match(part('async update', 'async cancel'), /if \(input\?\.audience !== undefined && input\.audience !== null\) throw new BadRequestException\(MEET_AUDIENCE_ON_CREATE\)/)
})

test('MAU-03: the screens — the create dialog offers the unified audience field beside the unchanged people picker, to whoever holds a permission of the audience tree, and the card counts the invited', () => {
  const dialog = read('src/components/meet/MeetDialog.tsx'), api = read('src/lib/meet-api.ts'), page = read('src/app/meet/page.tsx')
  // نفس قايمة الخادم بالحرف
  const { ORG_AUDIENCE_PERMS } = require('../src/org/org.controller')
  const front = [...api.slice(api.indexOf('export const MEET_AUDIENCE_PERMS = ['), api.indexOf(']', api.indexOf('export const MEET_AUDIENCE_PERMS = ['))).matchAll(/'([a-z_.]+)'/g)].map(match => match[1])
  assert.deepEqual(front, ORG_AUDIENCE_PERMS)
  assert.match(dialog, /import \{ OrgAudienceField \} from '\.\.\/OrgAudienceField'/)
  assert.match(dialog, /const \[canAudience\] = useState\(\(\) => mode !== 'edit' && MEET_AUDIENCE_PERMS\.some\(can\)\)/, 'في الإنشاء بس، وللي معاه الصلاحية')
  assert.match(dialog, /<OrgAudienceField value=\{audience\} disabled=\{busy\} onChange=\{\(next, complete\) => \{ setAudience\(next\); setAudienceComplete\(complete\) \}\} \/>/)
  assert.match(dialog, /<PeoplePicker userIds=\{users\} onChange=\{setUsers\} \/>/, 'منتقي الأسماء زي ما هو')
  assert.match(dialog, /createMeeting\(byAudience \? \{ \.\.\.body, audience: audience \?\? \{ mode: 'all' \} \} : \{ \.\.\.body, inviteUserIds: users \}\)/, 'الشركة كلها كائن صريح، والخانة الفاضية = من غير فلاتر')
  assert.match(dialog, /&& \(!byAudience \|\| audienceComplete\)/, 'الاختيار الناقص مايتحفظش')
  assert.match(dialog, /await updateMeeting\(meetingId, \{ \.\.\.body, inviteUserIds: users \}\)/, 'التعديل بالاسم')
  assert.ok(dialog.includes(`(${rules.MEET_MAX_INVITES} بالكتير)`))
  assert.match(api, /export const createMeeting = \(body: MeetingBody\) => post<MeetingCreated>\(R, body\)/)
  assert.match(api, /audience\?: StoredAudience \}/)
  // الكارت بعدد المدعوين، والكلمة بعد الإنشاء
  assert.match(page, /\{meeting\.inviteCount > 0 && <span className="text-xs text-gray-400">\{meeting\.inviteCount\} مدعو<\/span>\}/)
  assert.match(page, /const invited = created \? meetInvitedText\(created\) : ''/)
  assert.match(api, /`اتدعى \$\{created\.invited\}\$\{skipped > 0 \? ` — و\$\{skipped\} موظف من غير حساب على النظام مااتدعوش` : ''\}`/)
})
