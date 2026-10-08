'use strict'
// B2.17 (ج): التحقق بتطبيق مصادقة (TOTP) — فحص من غير قاعدة (الدورة الفعلية في totp.integration.cjs):
//  TT-01) المعيار: متجهات RFC 6238، وbase32، ونافذة الساعة، والرمز مرة واحدة، ورابط التطبيق.
//  TT-02) تشفير السر: بيتفك بسر الخادم بس، وأي تغيير فيه بيتكشف.
//  TT-03) الخادم: الحساب المفعّل خطوته رمز التطبيق قبل بوابة البريد، والحكم تحت قفل صف الحساب، والبوابة على الجلسة، وساعة التطبيق.
//  TT-04) الواجهة: خطوة الرمز، وشاشة «فعّل الأول»، وكارت الأمان، وإعداد الأدوار، وإعادة الضبط.
// Run (من api/): node --test test/totp.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const rules = require('../src/auth/totp')
const root = path.resolve(__dirname, '..', '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n')

test('TT-01: the RFC 6238 vectors, base32, the clock window, a code only once, and the app link', () => {
  // متجهات RFC 6238 (SHA-1، السر «12345678901234567890») — آخر 6 أرقام من رمز الـ8
  const seed = Buffer.from('12345678901234567890')
  for (const [seconds, code] of [[59, '287082'], [1111111109, '081804'], [1111111111, '050471'], [1234567890, '005924'], [2000000000, '279037'], [20000000000, '353130']]) {
    assert.equal(rules.totpCode(seed, rules.totpStepAt(seconds * 1000)), code, String(seconds))
  }
  assert.deepEqual([rules.TOTP_DIGITS, rules.TOTP_STEP_SECONDS, rules.TOTP_WINDOW_STEPS, rules.TOTP_SECRET_BYTES], [6, 30, 1, 20])
  // base32: متجهات RFC 4648، ورجوع البايتات زي ما هي، والمدخل بمسافات وحروف صغيرة مقبول
  for (const [text, encoded] of [['f', 'MY'], ['fo', 'MZXQ'], ['foo', 'MZXW6'], ['foob', 'MZXW6YQ'], ['fooba', 'MZXW6YTB'], ['foobar', 'MZXW6YTBOI']]) {
    assert.equal(rules.base32Encode(Buffer.from(text)), encoded); assert.equal(rules.base32Decode(encoded).toString(), text)
  }
  const bytes = crypto.randomBytes(20)
  assert.ok(rules.base32Decode(rules.base32Encode(bytes)).equals(bytes))
  assert.ok(rules.base32Decode('mzxw 6ytb-oi==').equals(Buffer.from('foobar')))
  for (const bad of ['', '   ', 'MZXW6YT1', 'MZXW6YT!', null, undefined, 42]) assert.equal(rules.base32Decode(bad), null, String(bad))
  // السر: 20 بايت عشوائي = 32 حرف، ومجموعات للعرض
  const secret = rules.newTotpSecret()
  assert.match(secret, /^[A-Z2-7]{32}$/); assert.notEqual(secret, rules.newTotpSecret())
  assert.equal(rules.groupedSecret('ABCDEFGHIJKL'), 'ABCD EFGH IJKL'); assert.equal(rules.groupedSecret(secret).replace(/ /g, ''), secret)

  // النافذة: الخطوة الحالية واللي قبلها واللي بعدها بس
  const now = 1_800_000_000_000, step = rules.totpStepAt(now), key = rules.base32Decode(secret)
  const at = offset => rules.totpCode(key, step + offset)
  assert.deepEqual([-2, -1, 0, 1, 2].map(offset => rules.matchTotp(secret, at(offset), now)), [null, step - 1, step, step + 1, null])
  // مرة واحدة: رمز خطوة اتقبلت (أو قبلها) مايتقبلش تاني، واللي بعدها يتقبل
  assert.deepEqual([rules.matchTotp(secret, at(0), now, step), rules.matchTotp(secret, at(-1), now, step), rules.matchTotp(secret, at(1), now, step), rules.matchTotp(secret, at(0), now, step - 1)],
    [null, null, step + 1, step])
  // السر بمجموعاته (زي ما بيتعرض) بيتقبل؛ ورمز بصيغة غلط أو سر تالف = لأ
  assert.equal(rules.matchTotp(rules.groupedSecret(secret), at(0), now), step)
  assert.equal(rules.matchTotp(secret, ` ${at(0).slice(0, 3)} ${at(0).slice(3)} `, now), step)
  for (const bad of ['', '12345', '1234567', 'abcdef', null, undefined, 123456, at(0) + '0']) assert.equal(rules.matchTotp(secret, bad, now), null, String(bad))
  assert.equal(rules.matchTotp('not base32!', at(0), now), null)
  // رمز سر تاني مابيعدّيش
  assert.equal(rules.matchTotp(rules.newTotpSecret(), at(0), now), null)
  // رابط التطبيق: المعيار بالحرف، والاسم والبريد مرمّزين
  assert.equal(rules.otpauthUrl('Logic Leap HR', 'a+b@x.test', 'ABCD'), 'otpauth://totp/Logic%20Leap%20HR:a%2Bb%40x.test?secret=ABCD&issuer=Logic%20Leap%20HR&algorithm=SHA1&digits=6&period=30')
  assert.deepEqual(rules.totpRolesOf(' super_admin, payroll_officer ,Bad Role,,super_admin'), ['super_admin', 'payroll_officer'])
  assert.deepEqual([rules.TOTP_ROLES_KEY, rules.TOTP_SETUP_REQUIRED, rules.TOTP_CHALLENGE_MARK], ['auth.totp.roles', 'TOTP_SETUP_REQUIRED', 'totp'])
  assert.match(rules.TOTP_MIGRATION_MISSING, /20261007_102/)
})

test('TT-02: the stored secret opens only with the server secret, and any change to it is caught', () => {
  const server = crypto.randomBytes(48).toString('hex'), secret = rules.newTotpSecret()
  const sealed = rules.sealTotpSecret(secret, server)
  assert.match(sealed, /^v1\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/)
  assert.equal(sealed.includes(secret), false, 'السر مش ظاهر في النص المخزّن')
  assert.ok(sealed.length <= 200, 'جوه طول العمود')
  assert.equal(rules.openTotpSecret(sealed, server), secret)
  assert.notEqual(rules.sealTotpSecret(secret, server), sealed, 'تشفير كل مرة بقيمة بداية جديدة')
  // سر خادم تاني، أو نص اتغيّر فيه حرف، أو صيغة تانية = مابيتفكّش
  assert.equal(rules.openTotpSecret(sealed, crypto.randomBytes(48).toString('hex')), null)
  const parts = sealed.split('.')
  const flip = text => (text[0] === 'A' ? 'B' : 'A') + text.slice(1)
  for (const tampered of [[parts[0], flip(parts[1]), parts[2], parts[3]].join('.'), [parts[0], parts[1], flip(parts[2]), parts[3]].join('.'), [parts[0], parts[1], parts[2], flip(parts[3])].join('.'),
    ['v2', parts[1], parts[2], parts[3]].join('.'), parts.slice(0, 3).join('.'), secret, '', null, undefined, 7]) assert.equal(rules.openTotpSecret(tampered, server), null, String(tampered).slice(0, 20))
})

test('TT-03: an enrolled account is asked for the app code before the mail gate; the code is judged under the account row lock; the session gate; the application clock', () => {
  const auth = read('api/src/auth/auth.service.ts')
  const finish = auth.slice(auth.indexOf('private async finishLogin'), auth.indexOf('private httpFor'))
  // الترتيب: الحساب المفعّل → حالة رمز التطبيق (قبل قراءة بوابة البريد، ومن غير جلسة)
  const order = ['if (await this.totp.enrolled(user.id)) {', 'const challenge = await this.twoFactor.openTotp(user, method)', 'const gate = await this.twoFactor.gate(user)',
    'const opened = await this.issueSession(user, session, context)'].map(part => finish.indexOf(part))
  assert.ok(order.every((at, index) => at > 0 && (index === 0 || at > order[index - 1])), JSON.stringify(order))
  assert.match(auth, /this\.twoFactor\.verify\(challengeToken, code, \(userId, value\) => this\.totp\.verifyLogin\(userId, value\),\n\s+\(userId\) => this\.totp\.enrolled\(userId\)\)/)
  // CRP3D-B17-02: حالة رمزها بريد لحساب فعّل التطبيق بعدها — بتبطل مع التفعيل، وبتتحكم وقت التحقق وقبل فتح الجلسة
  assert.match(auth, /if \(challenge\.codeHash !== TOTP_CHALLENGE_MARK && \(await this\.totp\.enrolled\(user\.id\)\)\) throw new UnauthorizedException\(TOTP_FACTOR_CHANGED\)/)
  const factor = read('api/src/auth/two-factor.service.ts')
  assert.match(factor, /if \(totpEnrolled && \(await totpEnrolled\(row\.userId\)\)\) \{\n\s+await this\.challenges\.update\(\{ id: row\.id, consumedAt: IsNull\(\), lockedAt: IsNull\(\) \}, \{ lockedAt: new Date\(\) \}\)\n\s+throw new TwoFactorError\('SUPERSEDED', TOTP_FACTOR_CHANGED\)/)
  const totpService = read('api/src/auth/totp.service.ts')
  assert.match(totpService, /UPDATE \[login_challenges\] SET \[lockedAt\] = @1 WHERE \[userId\] = @0 AND \[consumedAt\] IS NULL AND \[lockedAt\] IS NULL AND \[codeHash\] <> @2/)
  // CRP3D-B17-01: إعادة الضبط بحدود تغيير كلمة المرور، والصف بيتقفل ويتقارن وقت التنفيذ
  const resetRoute = read('api/src/auth/users.controller.ts')
  assert.match(resetRoute, /assertManageableScope\(actor, target\)\n\s+const beyond = await this\.takeoverBeyond\(actor, target\)\n\s+if \(beyond\) throw new ForbiddenException\([^\n]+\n\s+return \{ id: target\.id, reset: await this\.totp\.adminReset\(actor, target\) \}/)
  assert.match(totpService, /FROM \[users\] WITH \(UPDLOCK, ROWLOCK\) WHERE \[id\] = @0', \[target\.id\]\)\n\s+if \(!fresh \|\| accountStamp\(fresh\) !== accountStamp\(target\)\) throw new ConflictException\(TOTP_RESET_ACCOUNT_CHANGED\)/)
  // CRP3E: المقارنة بإصدار الحساب كمان (حزمة الدور والمنح الفردية بيحرّكوه)، وجلسة رمز البريد بتتحكم بعد فتح صفها
  assert.match(totpService, /\[branchId\], \[tokenVersion\] FROM \[users\] WITH \(UPDLOCK, ROWLOCK\)/)
  assert.match(totpService, /row\.branchId \?\? null, Number\(row\.tokenVersion \?\? 0\)\]\)/)
  assert.match(auth, /const opened = await this\.issueSession\(user, \{ \.\.\.session, factorProven: challenge\.codeHash === TOTP_CHALLENGE_MARK \}, context\)/)
  // CRP3F: كل جلسة جديدة لحساب مفعّل محتاجة إثبات العامل — كلمة السر لوحدها من غيره، وتغيير كلمة المرور وإعادة الإصدار من جلسة قايمة بيه
  assert.equal(auth.split('factorProven: true').length - 1, 2, 'تغيير كلمة المرور وإعادة الإصدار بعد التفعيل بس')
  // CRP3G-B01: الجلسة من صف الحساب المقري من جديد بعد الكتابة (مش الصف القديم بإصدار جديد)
  assert.match(auth, /await this\.sessions\.revokeAll\(user\.id, 'PASSWORD'\)\n[\s\S]{0,420}const current = await this\.withPasswordState\(\)\.where\('u\.id = :id', \{ id: user\.id \}\)\.getOne\(\)\n\s+if \(!current \|\| !current\.isActive\) throw new UnauthorizedException\('الحساب معطّل'\)\n\s+return this\.issueSession\(current, \{ \.\.\.session, factorProven: true \}, context\)/)
  assert.doesNotMatch(auth, /issueSession\(\{ \.\.\.user,/, 'مفيش جلسة من صف قديم بخانات متركّبة')
  assert.match(auth, /if \(current\.sid\) await this\.sessions\.revoke\(current\.sid, current\.sub, 'LOGOUT'\)\n\s+return this\.issueSession\(user, \{ \.\.\.session, factorProven: true \}, context\)/)
  assert.match(auth, /tokenVersion: \(\) => 'tokenVersion \+ 1',\n\s+\}\n\s+\)\n/, 'تغيير كلمة المرور بيزوّد الإصدار في القاعدة')
  // CRP3G-B02: الدور المقترح بيتقري قبل الحكم، وصفه بيتقفل ويتقارن قبل صف الحساب جوه معاملة الحفظ — في التعديل والإنشاء
  const assign = read('api/src/auth/users.controller.ts')
  assert.match(assign, /const judgedRole = roleChanged \? await this\.roleStamp\(dto\.role as string\) : null\n\s+if \(roleChanged\) await this\.assertAssignableRole\(dto\.role as string\)/)
  // CRP3I: الترتيب في التعديل — صف الدور، ثم حجز الموظف الجديد، ثم صف الحساب
  assert.match(assign, /if \(judgedRole !== null && \(await this\.roleStamp\(dto\.role as string, em\)\) !== judgedRole\) throw new ConflictException\(ASSIGNED_ROLE_CHANGED\)\n\s+\/\/[^\n]*\n\s+if \(judgedEmployee\) await this\.holdLinkableEmployee\(em, judgedEmployee, id\)\n\s+const fresh = await em\.getRepository\(User\)\.findOne\(\{ where: \{ id \}, lock: \{ mode: 'pessimistic_write' \} \}\)/)
  assert.match(assign, /const judgedRole = await this\.roleStamp\(dto\.role\)\n\s+await this\.assertAssignableRole\(dto\.role\)/)
  // CRP3I: وفي الإنشاء — صف الدور، ثم حجز الموظف المربوط، ثم الإدراج
  assert.match(assign, /if \(\(await this\.roleStamp\(dto\.role, em\)\) !== judgedRole\) throw new ConflictException\(ASSIGNED_ROLE_CHANGED\)\n\s+\/\/[^\n]*\n\s+if \(employee\) await this\.holdLinkableEmployee\(em, employee\)\n\s+return em\.getRepository\(User\)\.save\(/)
  // CRP3I (P3I-B01): إنشاء حساب المجال تحت حجز الموظف، والحكم بيتعاد تحته قبل الإدراج؛ والدخول بيعيد الحكم مرة واحدة
  const slot = read('api/src/auth/employee-account-slot.ts'), domainLogin = read('api/src/auth/domain-login.service.ts')
  assert.match(slot, /findOne\(\{ where: \{ id: employeeId \}, lock: \{ mode: 'pessimistic_write' \} \}\)\n\s+const accounts = employee \? await em\.getRepository\(User\)\.find\(\{ where: \{ employeeId \}/)
  assert.match(domainLogin, /const slot = await lockEmployeeAccountSlot\(em, employee\.id\)\n\s+if \(!slot\.employee\) throw new UnauthorizedException\(REFUSALS\.noMatch\)\n\s+this\.assertEmployeeRowOpen\(slot\.employee\)\n\s+if \(slot\.accounts\.length > 0\) throw new DomainAccountChangedError\(\)\n[^\n]*domainObjectGuid: directory\.objectGuid[^\n]*throw new DomainAccountChangedError\(\)\n\s+return em\.getRepository\(User\)\.save\(/)
  assert.match(domainLogin, /if \(!\(error instanceof DomainAccountChangedError\)\) throw error\n\s+return this\.resolveOnce\(directory\)/)
  assert.doesNotMatch(domainLogin, /this\.users\.save\(/, 'مفيش إدراج حساب برّه معاملة الحجز')
  assert.match(assign, /\.where\('id = :id AND tokenVersion = :seen', \{ id: target\.id, seen: target\.tokenVersion \?\? 0 \}\)/, 'كلمة السر المؤقتة بشرط الإصدار اللي اتحكم عليه')
  // CRP3F: تعديل الحساب وتعديل الدور بيقفلوا الصف ويقروه من جديد جوه معاملة الحفظ ويرفضوا لو اتغيّر بعد الحكم
  const accountEdit = read('api/src/auth/users.controller.ts')
  assert.match(accountEdit, /const fresh = await em\.getRepository\(User\)\.findOne\(\{ where: \{ id \}, lock: \{ mode: 'pessimistic_write' \} \}\)\n\s+if \(!fresh \|\| \(fresh\.tokenVersion \?\? 0\) !== seenVersion\) throw new ConflictException\(ACCOUNT_CHANGED_MEANWHILE\)/)
  assert.match(accountEdit, /for \(const key of changed\) Object\.assign\(fresh, \{ \[key\]: user\[key\] \}\)\n\s+return changed\.length \? em\.getRepository\(User\)\.save\(fresh\) : fresh/)
  assert.doesNotMatch(accountEdit, /await this\.users\.save\(user\)/, 'مفيش حفظ لكيان مقري من غير قفل')
  const roleEdit = read('api/src/auth/roles.controller.ts')
  assert.match(roleEdit, /const fresh = await em\.getRepository\(Role\)\.findOne\(\{ where: \{ id: role\.id \}, lock: \{ mode: 'pessimistic_write' \} \}\)\n\s+if \(!fresh \|\| fresh\.permissions !== seenPermissions \|\| fresh\.isActive !== wasActive\) throw new ConflictException\(ROLE_CHANGED_MEANWHILE\)/)
  assert.doesNotMatch(roleEdit, /em\.getRepository\(Role\)\.save\(role\)/, 'مفيش حفظ لدور مقري من غير قفل')
  assert.match(auth, /const sid = await this\.sessions\.open\(user, context\)[\s\S]{0,400}const totp = await this\.totp\.loginState\(user\)[\s\S]{0,900}if \(totp\.enrolled && !session\.factorProven\) \{\n\s+if \(sid\) await this\.sessions\.revoke\(sid, user\.id, 'LOGOUT'\)\n\s+throw new UnauthorizedException\(TOTP_FACTOR_CHANGED\)/)
  // علامة «فعّل الأول» من مكان واحد: كل جلسة بتتفتح بتتحكم بحالة الحساب وقتها
  const issue = auth.slice(auth.indexOf('private async issueSession('), auth.indexOf('async reissueSession('))
  assert.match(issue, /const totp = await this\.totp\.loginState\(user\)\n[\s\S]{0,700}\n\s+const totpSetupRequired = totp\.required && !totp\.enrolled/)
  assert.match(issue, /\.\.\.\(totpSetupRequired \? \{ totpSetupRequired: true \} : \{\}\),/)

  const twoFactor = read('api/src/auth/two-factor.service.ts')
  // حالة رمز التطبيق: نفس الجدول والمدة والعدّاد والاستهلاك — من غير بريد، ومن غير حَكَم مابتتقبلش
  const open = twoFactor.slice(twoFactor.indexOf('async openTotp('), twoFactor.indexOf('async verify('))
  assert.match(open, /codeHash: TOTP_CHALLENGE_MARK, method, sentTo: TOTP_CHALLENGE_SENT_TO/)
  assert.doesNotMatch(open, /this\.mail\.send/)
  assert.match(twoFactor, /ok = clean\.length === OTP\.codeLength && !!checkTotp && \(await checkTotp\(row\.userId, clean\)\)/)
  assert.match(twoFactor, /if \(row\.codeHash === TOTP_CHALLENGE_MARK\) throw new TwoFactorError\('RESEND_LIMIT'/)

  const service = read('api/src/auth/totp.service.ts')
  // الحكم تحت قفل صف الحساب (رمزين في نفس اللحظة واحد بس بيتقبل)، ونتيجة الرمز الغلط بتتثبّت (الرفض بعد المعاملة مش جوّاها)
  assert.match(service, /FROM \[user_totp\]\$\{lock \? ' WITH \(UPDLOCK, HOLDLOCK, ROWLOCK\)' : ''\} WHERE \[userId\] = @0/)
  for (const method of ['async confirm(', 'async verifyLogin(', 'async disable(', 'async adminReset(']) {
    const body = service.slice(service.indexOf(method), service.indexOf('\n  }\n', service.indexOf(method)))
    assert.match(body, /await this\.rowOf\(em, [a-zA-Z.]+, true\)/, method)
  }
  const confirm = service.slice(service.indexOf('async confirm('), service.indexOf('async verifyLogin('))
  assert.match(confirm, /if \(!ok\) return 'WRONG' as const/); assert.match(confirm, /if \(outcome === 'WRONG'\) throw new BadRequestException\(TOTP_WRONG_CODE\)/)
  // «مفعّل؟» في أول الدخول من جدول الأسرار بس: فشل قراءة إعداد التحقق بخطوتين بيفضل 503 برسالته (مش خطأ إعداد تاني قبله)
  const enrolled = service.slice(service.indexOf('async enrolled('), service.indexOf('async loginState('))
  assert.doesNotMatch(enrolled, /requiredRoles|RequestsConfig/)
  // قبل الترحيل: الإلزام واقف (محدش بيتقفل برّه)
  assert.match(service, /if \(!\(await totpReady\(em\)\)\) return \{ enrolled: false, required: false \}/)
  // السر مابيرجعش غير من «ابدأ التفعيل»
  assert.equal(service.split('groupedSecret(secret)').length - 1, 1)
  // ساعة التطبيق في كل وقت بيتكتب أو بيتقارن (مش ساعة القاعدة): الجلسات وتطبيق المصادقة وقراءة الإعلان
  for (const file of ['api/src/auth/totp.service.ts', 'api/src/auth/user-sessions.service.ts', 'api/src/announcements/announcements.service.ts']) {
    assert.doesNotMatch(read(file).replace(/\/\/[^\n]*/g, ''), /SYSUTCDATETIME|SYSDATETIME|GETDATE|GETUTCDATE/, file)
  }

  // البوابة على الجلسة، والمسارات المفتوحة ليها
  const guards = read('api/src/auth/guards.ts')
  assert.match(guards, /\(payload as JwtPayload \| undefined\)\?\.totpSetupRequired &&\s+!Reflect\.getMetadata\(ALLOW_PENDING_TOTP_KEY, context\.getHandler\(\)\) &&\s+!Reflect\.getMetadata\(ALLOW_PENDING_TOTP_KEY, context\.getClass\(\)\)/)
  assert.match(guards, /throw new ForbiddenException\(\{ statusCode: 403, code: TOTP_SETUP_REQUIRED, message: TOTP_SETUP_MESSAGE \}\)/)
  const controller = read('api/src/auth/auth.controller.ts')
  assert.equal(controller.split('@AllowPendingTotpSetup()').length - 1, 6, '«مين أنا»، بيانات الجلسة، تغيير كلمة المرور، والحالة والتفعيل والتأكيد')
  const disable = controller.slice(controller.indexOf("@Post('totp/disable')") - 120, controller.indexOf("@Post('totp/disable')"))
  assert.doesNotMatch(disable, /AllowPendingTotpSetup/, 'الإلغاء مش من جلسة «فعّل الأول»')
  assert.match(controller, /await this\.totp\.confirm\(user, dto\.code\)\s+const cookie = sessionViaCookie\(req\)[\s\S]{0,260}return this\.deliver\(res, await this\.auth\.reissueSession\(user, \{ cookie \}, context\), cookie, dto\.remember === true\)/)
  // إعادة الضبط من المدير: بنطاق فروعه، ومدير النظام لمدير نظام بس، وصاحب الحساب من «الأمان»
  const users = read('api/src/auth/users.controller.ts')
  const reset = users.slice(users.indexOf("@Post(':id/totp-reset')"), users.indexOf("@Post(':id/totp-reset')") + 900)
  for (const part of ["if (!target || !inBranchScope(branchScopeOf(actor), target.branchId)) throw new NotFoundException('المستخدم غير موجود')", 'if (target.id === actor.sub) throw new BadRequestException(',
    "if (target.role === 'super_admin' && actor.role !== 'super_admin') throw new ForbiddenException("]) assert.ok(reset.includes(part), part)
  // حراسة الإعداد والبذرة: نفس صيغة أدوار التحقق بخطوتين
  const security = require('../src/auth/login-security')
  assert.equal(security.loginSecurityConfigError('auth.totp.roles', 'super_admin,payroll_officer'), null)
  assert.equal(security.loginSecurityConfigError('auth.totp.roles', ''), null)
  for (const bad of ['Super Admin', 'a,,b c', 'x,x']) assert.equal(typeof security.loginSecurityConfigError('auth.totp.roles', bad), 'string', bad)
  assert.match(read('api/src/seed/requests-seed.data.ts'), /\{ key: 'auth\.totp\.roles', value: '' \},/)
  assert.ok(fs.existsSync(path.join(root, 'api/scripts/totp-reset.cjs')))
})

test('TT-04: the login step for the app code, the «turn it on first» screen, the security card, the roles setting and the reset action', () => {
  const login = read('src/app/login/page.tsx'), client = read('src/lib/api.ts'), lib = read('src/lib/security-api.ts')
  assert.match(login, /\{challenge\.kind === 'TOTP' \? \(/); assert.match(login, /data-login-totp/)
  assert.match(login, /\{challenge\.kind !== 'TOTP' && \(\s+<button\s+type="button"\s+onClick=\{handleResend\}/, 'من غير «ابعت رمز جديد» لرمز التطبيق')
  assert.match(login, /user\.mustChangePassword \? CHANGE_PASSWORD_PATH : user\.totpSetupRequired \? TOTP_SETUP_PATH : '\/'/)
  assert.match(client, /export const TOTP_SETUP_PATH = '\/login\/totp'/)
  assert.match(client, /details\?\.code === 'TOTP_SETUP_REQUIRED' &&\s+typeof window !== 'undefined' &&\s+!window\.location\.pathname\.startsWith\('\/login'\)\s+\) \{\s+window\.location\.href = TOTP_SETUP_PATH/)
  assert.match(read('src/components/layout/MainLayout.tsx'), /if \(getCurrentUser\(\)\?\.totpSetupRequired\) \{\s+window\.location\.href = TOTP_SETUP_PATH/)
  assert.match(read('src/lib/modules.ts'), /!user\.mustChangePassword && !user\.totpSetupRequired/)
  const gate = read('src/app/login/totp/page.tsx'), setup = read('src/components/security/TotpSetup.tsx')
  assert.match(gate, /if \(!user\?\.totpSetupRequired\) \{\s+window\.location\.href = '\/'/)
  assert.match(gate, /<TotpSetup onEnabled=\{\(\) => \{ window\.location\.href = '\/' \}\} \/>/)
  // التأكيد بيحفظ الجلسة الجديدة (من غير علامة «فعّل الأول») ورمز CSRF بتاعها
  assert.match(setup, /const session = await confirmTotpSetup\(code, remembered\)\s+saveSession\(session\.user, remembered, session\.csrfToken\)/)
  assert.match(setup, /data-totp-secret/); assert.match(setup, /href=\{setup\.otpauthUrl\}/)
  assert.doesNotMatch(setup + gate, /localStorage|sessionStorage/, 'السر مابيتحفظش في المتصفح')
  for (const [name, route] of [['fetchTotpStatus', "'/auth/totp'"], ['beginTotpSetup', "'/auth/totp/setup', { method: 'POST' }"], ['confirmTotpSetup', "'/auth/totp/confirm'"], ['disableTotp', "'/auth/totp/disable'"]]) {
    assert.ok(lib.includes(`export const ${name} = `) && lib.includes(route), name)
  }
  const page = read('src/app/profile/security/page.tsx')
  assert.match(page, /data-my-totp/); assert.match(page, /\{totp\.required \? \(/); assert.match(page, /<TotpSetup onEnabled=\{\(\) => void loadTotp\(\)\} \/>/)
  assert.match(read('src/app/settings/policies/page.tsx'), /\{ key: 'auth\.totp\.roles', label: 'تطبيق المصادقة إلزامي لأدوار', type: 'text'/)
  const users = read('src/app/settings/users/page.tsx')
  assert.match(users, /\{user\.totpEnabled && \(/); assert.match(users, /await resetUserTotp\(user\.id\)/)
  assert.match(client, /export const resetUserTotp = \(id: number\) => post<\{ id: number; reset: boolean \}>\(`\/users\/\$\{id\}\/totp-reset`, \{\}\)/)
})
