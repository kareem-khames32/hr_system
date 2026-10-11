// B5.6 — بصمة الموبايل: المسافة والحكم على الموقع، قواعد الموقع والنقطة، ومصدر الكود (الحكم على الخادم تحت قفل الموظف، وقت الخادم، البصمة من المسار القايم) والواجهة.
// حساب نقي بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const rules = require('../src/attendance/mobile-punch')
const registry = require('../src/modules-registry/registry')
const read = rel => fs.readFileSync(path.join(apiRoot, 'src', rel), 'utf8').replace(/\r\n/g, '\n')
const web = rel => fs.readFileSync(path.join(apiRoot, '..', 'src', rel), 'utf8').replace(/\r\n/g, '\n')

test('MPU-01: المسافة والحكم — أقرب موقع، جوه نصف القطر مقبولة، برّه مرفوضة، والدقة الضعيفة مرفوضة حتى لو النقطة جوه، ومن غير مواقع مفيش حكم', () => {
  const plant = { id: 1, name: 'المصنع', latitude: 24.7136, longitude: 46.6753, radiusMeters: 150 }, depot = { id: 2, name: 'المخزن', latitude: 24.9, longitude: 46.9, radiusMeters: 100 }
  assert.equal(rules.distanceMeters(plant, plant), 0)
  const north = rules.distanceMeters(plant, { latitude: 24.72, longitude: 46.6753 })
  assert.ok(north > 700 && north < 720, String(north))
  // درجة عرض ≈ 111.2 كم
  assert.ok(Math.abs(rules.distanceMeters({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 }) - 111195) < 100)
  const at = (latitude, longitude, accuracyMeters = 10) => ({ latitude, longitude, accuracyMeters })
  const judge = (position, sites = [depot, plant]) => { const result = rules.judgePosition(position, sites); return [result.outcome, result.site?.id ?? null] }
  assert.deepEqual([judge(at(24.7137, 46.6754)), judge(at(24.72, 46.6753)), judge(at(24.9001, 46.9)), judge(at(24.7137, 46.6754, 101)), judge(at(24.7137, 46.6754, 100)), judge(at(24.7137, 46.6754), [])],
    [['ACCEPTED', 1], ['OUT_OF_RANGE', 1], ['ACCEPTED', 2], ['LOW_ACCURACY', 1], ['ACCEPTED', 1], ['NO_SITE', null]])
  // على حد نصف القطر بالظبط مقبولة
  const edge = rules.distanceMeters(plant, { latitude: 24.7149, longitude: 46.6753 })
  assert.equal(rules.judgePosition(at(24.7149, 46.6753), [{ ...plant, radiusMeters: edge }]).outcome, 'ACCEPTED')
  assert.equal(rules.judgePosition(at(24.7149, 46.6753), [{ ...plant, radiusMeters: edge - 1 }]).outcome, 'OUT_OF_RANGE')
  assert.deepEqual([rules.ACCURACY_LIMIT_METERS, rules.MIN_GAP_SECONDS], [100, 60])
})

test('MPU-02: قواعد الموقع ونقطة الموظف — إحداثيات في المدى، نصف قطر بحده، ودقة موجبة مطلوبة', () => {
  assert.deepEqual(rules.siteFields({ name: '  مصنع   الرياض ', branchId: 2, latitude: 24.71360049, longitude: 46.6753, radiusMeters: 150 }).fields,
    { name: 'مصنع الرياض', branchId: 2, latitude: 24.7136, longitude: 46.6753, radiusMeters: 150, isActive: true })
  assert.deepEqual([{ name: 'م', branchId: 2, latitude: 1, longitude: 1, radiusMeters: 50 }, { name: 'موقع', latitude: 1, longitude: 1, radiusMeters: 50 }, { name: 'موقع', branchId: 2, latitude: -91, longitude: 1, radiusMeters: 50 },
    { name: 'موقع', branchId: 2, latitude: 1, longitude: 181, radiusMeters: 50 }, { name: 'موقع', branchId: 2, latitude: 1, longitude: 1, radiusMeters: 19 }, { name: 'موقع', branchId: 2, latitude: 1, longitude: 1, radiusMeters: 5001 },
    { name: 'موقع', branchId: 2, latitude: NaN, longitude: 1, radiusMeters: 50 }].map(body => rules.siteFields(body).fields), [null, null, null, null, null, null, null])
  assert.deepEqual(rules.positionFields({ latitude: 24.7137, longitude: 46.6754, accuracy: 12.4 }).fields, { latitude: 24.7137, longitude: 46.6754, accuracyMeters: 13 })
  assert.deepEqual([{}, { latitude: '24.7', longitude: 46.6, accuracy: 5 }, { latitude: 24.7, longitude: 46.6 }, { latitude: 24.7, longitude: 46.6, accuracy: 0 }, { latitude: 24.7, longitude: 46.6, accuracy: -5 },
    { latitude: 24.7, longitude: 46.6, accuracy: Infinity }].map(body => rules.positionFields(body).fields), [null, null, null, null, null, null])
})

test('MPU-03: مصدر الكود — ميزة مقفولة بمساراتها؛ الحكم تحت قفل صف الموظف والمحاولة بتتسجّل في نفس المعاملة؛ والبصمة المقبولة بوقت الخادم من ingest القايم برّه المعاملة', () => {
  const feature = registry.MODULES.attendance.features['attendance.mobile_punch']
  assert.deepEqual([feature.default, feature.routes, registry.routeOwner('/my/punch'), registry.routeOwner('/attendance/punch-sites'), registry.routeOwner('/attendance/devices'), registry.routeOwner('/my/attendance')],
    [false, ['/my/punch', '/attendance/punch-sites'], { module: 'attendance', feature: 'attendance.mobile_punch' }, { module: 'attendance', feature: 'attendance.mobile_punch' }, { module: 'attendance', feature: null }, { module: 'attendance', feature: null }])
  const controller = read('attendance/mobile-punch.controller.ts')
  assert.match(controller, /@RequireModule\('attendance'\)\n@RequireFeature\('attendance\.mobile_punch'\)\n@UseGuards\(JwtAuthGuard, RolesGuard\)/)
  assert.deepEqual([(controller.match(/@Perm\('attendance\.manage'\)/g) ?? []).length, (controller.match(/@Perm\('attendance\.view_all'\)/g) ?? []).length, (controller.match(/@(Get|Post|Put|Patch|Delete)\(/g) ?? []).length], [3, 1, 6])
  assert.doesNotMatch(controller, /timestamp|punchTime|employeeCode/, 'العميل مايبعتش وقت ولا كود')
  const service = read('attendance/mobile-punch.service.ts')
  const punch = service.slice(service.indexOf('async punch('), service.indexOf('// ===== الإدارة'))
  assert.ok(punch.indexOf('FROM dbo.employees WITH (UPDLOCK, ROWLOCK)') < punch.indexOf('judgePosition(fields, sites)') && punch.indexOf('judgePosition(fields, sites)') < punch.indexOf('attempts.save('))
  assert.match(punch, /if \(judged\.outcome !== 'ACCEPTED'\) throw new BadRequestException\(OUTCOME_MESSAGES\[judged\.outcome\]\)\n    try \{\n      await this\.attendance\.ingest\(\[\{ employeeCode: judged\.fingerprintCode, timestamp: judged\.at\.toISOString\(\), deviceSn: `\$\{MOBILE_DEVICE_PREFIX\}\$\{judged\.siteId\}` \}\], undefined, user, \{ fromDevice: true, onlyEmployeeId: me \}\)/)
  assert.ok(punch.indexOf('this.ds.transaction(') < punch.indexOf('await this.attendance.ingest(') && punch.lastIndexOf('})\n    if (judged.outcome') > 0, 'ingest برّه معاملة الحكم')
  assert.match(punch, /where: \{ branchId: Number\(person\.branchId\), isActive: true \}/, 'مواقع فرع الموظف الحالي المفعّلة بس')
  assert.doesNotMatch(service, /getRepository\(AttendancePunch\)|INSERT INTO dbo\.attendance_punches/, 'مفيش كتابة بصمة مباشرة')
  assert.match(service, /rows\.filter\(row => inBranchScope\(scope, idOf\(row\.branchId\)\)\)/)
})

test('MPU-04: الواجهة — «بصمتي» بتبعت الموقع ودقته بس وبتأكد فورًا؛ و«بصمة الموبايل» للمواقع (بزرار من الخادم) والمحاولات؛ والقايمة والعناوين', () => {
  const mine = web('app/my/punch/page.tsx'), admin = web('app/attendance/punch-sites/page.tsx')
  assert.match(mine, />\s*بصمتي\s*<\/h1>/); assert.match(admin, />\s*بصمة الموبايل\s*<\/h1>/)
  assert.match(mine, /sendPunch\(\{ latitude: position\.coords\.latitude, longitude: position\.coords\.longitude, accuracy: position\.coords\.accuracy \}\)/)
  assert.match(mine, /enableHighAccuracy: true, timeout: 20000, maximumAge: 0/)
  assert.match(mine, /\{usable && \(/)
  assert.match(admin, /setAttempts\(result\.rows\); setManage\(result\.canManage\)/)
  assert.match(admin, /\{manage && data\?\.ready && \(/)
  const sidebar = web('components/layout/Sidebar.tsx'), titles = web('components/layout/pageTitles.ts')
  assert.match(sidebar, /\{ label: 'بصمة الموبايل', href: '\/attendance\/punch-sites', perm: 'attendance\.view_all' \}/)
  assert.match(sidebar, /\{ id: 'my-punch', label: 'بصمتي', icon: <Clock size=\{20\} \/>, href: '\/my\/punch' \}/)
  assert.match(titles, /\['\/attendance\/punch-sites', 'بصمة الموبايل'\]/); assert.match(titles, /\['\/my\/punch', 'بصمتي'\]/)
  // رؤوس الحماية بتسمح بالموقع لصفحات النظام نفسه — من غيرها كل متصفح بيرفض «بصمتي» من غير ما يسأل (عيب أول تجربة للمالك، 12 أكتوبر 2026)
  const next = fs.readFileSync(path.join(apiRoot, '..', 'next.config.js'), 'utf8')
  assert.match(next, /\{ key: 'Permissions-Policy', value: 'camera=\(\), microphone=\(\), geolocation=\(self\)' \}/)
  assert.doesNotMatch(next, /geolocation=\(\)'/, 'الموقع مش ممنوع على صفحات النظام')
  assert.match(next, /source: '\/:path\*', headers: SECURITY_HEADERS/, 'على كل الصفحات: السياسة بتتاخد من أول صفحة اتحمّلت')
  // والصفحة بتقول سبب فشل قراءة الموقع بالظبط
  for (const part of ['error.code === error.PERMISSION_DENIED', 'error.code === error.TIMEOUT', '!window.isSecureContext']) assert.ok(mine.includes(part), part)
})
