// B6.4 — الدخول المؤسسي (OIDC): الإعداد من البيئة، المعاملة الموقّعة وPKCE، تحقق الـID token (RS256 بمفتاح المزوّد بس)، تحويل الهوية لشكل حساب
// الشركة (الخانة اللي يتحكم فيها مدير المؤسسة، والنطاق المسموح)، ومصدر الكود (نفس مطابقة ونفس إكمال دخول حساب الشركة). حساب نقي بلا شبكة ولا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sso = require('../src/auth/sso-oidc')
const read = rel => fs.readFileSync(path.join(apiRoot, 'src', rel), 'utf8').replace(/\r\n/g, '\n')
const ENV = { SSO_OIDC_ISSUER: 'https://login.example.com/tenant-1/v2.0/', SSO_OIDC_CLIENT_ID: 'client-1', SSO_OIDC_CLIENT_SECRET: 'not-a-real-secret', SSO_OIDC_ALLOWED_DOMAINS: 'Example.com, corp.example.org', FRONTEND_URL: 'https://hr.example.com/' }
const b64 = value => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url')
const keyPair = kid => { const pair = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }); return { kid, privateKey: pair.privateKey, jwk: { ...pair.publicKey.export({ format: 'jwk' }), kid, use: 'sig', alg: 'RS256' } } }
const signed = (key, claims, header = {}) => {
  const head = b64({ alg: 'RS256', typ: 'JWT', kid: key.kid, ...header }), body = b64(claims)
  return `${head}.${body}.${crypto.sign('RSA-SHA256', Buffer.from(`${head}.${body}`), key.privateKey).toString('base64url')}`
}

test('SSU-01: الإعداد — من البيئة بس، والناقص أو الغلط = مقفول؛ https إجباري، وhttp بمتغير صريح ومش في الإنتاج', () => {
  const config = sso.ssoConfig(ENV)
  assert.deepEqual([config.issuer, config.clientId, config.allowedDomains, config.loginClaim, config.label, config.redirectUri, config.allowInsecure],
    ['https://login.example.com/tenant-1/v2.0', 'client-1', ['example.com', 'corp.example.org'], 'preferred_username', 'الدخول بحساب المؤسسة', 'https://hr.example.com/login', false])
  for (const missing of ['SSO_OIDC_ISSUER', 'SSO_OIDC_CLIENT_ID', 'SSO_OIDC_CLIENT_SECRET', 'SSO_OIDC_ALLOWED_DOMAINS']) assert.equal(sso.ssoConfig({ ...ENV, [missing]: '' }), null, missing)
  assert.deepEqual([sso.ssoConfig({}), sso.ssoConfig({ ...ENV, SSO_OIDC_ISSUER: 'http://login.example.com' }), sso.ssoConfig({ ...ENV, SSO_OIDC_ISSUER: 'https://user:pw@login.example.com' }), sso.ssoConfig({ ...ENV, SSO_OIDC_ALLOWED_DOMAINS: 'not a domain' }),
    sso.ssoConfig({ ...ENV, SSO_OIDC_LOGIN_CLAIM: 'nickname' })], [null, null, null, null, null])
  assert.deepEqual([sso.ssoConfig({ ...ENV, SSO_OIDC_ISSUER: 'http://127.0.0.1:9000', SSO_OIDC_ALLOW_INSECURE: '1', NODE_ENV: 'test' })?.allowInsecure,
    sso.ssoConfig({ ...ENV, SSO_OIDC_ISSUER: 'http://127.0.0.1:9000', SSO_OIDC_ALLOW_INSECURE: '1', NODE_ENV: 'production' }), sso.ssoConfig({ ...ENV, SSO_OIDC_LOGIN_CLAIM: 'email', SSO_OIDC_LABEL: 'Microsoft' })?.label], [true, null, 'Microsoft'])
})

test('SSU-02: المعاملة وPKCE — موقّعة بسر الخادم وبعمر قصير، والـstate بيتقارن بالحرف، وعنوان التفويض فيه كل اللازم', () => {
  const tx = sso.newSsoTransaction(1000), sealed = sso.sealSsoTransaction(tx, 'server-secret')
  assert.deepEqual([tx.expiresAt, sso.openSsoTransaction(sealed, 'server-secret', 1000), sso.openSsoTransaction(sealed, 'server-secret', 1600), sso.openSsoTransaction(sealed, 'server-secret', 1601), sso.openSsoTransaction(sealed, 'other-secret', 1000),
    sso.openSsoTransaction(sealed.replace(/.$/, sealed.endsWith('A') ? 'B' : 'A'), 'server-secret', 1000), sso.openSsoTransaction('x.y', 'server-secret', 1000), sso.openSsoTransaction(null, 'server-secret', 1000)],
  [1600, tx, tx, null, null, null, null, null])
  // معاملة اتعدّلت (state تاني) بتوقيعها القديم مرفوضة
  const forged = `${b64({ ...tx, state: 'attacker-state-attacker-state' })}.${sealed.split('.')[1]}`
  assert.equal(sso.openSsoTransaction(forged, 'server-secret', 1000), null)
  assert.notEqual(sso.newSsoTransaction(1000).state, tx.state)
  assert.deepEqual([sso.sameState(tx.state, tx.state), sso.sameState(tx.state + 'x', tx.state), sso.sameState('', tx.state), sso.sameState(undefined, tx.state)], [true, false, false, false])
  // RFC 7636 (الملحق ب)
  assert.equal(sso.pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'), 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
  const url = new URL(sso.authorizationUrl('https://login.example.com/authorize?tenant=1', sso.ssoConfig(ENV), tx))
  assert.deepEqual([url.origin + url.pathname, Object.fromEntries(url.searchParams)], ['https://login.example.com/authorize', { tenant: '1', response_type: 'code', client_id: 'client-1', redirect_uri: 'https://hr.example.com/login', scope: 'openid profile email',
    state: tx.state, nonce: tx.nonce, code_challenge: sso.pkceChallenge(tx.verifier), code_challenge_method: 'S256' }])
  assert.equal(url.toString().includes(tx.verifier), false)
  assert.equal(sso.ssoCookieHeader('v', true, 600), 'hr_sso_tx=v; Path=/api/auth/login/sso; HttpOnly; SameSite=Strict; Secure; Max-Age=600')
})

test('SSU-03: الـID token — RS256 بمفتاح المزوّد بنفس الـkid بس؛ المزوّد والتطبيق والصلاحية والـnonce؛ و`none` وHS والتوقيع المتلاعب فيه مرفوضين', () => {
  const key = keyPair('k1'), other = keyPair('k1'), now = 1_800_000_000
  const expected = { issuer: 'https://login.example.com/tenant-1/v2.0', clientId: 'client-1', nonce: 'nonce-nonce-nonce-nonce-1' }
  const claims = { iss: expected.issuer, aud: 'client-1', sub: 'subject-1', exp: now + 300, iat: now - 5, nonce: expected.nonce, preferred_username: 'Mona@Example.com', name: 'منى أحمد' }
  const refusal = (token, keys = [key.jwk], want = expected, at = now) => { try { sso.verifyIdToken(token, keys, want, at); return 'OK' } catch (failure) { return failure instanceof sso.SsoTokenError ? failure.code : 'THROWN' } }
  assert.deepEqual(sso.verifyIdToken(signed(key, claims), [keyPair('k0').jwk, key.jwk], expected, now), claims)
  assert.equal(refusal(signed(key, { ...claims, aud: ['client-1', 'other'], azp: 'client-1' })), 'OK')
  const unsigned = `${b64({ alg: 'none', kid: 'k1' })}.${b64(claims)}.`
  const hmac = (() => { const head = b64({ alg: 'HS256', kid: 'k1' }), body = b64(claims); return `${head}.${body}.${crypto.createHmac('sha256', key.jwk.n).update(`${head}.${body}`).digest('base64url')}` })()
  const tampered = (() => { const [head, , signature] = signed(key, claims).split('.'); return `${head}.${b64({ ...claims, preferred_username: 'admin@example.com' })}.${signature}` })()
  assert.deepEqual([refusal(unsigned), refusal(`${b64({ alg: 'none', kid: 'k1' })}.${b64(claims)}.x`), refusal(hmac), refusal(tampered), refusal(signed(other, claims)), refusal(signed(keyPair('k9'), claims)), refusal(signed(key, claims), []),
    refusal(signed(key, claims), [{ ...key.jwk, use: 'enc' }]), refusal('a.b'), refusal(null), refusal('!!.!!.!!')],
  ['MALFORMED', 'ALGORITHM', 'ALGORITHM', 'SIGNATURE', 'SIGNATURE', 'UNKNOWN_KEY', 'UNKNOWN_KEY', 'UNKNOWN_KEY', 'MALFORMED', 'MALFORMED', 'MALFORMED'])
  assert.deepEqual([refusal(signed(key, { ...claims, iss: 'https://login.example.com/tenant-2/v2.0' })), refusal(signed(key, { ...claims, aud: 'another-app' })), refusal(signed(key, { ...claims, aud: ['client-1', 'other'] })),
    refusal(signed(key, { ...claims, azp: 'other' })), refusal(signed(key, { ...claims, exp: now - 61 })), refusal(signed(key, { ...claims, exp: now - 60 })), refusal(signed(key, { ...claims, iat: now + 61 })), refusal(signed(key, { ...claims, nbf: now + 61 })),
    refusal(signed(key, { ...claims, nonce: 'another-nonce-another-nonce' })), refusal(signed(key, { ...claims, nonce: undefined })), refusal(signed(key, { ...claims, sub: '' })), refusal(signed(key, { ...claims, exp: 'soon' }))],
  ['ISSUER', 'AUDIENCE', 'AUDIENCE', 'AUDIENCE', 'EXPIRED', 'OK', 'ISSUED_IN_FUTURE', 'NOT_YET_VALID', 'NONCE', 'NONCE', 'SUBJECT', 'EXPIRED'])
})

test('SSU-04: الهوية — الخانة المضبوطة بس (UPN افتراضيًا؛ `email` بشرط التحقق)، ونطاق مسموح، ومعرّف ثابت مابيتصادمش مع معرّف الدليل', () => {
  const config = { issuer: 'https://login.example.com/tenant-1/v2.0', allowedDomains: ['example.com'], loginClaim: 'preferred_username' }
  const identity = sso.ssoIdentity({ sub: 'subject-1', preferred_username: 'Mona@Example.com', email: 'attacker@evil.test', name: ' منى أحمد ', employeeid: ' 1042 ' }, config)
  assert.deepEqual(identity, { objectGuid: sso.ssoObjectId(config.issuer, 'subject-1'), sAMAccountName: 'mona', userPrincipalName: 'mona@example.com', mail: 'mona@example.com', displayName: 'منى أحمد', employeeId: '1042', disabled: false })
  assert.match(identity.objectGuid, /^sso:[a-f0-9]{56}$/)
  assert.ok(identity.objectGuid.length <= 64)
  assert.notEqual(sso.ssoObjectId(config.issuer, 'subject-1'), sso.ssoObjectId('https://login.example.com/tenant-2/v2.0', 'subject-1'))
  const refusal = (claims, with_ = config) => { try { sso.ssoIdentity({ sub: 's', ...claims }, with_); return 'OK' } catch (failure) { return failure.code } }
  // خانة email (بيغيّرها المستخدم في Entra) مابتتستخدمش للمطابقة إلا لو الإعداد قال والمزوّد أكد التحقق
  assert.deepEqual([refusal({ email: 'mona@example.com' }), refusal({ preferred_username: 'mona' }), refusal({ preferred_username: 'mona@evil.test' }), refusal({ preferred_username: 'mona@example.com.evil.test' }),
    refusal({ preferred_username: 'mona@example.com', hd: 'evil.test' }), refusal({ preferred_username: 'mona@example.com', hd: 'example.com' })], ['LOGIN_CLAIM', 'LOGIN_CLAIM', 'DOMAIN', 'DOMAIN', 'DOMAIN', 'OK'])
  const byEmail = { ...config, loginClaim: 'email' }
  assert.deepEqual([refusal({ email: 'mona@example.com' }, byEmail), refusal({ email: 'mona@example.com', email_verified: 'true' }, byEmail), refusal({ email: 'mona@example.com', email_verified: true }, byEmail)], ['EMAIL_UNVERIFIED', 'EMAIL_UNVERIFIED', 'OK'])
})

test('SSU-05: مصدر الكود — نفس مطابقة ونفس إكمال دخول حساب الشركة، المعاملة من cookie على مسارها ولمحاولة واحدة، والمزوّد من الإعداد بس ومن غير تتبّع تحويل', () => {
  const auth = read('auth/auth.service.ts'), controller = read('auth/auth.controller.ts'), service = read('auth/sso.service.ts')
  // نفس resolveUser ونفس finishLogin — مفيش مطابقة ولا إنشاء حساب تاني، ومفيش دور ولا صلاحية من المزوّد
  const login = auth.slice(auth.indexOf('async ssoLogin('), auth.indexOf('   * الخطوة الأخيرة المشتركة للمسارين'))
  assert.match(login, /user = await this\.domain\.resolveUser\(identity\)/)
  assert.match(login, /return this\.finishLogin\(user, 'DOMAIN', identity\.mail \?\? user\.email, context, identifier, session\)/)
  assert.doesNotMatch(login + service + read('auth/sso-oidc.ts'), /\brole\b\s*[:=]|permissions\s*[:=]|scopeAllBranches|branchId\s*[:=]|groups|\.save\(|INSERT INTO|UPDATE dbo/)
  // المسارين: من واجهة النظام بس، والمعاملة من الـcookie وبتتمسح قبل أي حكم
  for (const route of ["@Post('login/sso/start')", "@Post('login/sso/callback')"]) assert.ok(controller.includes(route), route)
  const callback = controller.slice(controller.indexOf("@Post('login/sso/callback')"), controller.indexOf('// الخطوة الثانية للمسارين'))
  const order = ["if (!fromFrontendOrigin(req.headers.origin)) throw new ForbiddenException", "res.setHeader('Set-Cookie', cleared)", 'await this.sso.finish(dto.code, dto.state, readCookie(req.headers.cookie, SSO_TX_COOKIE))', 'await this.auth.ssoLogin(identity,']
    .map(text => callback.indexOf(text))
  assert.ok(order.every((at, index) => at > 0 && (index === 0 || at > order[index - 1])), JSON.stringify(order))
  // الخدمة: المزوّد من البيئة (مش من الطلب)، الاكتشاف لازم يطابق المزوّد المضبوط، كل نداء من غير تتبّع تحويل وبمهلة، وسر التطبيق مابيتسجّلش
  assert.match(service, /return ssoConfig\(process\.env\)/)
  assert.match(service, /if \(document\.issuer !== config\.issuer \|\| !\[authorizationEndpoint, tokenEndpoint, jwksUri\]\.every\(url => secureUrl\(url, config\.allowInsecure\)\)\) throw new Error/)
  assert.match(service, /fetch\(url, \{ \.\.\.init, redirect: 'manual', signal: AbortSignal\.timeout\(PROVIDER_TIMEOUT_MS\) \}\)/)
  assert.match(service, /if \(!tx \|\| !sameState\(state, tx\.state\) \|\| typeof code !== 'string' \|\| !code \|\| code\.length > 4000\) throw new UnauthorizedException\(SSO_TX_INVALID\)/)
  // (كود سبب الرفض `failure.code` مسموح — ده اسم السبب مش كود التفويض)
  assert.doesNotMatch(service, /logger\.[a-z]+\([^)]*clientSecret|logger\.[a-z]+\([^)]*id_token|logger\.[a-z]+\([^)]*(?<!\.)\bcode\b/)
})
