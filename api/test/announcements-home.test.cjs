// B-ADD.4: الإعلانات تظهر وتوصل — فحص من غير قاعدة: كارت «الإعلانات» في «لوحتي» (المثبّت أولًا من الخادم، «جديد» لحد ما يتفتح، «قريت» للي
// عليه إقرار)، ونسبة القراءة في قايمة الإدارة، وتقرير «مين ماقراش». الدورة الفعلية في announcements-home.integration.cjs.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
const root = path.resolve(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')

test('AHU-01: the announcements card sits on top of the employee home, marks an ordinary announcement read on opening, and keeps the acknowledgement to its button', () => {
  const home = read('src/components/dashboard/EmployeeHome.tsx')
  assert.match(home, /import \{ MyAnnouncementsCard \} from '@\/components\/dashboard\/MyAnnouncementsCard'/)
  // فوق: بعد كارت الترحيب وقبل باقي اللوحة، ولصاحب ملف موظف بس
  assert.ok(home.indexOf('{user?.employeeId && <MyAnnouncementsCard />}') > 0 && home.indexOf('{user?.employeeId && <MyAnnouncementsCard />}') < home.indexOf('{loading ? ('))
  const card = read('src/components/dashboard/MyAnnouncementsCard.tsx')
  assert.match(card, /const on = useModuleEnabled\('announcements'\)/)
  assert.match(card, /if \(!on\) \{ setItems\(null\); return \}/, 'الموديول مقفول = مفيش نداء')
  assert.match(card, /if \(!on \|\| !items \|\| items\.length === 0\) return null/, 'ومفيش كارت من غير إعلانات')
  assert.match(card, /fetchAnnouncementsBoard\(\)/, 'نفس لوحة الخادم (المثبّت أولًا ثم الأحدث، وفي جمهور الموظف بس)')
  assert.match(card, /\{!item\.read && <span [^>]*data-my-announcement-new>جديد<\/span>\}/)
  assert.match(card, /if \(opening && !item\.read && !item\.requiresRead\) void markRead\(item\)/, 'فتح الإعلان العادي = اتقري')
  assert.match(card, /\) : item\.requiresRead \? \(\s*<button type="button" className="btn-primary text-sm" disabled=\{busy !== null\} onClick=\{\(\) => void markRead\(item\)\} data-my-announcement-ack>/)
  assert.match(card, /\{busy === item\.id \? 'جاري التسجيل…' : 'قريت'\}/)
  assert.match(card, /items\.slice\(0, MY_ANNOUNCEMENTS_SHOWN\)/)
  assert.match(card, /<Link href="\/announcements"/)
})

test('AHU-02: the manager sees the read rate of every published announcement, and who has not read comes first in the report', () => {
  const service = read('api/src/announcements/announcements.service.ts')
  assert.match(service, /const stats = await this\.readStats\(this\.ds\.manager, rows\.filter\(row => row\.status === 'PUBLISHED'\), scope\)/)
  assert.match(service, /readStats: stats\.get\(row\.id\) \?\? null/)
  // الموظفين بيتقروا مرة لكل الإعلانات، والقراءات باستعلام مجمّع
  const stats = service.slice(service.indexOf('private async readStats('), service.indexOf('/** تقرير القراءة'))
  assert.equal((stats.match(/this\.audiencePool\(/g) ?? []).length, 1)
  assert.match(stats, /stats\.set\(row\.id, \{ audience: members\.length, read: seen \? members\.filter\(member => seen\.has\(member\.id\)\)\.length : 0 \}\)/)
  const api = read('src/lib/announcements-api.ts')
  assert.match(api, /export const readStatsText = /)
  const page = read('src/app/announcements/page.tsx')
  assert.match(page, /data-announcement-read-stats=\{item\.id\}>\{item\.status === 'PUBLISHED' \? readStatsText\(item\.readStats\) : '—'\}/)
  assert.match(page, /\[\.\.\.report\.rows\]\.sort\(\(a, b\) => Number\(!!a\.readAt\) - Number\(!!b\.readAt\)\)/, 'اللي لسه ماقراش فوق')
  assert.match(page, /لسه ماقراش/)
})
