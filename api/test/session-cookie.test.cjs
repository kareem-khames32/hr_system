'use strict'
// B2.17 (أ): الجلسة في cookie ورمز CSRF — فحص من غير قاعدة (الدورة الفعلية في session-cookie.integration.cjs):
//  SK-01) القواعد: خصائص الـcookie من البيئة، واسمها، وقيمة Set-Cookie، وقراءتها من الترويسة، وحكم رمز CSRF.
//  SK-02) الخادم: ترويسة Bearer بتسبق الـcookie بنفس القارئ في القراءة والحكم، والرمز بعد فحوص الحساب، والتسليم والخروج.
//  SK-03) الواجهة: ولا توكن في تخزين المتصفح ولا ترويسة Authorization، وكل نداء بالجلسة ورمز CSRF لطلبات الكتابة.
// Run (من api/): node --test test/session-cookie.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const rules = require('../src/auth/session-cookie')
const root = path.resolve(__dirname, '..', '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n')
const walk = dir => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory() ? walk(`${dir}/${entry.name}`) : /\.(ts|tsx)$/.test(entry.name) ? [`${dir}/${entry.name}`] : [])

test('SK-01: cookie attributes from the environment, its name, the Set-Cookie value, reading it, and the CSRF verdict', () => {
  const options = rules.sessionCookieOptions
  // الافتراضي: Strict، وSecure لما عنوان الواجهة https بس
  assert.deepEqual(options({}), { sameSite: 'Strict', secure: false })
  assert.deepEqual(options({ FRONTEND_URL: 'http://10.0.0.5:3000' }), { sameSite: 'Strict', secure: false })
  assert.deepEqual(options({ FRONTEND_URL: ' HTTPS://hr.example.com ' }), { sameSite: 'Strict', secure: true })
  assert.deepEqual(options({ FRONTEND_URL: 'http://x', SESSION_COOKIE_SECURE: 'true' }), { sameSite: 'Strict', secure: true })
  assert.deepEqual(options({ FRONTEND_URL: 'https://x', SESSION_COOKIE_SECURE: 'false' }), { sameSite: 'Strict', secure: false })
  assert.deepEqual(options({ SESSION_COOKIE_SAMESITE: ' LAX ' }), { sameSite: 'Lax', secure: false })
  // None دايمًا مع Secure (المتصفح بيرفضها من غيره) حتى لو اتقفلت صريح؛ وقيمة مش معروفة = Strict
  assert.deepEqual(options({ SESSION_COOKIE_SAMESITE: 'none', SESSION_COOKIE_SECURE: 'false' }), { sameSite: 'None', secure: true })
  assert.deepEqual(options({ SESSION_COOKIE_SAMESITE: 'off' }), { sameSite: 'Strict', secure: false })
  // الاسم: بالبادئة __Host- على HTTPS بس
  assert.deepEqual([rules.sessionCookieName({ sameSite: 'Strict', secure: false }), rules.sessionCookieName({ sameSite: 'Strict', secure: true })], ['hr_session', '__Host-hr_session'])
  const plain = { sameSite: 'Strict', secure: false }, secure = { sameSite: 'Lax', secure: true }
  assert.equal(rules.sessionCookieHeader('tok', plain, null), 'hr_session=tok; Path=/; HttpOnly; SameSite=Strict')
  assert.equal(rules.sessionCookieHeader('tok', secure, 28800.9), '__Host-hr_session=tok; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=28800')
  assert.equal(rules.sessionCookieHeader('tok', plain, -5), 'hr_session=tok; Path=/; HttpOnly; SameSite=Strict; Max-Age=0')
  assert.equal(rules.clearedSessionCookieHeader(plain), 'hr_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0')
  for (const header of [rules.sessionCookieHeader('t', plain, null), rules.sessionCookieHeader('t', secure, 60), rules.clearedSessionCookieHeader(secure)]) {
    assert.match(header, /; HttpOnly(;|$)/); assert.doesNotMatch(header, /Domain=/i, 'من غير Domain: للخادم نفسه بس')
  }
  // القراءة: بالاسم بالحرف، وأول قيمة باسمه، والفاضي = مفيش
  const cookie = rules.readCookie
  assert.equal(cookie('a=1; hr_session=abc.def.ghi; b=2', 'hr_session'), 'abc.def.ghi')
  assert.equal(cookie('hr_session=first; hr_session=second', 'hr_session'), 'first')
  assert.equal(cookie('hr_session=a=b=c', 'hr_session'), 'a=b=c')
  for (const [header, name] of [['hr_session_old=x', 'hr_session'], ['xhr_session=x', 'hr_session'], ['HR_SESSION=x', 'hr_session'], ['hr_session=', 'hr_session'], ['hr_session', 'hr_session'],
    ['', 'hr_session'], [undefined, 'hr_session'], [['hr_session=x'], 'hr_session'], ['hr_session=x', '__Host-hr_session']]) assert.equal(cookie(header, name), null, `${header} → ${name}`)
  assert.equal(rules.sessionCookieOf({ headers: { cookie: 'hr_session=t; __Host-hr_session=s' } }, plain), 't')
  assert.equal(rules.sessionCookieOf({ headers: { cookie: 'hr_session=t; __Host-hr_session=s' } }, secure), 's')
  assert.equal(rules.sessionCookieOf({ headers: {} }, plain), null); assert.equal(rules.sessionCookieOf({}, plain), null)
  // الطرق الآمنة من غير رمز
  assert.deepEqual(['GET', 'get', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE', '', undefined].map(rules.csrfSafeMethod), [true, true, true, true, false, false, false, false, false, false])
  // الرمز: 48 حرف hex عشوائي، والمطابقة بالحرف وبنفس الطول؛ جلسة من غير رمز أو ترويسة مكررة (قايمة) = لأ
  const token = rules.newCsrfToken()
  assert.match(token, /^[0-9a-f]{48}$/); assert.notEqual(token, rules.newCsrfToken())
  assert.equal(rules.csrfMatches(token, token), true)
  for (const [expected, presented] of [[token, token.toUpperCase()], [token, token.slice(1)], [token, `${token}0`], [token, ''], [token, undefined], [token, [token]], [undefined, undefined],
    ['', ''], [undefined, token], [null, 'null']]) assert.equal(rules.csrfMatches(expected, presented), false, `${expected} / ${presented}`)
  assert.deepEqual([rules.CSRF_HEADER, rules.CSRF_TOKEN_INVALID], ['x-csrf-token', 'CSRF_TOKEN_INVALID'])
})

test('SK-02: the server reads Bearer first with one reader for both the token and the verdict, checks CSRF after the account, and hands the cookie over', () => {
  const strategy = read('api/src/auth/jwt.strategy.ts')
  assert.match(strategy, /const bearerFromHeader = ExtractJwt\.fromAuthHeaderAsBearerToken\(\)/)
  assert.match(strategy, /jwtFromRequest: \(req: SessionRequest\) => bearerFromHeader\(req as never\) \?\? sessionCookieOf\(req\)/)
  assert.match(strategy, /export const sessionViaCookie = \(req: SessionRequest\): boolean => bearerFromHeader\(req as never\) === null && sessionCookieOf\(req\) !== null/)
  assert.match(strategy, /passReqToCallback: true/)
  assert.match(strategy, /if \(sessionViaCookie\(req\) && !csrfSafeMethod\(req\.method\) && !csrfMatches\(payload\.csrf, req\.headers\[CSRF_HEADER\]\)\) \{\s+throw new ForbiddenException\(\{ statusCode: 403, code: CSRF_TOKEN_INVALID, message: CSRF_MESSAGE \}\)/)
  // الترتيب: الحساب والإصدار والنطاق الأول (جلسة باطلة = 401)، وبعدهم الرمز
  const order = ["throw new UnauthorizedException('الحساب معطّل')", '(user.tokenVersion ?? 0) !== (payload.tokenVersion ?? 0)', 'if (!branchScopeCovers(current, branchScopeOf(payload)))',
    // B2.17-ب: والجلسة نفسها لسه قايمة، قبل حكم الرمز
    'if (payload.sid && !(await this.sessions.active(payload.sid, payload.sub)))', 'if (sessionViaCookie(req)', 'return payload'].map(part => strategy.indexOf(part))
  assert.ok(order.every((at, index) => at > 0 && (index === 0 || at > order[index - 1])), JSON.stringify(order))

  const service = read('api/src/auth/auth.service.ts')
  // الرمز جوه توكن جلسة الـcookie بس؛ والجلسة العادية ردها وتوكنها زي ما هم
  assert.match(service, /const csrf = session\.cookie \? newCsrfToken\(\) : null/)
  assert.match(service, /\.\.\.\(csrf \? \{ csrf \} : \{\}\),\n      \.\.\.\(sid \? \{ sid \} : \{\}\),\n      \.\.\.\(totpSetupRequired \? \{ totpSetupRequired: true \} : \{\}\),\n      \.\.\.\(preboardingUntil \? \{ preboardingUntil \} : \{\}\),\n    \}\n\n    return \{\n      accessToken: await this\.jwt\.signAsync\(payload\),/)
  assert.match(service, /\.\.\.\(csrf \? \{ csrfToken: csrf \} : \{\}\),\n    \}\n  \}/)
  assert.match(service, /private async issueSession\(user: User, session: SessionMode = \{\}, context: LoginContext = \{\}\): Promise<SessionResponse>/)
  assert.match(service, /csrfToken: payload\.csrf \?\? null,/)

  const controller = read('api/src/auth/auth.controller.ts')
  // التسليم: الـcookie للجلسة الكاملة بس (الحالة المعلّقة مافيهاش توكن)، والتوكن بيتشال من الرد
  const deliver = controller.slice(controller.indexOf('private deliver<'), controller.indexOf("@Post('login')"))
  assert.match(deliver, /if \(!cookie \|\| typeof \(result as \{ accessToken\?: unknown \}\)\.accessToken !== 'string'\) return result/)
  assert.match(deliver, /const \{ accessToken, \.\.\.rest \} = result as T & \{ accessToken: string \}/)
  assert.match(deliver, /res\.setHeader\('Set-Cookie', sessionCookieHeader\(accessToken, sessionCookieOptions\(\), remember \? lifetime : null\)\)\s+return rest/)
  for (const call of ['this.auth.login(dto.email, dto.password, { ip, userAgent }, { cookie })', 'this.auth.domainLogin(dto.username, dto.password, { ip, userAgent }, { cookie })',
    'this.auth.verifyTwoFactor(dto.challengeToken, dto.code, { ip, userAgent }, { cookie })', 'this.auth.changePassword(user.sub, dto.currentPassword, dto.newPassword, { cookie }, context)']) {
    assert.ok(controller.includes(`this.deliver(res, await ${call}, cookie, dto.remember === true)`), call)
  }
  assert.equal(controller.match(/const cookie = dto\.cookieSession === true/g).length, 3, 'بطلب صريح ومنطقي من العميل')
  assert.match(controller, /const cookie = sessionViaCookie\(req\)\s+const context = [^\n]+\s+return this\.deliver\(res, await this\.auth\.changePassword/, 'تغيير كلمة المرور بشكل الجلسة اللي الطلب جه بيها')
  assert.match(controller, /@IsBoolean\(\{ message: 'cookieSession يقبل true أو false بس' \}\)\s+cookieSession\?: boolean/)
  // الخروج: من غير حارس، وبيمسح لما الطلب شايل الـcookie بس
  const logout = controller.slice(controller.indexOf("@Post('logout')"), controller.indexOf("@Get('security-status')"))
  assert.doesNotMatch(logout.slice(0, logout.indexOf('logout(')), /UseGuards/)
  assert.match(logout, /const cookie = sessionCookieOf\(req, options\)[\s\S]{0,900}if \(cookie !== null\) res\.setHeader\('Set-Cookie', clearedSessionCookieHeader\(options\)\)/)
  // CRP3D-N02: خروج بـcookie جلسة سليمة من غير عنوان الواجهة لازم يشيل رمز CSRF بتاعها — قبل إنهاء الجلسة ومسح الـcookie
  assert.match(logout, /if \(bearer === null && cookie !== null && !fromFrontendOrigin\(req\.headers\.origin\)\) \{\n\s+const csrf = await this\.auth\.csrfOfToken\(cookie\)\n\s+if \(csrf !== undefined && !csrfMatches\(csrf, req\.headers\[CSRF_HEADER\]\)\) throw new ForbiddenException\(\{ statusCode: 403, code: CSRF_TOKEN_INVALID, message: CSRF_MESSAGE \}\)\n\s+\}[\s\S]{0,200}await this\.auth\.endSessionOfToken\(bearer \?\? cookie\)/)
  // بيانات الجلسة مفتوحة لكل بوابات الجلسة (كلمة مؤقتة، تفعيل تطبيق المصادقة، إقرار السياسات): الواجهة بتجيب منها الحساب والرمز
  assert.match(controller, /@UseGuards\(JwtAuthGuard\)\s+@AllowPendingPasswordChange\(\)\s+@AllowPendingTotpSetup\(\)\s+@AllowDuringPolicyGate\(\)\s+@Get\('session'\)/)
  // الخادم بيسمح للواجهة ترسل الـcookie (نفس الإعداد القايم)
  assert.match(read('api/src/main.ts'), /origin: config\.get<string>\('FRONTEND_URL', 'http:\/\/localhost:3000'\),\s+credentials: true,/)
})

test('SK-03: the web app keeps no token — nothing in storage, no Authorization header, every call through the session with the CSRF token on writes', () => {
  const files = walk('src')
  const sources = files.map(file => [file, read(file)])
  const client = read('src/lib/api.ts')
  // «خلص لما»: مفيش توكن في تخزين المتصفح — ولا مفتاح توكن بيتكتب، ولا ترويسة Authorization في أي ملف واجهة
  for (const [file, text] of sources) {
    assert.doesNotMatch(text, /Authorization/, `${file}: ترويسة Authorization`)
    assert.doesNotMatch(text, /getToken\(|accessToken/, `${file}: توكن في الواجهة`)
    assert.doesNotMatch(text, /(localStorage|sessionStorage|store)\.setItem\([^)]*(token|jwt)/i, `${file}: توكن بيتحفظ`)
  }
  const stored = [...client.matchAll(/store\.setItem\(([A-Z_]+),/g)].map(match => match[1])
  assert.deepEqual(stored, ['USER_KEY', 'MARK_KEY'], 'اللي بيتحفظ: بيانات الحساب وعلامة الجلسة بس')
  assert.match(client, /const LEGACY_TOKEN_KEY = 'hr_access_token'/)
  // التوكن القديم بيتمسح من المتصفحات اللي فيها أول ما الواجهة تتحمّل، وبيانات حساب جلسته معاه
  assert.match(client, /for \(const store of \[localStorage, sessionStorage\]\) \{[\s\S]{0,160}if \(store\.getItem\(LEGACY_TOKEN_KEY\) !== null\) store\.removeItem\(USER_KEY\)\s+store\.removeItem\(LEGACY_TOKEN_KEY\)/)
  assert.match(client, /store\.setItem\(MARK_KEY, newSessionMark\(\)\)/)
  // جلسة واحدة في المتصفح: الدخول بيمسح بيانات أي جلسة أقدم من المخزنين قبل ما يحفظ (لقاها فحص المتصفح: حساب قديم في localStorage كان بيسبق)
  const save = client.slice(client.indexOf('export const saveSession = ('), client.indexOf('export const clearSession'))
  assert.match(save, /for \(const other of \[localStorage, sessionStorage\]\) \{\s+other\.removeItem\(USER_KEY\)\s+other\.removeItem\(MARK_KEY\)\s+\}\s+const store = remember \? localStorage : sessionStorage/)
  assert.doesNotMatch(client, /setItem\([^)]*csrf/i, 'رمز CSRF في الذاكرة بس')
  // كل نداء على الخادم بـcookie الجلسة، ورمز CSRF لطلبات الكتابة لما فيه جلسة
  assert.match(client, /const token = isWrite\(init\.method\) && hasSession\(\) \? await csrfToken\(\) : null\s+return \{ \.\.\.init, credentials: 'include', headers: \{ \.\.\.\(token \? \{ \[CSRF_HEADER\]: token \} : \{\}\)/)
  assert.match(client, /const CSRF_HEADER = 'X-CSRF-Token'/)
  // مفيش fetch مباشر على الخادم برّه sessionInit (غير قراءة بيانات الجلسة نفسها)
  for (const [file, text] of sources) {
    const direct = [...text.matchAll(/fetch\(\s*(`\$\{API_BASE\}[^`]*`|API_BASE[^,)]*)\s*(,\s*([^)]{0,40}))?/g)]
    for (const match of direct) {
      const rest = match[3] ?? ''
      assert.ok(/^await sessionInit\(/.test(rest) || /^\{ credentials: 'include' \}/.test(rest), `${file}: ${match[0].slice(0, 110)}`)
    }
  }
  assert.equal(client.split("fetch(`${API_BASE}/auth/session`, { credentials: 'include' })").length - 1, 1)
  // رفض CSRF (رمز قديم بعد دخول في تبويب تاني): الرمز بيتجاب تاني والطلب بيتعاد مرة واحدة — الخادم رفض قبل ما ينفّذ
  assert.match(client, /if \(signedIn && isWrite\(options\.method\) && \(await csrfRefused\(res\)\)\) \{\s+await csrfToken\(true\)\s+res = await send\(\)\s+\}/)
  assert.match(client, /\?\.code === 'CSRF_TOKEN_INVALID'/)
  // الدخول والتحقق بطلب جلسة cookie دايمًا
  for (const body of ["{ email, password, cookieSession: true, remember }", "{ username, password, cookieSession: true, remember }", "{ challengeToken, code, cookieSession: true, remember }"]) {
    assert.ok(client.includes(`body: JSON.stringify(${body})`), body)
  }
  // الخروج بينادي الخادم (سكربت الصفحة مايقدرش يمسح cookie HttpOnly)
  assert.match(client, /const send = async \(\) => fetch\(`\$\{API_BASE\}\/auth\/logout`, await sessionInit\(\{ method: 'POST' \}\)\)\n[\s\S]{0,200}if \(await csrfRefused\(await send\(\)\)\) \{\n\s+await csrfToken\(true\)\n\s+await send\(\)/)
  assert.match(read('src/components/layout/Sidebar.tsx'), /void logout\(\)\.then\(\(\) => \{ window\.location\.href = '\/login' \}\)/)
  // تبويب جديد: بيانات الحساب بترجع من الخادم قبل ما الواجهة تحوّل لصفحة الدخول
  const layout = read('src/components/layout/MainLayout.tsx')
  assert.match(layout, /if \(hasSession\(\)\) \{\s+enter\(\)\s+return\s+\}/)
  assert.match(layout, /void restoreSession\(\)\.then\(\(user\) => \{\s+if \(cancelled\) return\s+if \(!user\) \{\s+window\.location\.href = '\/login'/)
  // صفحة الدخول: حفظ واحد للجلسة، ببيانات الحساب ورمز CSRF
  const login = read('src/app/login/page.tsx')
  assert.match(login, /saveSession\(user, rememberMe, session\.csrfToken\)/)
  assert.equal((login.match(/saveSession\(/g) || []).length, 1)
})
