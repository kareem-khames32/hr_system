'use strict'
// B2.17 (ب): الجلسات النشطة — فحص من غير قاعدة (الدورة الفعلية في user-sessions.integration.cjs):
//  UT-01) اسم الجهاز من ترويسة المتصفح، والحدود والنصوص.
//  UT-02) الخادم: رقم الجلسة عشوائي وفي التوكن، وحارس الدخول بيتأكد منها قبل حكم CSRF، والقايمة بصاحبها وإصداره ومدتها، والإنهاء
//         بتحديث مشروط بصاحب الصف وبرد واحد، والخروج وتغيير كلمة المرور بينهوا من الخادم.
//  UT-03) الواجهة: صفحة «الأمان» ولينكها وعنوانها، وإنهاء الجلسة الحالية بيرجّع لصفحة الدخول.
// Run (من api/): node --test test/user-sessions.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const rules = require('../src/auth/user-sessions')
const root = path.resolve(__dirname, '..', '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n')

test('UT-01: a readable device name from the User-Agent header, and the limits', () => {
  const label = rules.deviceLabel
  assert.equal(label('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'), 'Chrome على Windows')
  assert.equal(label('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0'), 'Edge على Windows')
  assert.equal(label('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0'), 'Firefox على Windows')
  assert.equal(label('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15'), 'Safari على macOS')
  assert.equal(label('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'), 'Safari على iOS')
  assert.equal(label('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1'), 'Chrome على iOS')
  assert.equal(label('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'), 'Chrome على Android')
  assert.equal(label('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 OPR/112.0.0.0'), 'Opera على Linux')
  assert.equal(label('node'), 'جهاز غير معروف'); assert.equal(label('curl/8.4.0'), 'جهاز غير معروف')
  for (const empty of ['', '   ', null, undefined, 42, {}]) assert.equal(label(empty), 'جهاز غير معروف', String(empty))
  assert.doesNotMatch(label('<script>alert(1)</script> Chrome/1 Windows NT'), /[<>]/, 'الاسم من قايمة ثابتة — مش نص الترويسة')
  assert.deepEqual([rules.SESSION_TOUCH_MINUTES, rules.SESSION_KEEP_DAYS, rules.SESSION_NOT_FOUND], [5, 30, 'الجلسة غير موجودة'])
  assert.match(rules.USER_SESSIONS_MIGRATION_MISSING, /20261007_101/)
})

test('UT-02: the session number is random and rides in the token; the guard checks it before CSRF; ending is a conditional write by the row\'s owner', () => {
  const service = read('api/src/auth/user-sessions.service.ts')
  assert.match(service, /sid = crypto\.randomBytes\(24\)\.toString\('hex'\)/)
  assert.match(service, /if \(!\(await userSessionsReady\(this\.ds\.manager\)\)\) return null/, 'قبل الترحيل: الجلسة من غير رقم')
  // قايمة: صاحبها، مااتنهتش، مدتها لسه، وبإصدار الحساب الحالي
  // (الوقت بساعة التطبيق — باراميتر Date — زي ما الكيان بيكتب)
  assert.match(service, /WHERE s\.\[userId\] = @0 AND s\.\[revokedAt\] IS NULL AND s\.\[expiresAt\] > @1 AND s\.\[tokenVersion\] = u\.\[tokenVersion\]/)
  const list = service.slice(service.indexOf('async list('), service.indexOf('async end('))
  assert.doesNotMatch(list.slice(list.indexOf('items: rows.map')), /sid: |userAgent: /, 'الرد من غير رقم الجلسة ولا الترويسة الخام')
  // حارس الدخول: بالحرف، ولنفس الحساب، ومااتنهتش
  assert.match(service, /if \(!row \|\| row\.sid !== sid \|\| Number\(row\.userId\) !== userId \|\| row\.revokedAt\) return false/)
  // الإنهاء: تحديث واحد مشروط بصاحب الصف وبإنه لسه قايم، ورد واحد للباقي
  const end = service.slice(service.indexOf('async end('), service.indexOf('async endOthers('))
  assert.match(end, /UPDATE \[user_sessions\] SET \[revokedAt\] = @2, \[revokedReason\] = N'USER' OUTPUT INSERTED\.\[sid\]\s+WHERE \[id\] = @0 AND \[userId\] = @1 AND \[revokedAt\] IS NULL/)
  assert.match(end, /if \(!ended\.length\) throw new NotFoundException\(SESSION_NOT_FOUND\)/)
  assert.match(end, /category: 'LOGIN', action: 'SESSION_ENDED'/)
  assert.match(service, /WHERE \[userId\] = @0 AND \[revokedAt\] IS NULL AND \[sid\] <> @1`, \[user\.sub, user\.sid \?\? '', new Date\(\)\]/)

  const strategy = read('api/src/auth/jwt.strategy.ts')
  assert.match(strategy, /if \(payload\.sid && !\(await this\.sessions\.active\(payload\.sid, payload\.sub\)\)\) \{\s+throw new UnauthorizedException\(SESSION_ENDED_MESSAGE\)/)
  assert.ok(strategy.indexOf('this.sessions.active(') < strategy.indexOf('if (sessionViaCookie(req) && !csrfSafeMethod'), 'جلسة منتهية = 401 قبل حكم الرمز')

  const auth = read('api/src/auth/auth.service.ts')
  assert.match(auth, /const sid = await this\.sessions\.open\(user, context\)/)
  assert.match(auth, /\.\.\.\(sid \? \{ sid \} : \{\}\),/)
  // تغيير كلمة المرور: صفوف الحساب بتتقفل قبل الجلسة الجديدة
  const change = auth.slice(auth.indexOf('async changePassword('), auth.indexOf('private async issueSession('))
  assert.ok(change.indexOf("await this.sessions.revokeAll(user.id, 'PASSWORD')") > 0 && change.indexOf("await this.sessions.revokeAll(user.id, 'PASSWORD')") < change.indexOf('return this.issueSession('))
  // الخروج: التوكن بيتحقق منه الأول (توكن مزوّر مايعرفش ينهي جلسة حد)، وبعدها الجلسة بتتنهي بصاحبها
  const logout = auth.slice(auth.indexOf('async endSessionOfToken('), auth.indexOf('async findById('))
  assert.match(logout, /payload = await this\.jwt\.verifyAsync<JwtPayload>\(token\)[\s\S]{0,80}catch \{\s+return\s+\}/)
  assert.match(logout, /await this\.sessions\.revoke\(payload\.sid, payload\.sub, 'LOGOUT'\)/)
  const controller = read('api/src/auth/auth.controller.ts')
  assert.match(controller, /await this\.auth\.endSessionOfToken\(bearerTokenOf\(req\) \?\? cookie\)/)
  for (const route of ["@Get('sessions')", "@Post('sessions/end-others')", "@Delete('sessions/:id')"]) {
    const at = controller.indexOf(route)
    assert.ok(at > 0 && controller.slice(at - 120, at).includes('@UseGuards(JwtAuthGuard)'), route)
  }
  assert.match(controller, /if \(result\.current && sessionViaCookie\(req\)\) res\.setHeader\('Set-Cookie', clearedSessionCookieHeader\(sessionCookieOptions\(\)\)\)/)
  const { EXCEPTIONS } = require('./fixtures/routes-without-perm.cjs')
  assert.deepEqual(['mySessions', 'endSession', 'endOtherSessions'].map(name => EXCEPTIONS[`AuthController.${name}`]), ['SELF', 'SELF', 'SELF'])
})

test('UT-03: the security screen — my sessions, ending one, and its link and title', () => {
  const page = read('src/app/profile/security/page.tsx'), lib = read('src/lib/security-api.ts')
  for (const [name, route] of [['fetchMySessions', "'/auth/sessions'"], ['endMySession', "`/auth/sessions/${id}`, { method: 'DELETE' }"], ['endOtherSessions', "'/auth/sessions/end-others', { method: 'POST' }"]]) {
    assert.ok(lib.includes(`export const ${name} = `) && lib.includes(route), name)
  }
  assert.match(page, /if \(result\.current\) \{\s+clearSession\(\)\s+window\.location\.href = '\/login'\s+\}/, 'إنهاء الجلسة الحالية = خروج')
  assert.match(page, /if \(!confirmOthers\) return setConfirmOthers\(true\)/, 'إنهاء الباقي بتأكيد')
  assert.match(page, /\{sessions && !sessions\.available && <p[^>]*>\{sessions\.message\}<\/p>\}/, 'قبل الترحيل: رسالة الخادم')
  assert.match(page, /\{item\.current && <span[^>]*>الجلسة دي<\/span>\}/)
  assert.match(page, /data-my-sessions/)
  assert.match(read('src/components/layout/Sidebar.tsx'), /<Link href="\/profile\/security" title="الأمان والجلسات" aria-label="الأمان والجلسات"/)
  const titles = read('src/components/layout/pageTitles.ts')
  assert.ok(titles.indexOf("['/profile/security', 'الأمان']") > 0 && titles.indexOf("['/profile/security', 'الأمان']") < titles.indexOf("['/profile', 'ملفي الشخصي']"), 'المسار الأطول قبل الأقصر')
})
