// «ملفي الشخصي» (قرار المالك 30 سبتمبر) في الواجهة: زرار الكاميرا بيرفع صورة الموظف لنفسه (من غير employees.edit ولا اعتماد)،
// و«تعديل الملف» بيفتح نموذج بياناتي ويبعت طلب «تحديث بيانات شخصية» بالخانات اللي اتغيرت بس — وطلب لسه ماخلصش بيتعرض بدل التكرار.
// منطق الواجهة ونصوصها ونداءاتها (fetch متبدّل)؛ لا SQL ولا خادم. (الملفات على القرص CRLF — تُطبّع قبل الفحص)
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true,
  compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const profile = require('../../src/lib/profile-api')
const payload = require('../../src/lib/request-payload')
const root = path.resolve(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')
const page = read('src/app/profile/page.tsx')

const employee = { id: 7, fullName: 'سالم أحمد الغامدي', fullNameEn: 'Salem Ahmed', birthDate: '1990-05-10', gender: 'male', nationality: 'سعودي',
  maritalStatus: 'single', nationalId: '1010101010', passportNo: null, phone: '0501234567', phoneAlt: null, address: 'الرياض',
  emergencyRelation: 'أب', iban: 'SA0380000000608010167519', basicSalary: 7000 }

// fetch متبدّل: بيسجّل النداءات ويرد بالرد اللي الاختبار حدده
async function withFetch(responder, run) {
  const original = global.fetch, calls = []
  global.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method ?? 'GET', body: init.body })
    const body = responder(String(url), init)
    return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
  try { await run(calls) } finally { global.fetch = original }
  return calls
}

test('the camera button is wired: it opens an image picker, uploads an employee photo and saves it through the self endpoint', async () => {
  // الزرار بيفتح منتقي الملفات، والمنتقي صور بس، والاختيار بيروح لـhandlePhotoPick
  assert.ok(page.includes('onClick={() => photoInputRef.current?.click()}'))
  assert.ok(page.includes('ref={photoInputRef}'))
  assert.ok(page.includes("accept={PROFILE_PHOTO_TYPES.join(',')}"))
  assert.ok(page.includes('onChange={(event) => handlePhotoPick(event.target.files?.[0])}'))
  assert.ok(page.includes('aria-label="تغيير الصورة الشخصية"'))
  // لكل موظف: مفيش شرط employees.edit، ولا تعديل ملف الموظف (PATCH) من الشاشة دي
  assert.doesNotMatch(page, /canEditPhoto|can\('employees\.edit'\)|updateEmployee/)
  assert.ok(page.includes('const photoFileId = await uploadMyPhoto(file)'))
  assert.ok(page.includes('setEmployee((prev) => (prev ? { ...prev, photoFileId } : prev))'), 'the avatar reloads from the new photo id')

  assert.deepEqual([...profile.PROFILE_PHOTO_TYPES], ['image/jpeg', 'image/png', 'image/webp'])
  assert.equal(profile.profilePhotoIssue({ type: 'image/png', size: 10 * 1024 * 1024 }), null)
  assert.equal(profile.profilePhotoIssue({ type: 'image/png', size: 10 * 1024 * 1024 + 1 }), 'حجم الصورة أكبر من 10 ميجا — اختار صورة أصغر')
  assert.equal(profile.profilePhotoIssue({ type: 'application/pdf', size: 100 }), 'الصورة لازم تكون JPG أو PNG أو WEBP — اختار صورة تانية')

  const calls = await withFetch(url => url.includes('/files/upload') ? { id: 41, ref: 'file:41' } : { photoFileId: 41 }, async () => {
    assert.equal(await profile.uploadMyPhoto(new File([Buffer.from('png')], 'me.png', { type: 'image/png' })), 41)
  })
  assert.equal(calls.length, 2)
  assert.match(calls[0].url, /\/files\/upload\?entityType=employee_photo$/)
  assert.equal(calls[0].method, 'POST')
  assert.match(calls[1].url, /\/employees\/me\/photo$/)
  assert.deepEqual([calls[1].method, JSON.parse(calls[1].body)], ['PUT', { fileId: 41 }])
  // ملف مش صورة أو كبير مابيترفعش أصلًا
  const none = await withFetch(() => ({}), async () => {
    await assert.rejects(profile.uploadMyPhoto(new File([Buffer.from('%PDF')], 'cv.pdf', { type: 'application/pdf' })), /JPG أو PNG أو WEBP/)
  })
  assert.equal(none.length, 0)
})

test('«تعديل الملف» is wired: it opens the edit dialog prefilled with my data and submits only the changed fields as «تحديث بيانات شخصية»', async () => {
  assert.ok(page.includes('onClick={() => { setNotice(null); setEditOpen(true) }}'))
  assert.ok(page.includes('{editOpen && employee && (\n          <ProfileEditDialog'))
  assert.ok(page.includes('const [initial] = useState<ProfileFormValues>(() => profileFormValues(employee))'))
  assert.ok(page.includes('onSubmitted(await submitPersonalDataRequest(changes))'))
  assert.ok(page.includes('onSubmitted={handlePersonalDataSubmitted}'))
  // رسالة النجاح: التعديل بعد الاعتماد، ورابط «الطلبات»
  assert.ok(page.includes('التعديل هيتطبق على ملفك بعد اعتماده.'))
  assert.ok(page.includes('<Link href="/requests" className="underline font-medium">تابع طلباتك من «الطلبات»</Link>'))
  // طلب لسه ماخلصش = بيتعرض بدل النموذج، والبنك سطر لطلبه الآمن لو متاح
  assert.ok(page.includes('setPendingPersonal(pendingPersonalDataRequest(myRequests))'))
  assert.ok(page.includes('{pending ? ('))
  // طلباتي ماتحمّلتش = مانعرفش لو فيه طلب لسه ماخلصش → مفيش إرسال لحد إعادة المحاولة
  assert.ok(page.includes('const canSubmit = !pending && !requestsError && !!personalType'))
  assert.ok(page.includes("requestsError={!!sectionErrors['الطلبات']}"))
  assert.ok(page.includes('<Link href={BANK_CHANGE_REQUEST_LINK} className="text-primary-600 underline font-medium">«{bankType.nameAr}»</Link>'))
  assert.equal(profile.BANK_CHANGE_REQUEST_LINK, '/requests?type=BANK_ACCOUNT_CHANGE')

  // النموذج: قيم الملف، ومن غير البنك
  const values = profile.profileFormValues(employee)
  assert.deepEqual(Object.keys(values), profile.PERSONAL_DATA_FIELDS.map(field => field.key))
  assert.equal(values.phone, '0501234567'); assert.equal(values.passportNo, ''); assert.equal(values.emergencyRelation, 'أب')
  assert.ok(!('iban' in values) && !('basicSalary' in values) && !('email' in values))
  assert.deepEqual(profile.profileFormChanges(employee, values), [], 'untouched form = nothing to send')
  // المتغير بس، والمسح null، ورقم الجواز مطبّع
  const changes = profile.profileFormChanges(employee, { ...values, phone: ' 0559876543 ', address: '', passportNo: 'n 12 34' })
  assert.deepEqual(profile.personalDataPayload(changes), { passportNo: 'N1234', phone: '0559876543', address: null })
  assert.equal(profile.profileFormIssue(employee, changes, '2026-09-30'), null)
  // نفس قواعد الخادم: الإجباري مايتمسحش، الاسم بالعربي، واحد من الهوية أو الجواز
  const issue = patch => profile.profileFormIssue(employee, profile.profileFormChanges(employee, { ...values, ...patch }), '2026-09-30')
  assert.equal(issue({ phone: '' }), 'رقم الجوال مطلوب ولا يمكن مسحه')
  assert.equal(issue({ fullName: 'Salem Ahmed' }), 'الاسم الكامل لازم يكون بالعربي')
  assert.equal(issue({ nationalId: '' }), 'لازم رقم الهوية / الإقامة أو رقم جواز السفر — واحد منهم على الأقل')
  assert.equal(issue({ birthDate: '2026-09-30' }), 'تاريخ الميلاد لازم يكون قبل النهارده')

  const calls = await withFetch(() => ({ id: 90, status: 'UNDER_REVIEW', typeCode: 'PERSONAL_DATA_UPDATE' }), async () => {
    const created = await profile.submitPersonalDataRequest(changes)
    assert.equal(created.id, 90)
  })
  assert.equal(calls.length, 1)
  assert.match(calls[0].url, /\/requests$/)
  assert.deepEqual(JSON.parse(calls[0].body), { typeCode: 'PERSONAL_DATA_UPDATE', submit: true,
    payload: { passportNo: 'N1234', phone: '0559876543', address: null } })

  // طلب لسه ماخلصش (متقدّم/تحت المراجعة/راجع للتصحيح) = تكرار؛ المكتمل والمرفوض والملغي لأ
  const pending = profile.pendingPersonalDataRequest([
    { id: 1, typeCode: 'PERSONAL_DATA_UPDATE', status: 'COMPLETED' }, { id: 2, typeCode: 'LEAVE', status: 'UNDER_REVIEW' },
    { id: 3, typeCode: 'PERSONAL_DATA_UPDATE', status: 'RETURNED_FOR_INFO' }])
  assert.equal(pending.id, 3)
  assert.equal(profile.pendingPersonalDataRequest([{ id: 4, typeCode: 'PERSONAL_DATA_UPDATE', status: 'REJECTED' },
    { id: 5, typeCode: 'PERSONAL_DATA_UPDATE', status: 'CANCELLED' }]), null)
  assert.equal(profile.availableRequestType([{ code: 'BANK_ACCOUNT_CHANGE', isActive: true, destinationSupported: false }], 'BANK_ACCOUNT_CHANGE'), null)
})

test('request details and approvals show every personal field with an Arabic label and readable values', () => {
  for (const field of profile.PERSONAL_DATA_FIELDS) {
    assert.match(payload.payloadFieldLabel(field.key), /[؀-ۿ]/, field.key)
  }
  assert.equal(payload.payloadFieldLabel('emergencyContactPhone'), 'رقم جهة الطوارئ')
  assert.equal(payload.payloadValueLabel('gender', 'female'), 'أنثى')
  assert.equal(payload.payloadValueLabel('emergencyRelation', 'sibling'), 'أخ/أخت')
  assert.equal(payload.payloadValueLabel('emergencyRelation', 'أب'), 'أب')
  // رقم الهوية نص (حروف وشرطة) مش رقم، وانتهاء الجواز تاريخ
  assert.equal(payload.payloadFieldKind('nationalId'), 'text')
  assert.equal(payload.payloadFieldKind('passportExpiry'), 'date')
  assert.equal(payload.payloadFieldKind('birthDate'), 'date')
  // الخيارات في نموذج «الطلبات» العام بالعربي
  const requestsPage = read('src/app/requests/page.tsx')
  assert.ok(requestsPage.includes("male: 'ذكر', female: 'أنثى', spouse: 'زوج/زوجة', parent: 'أب/أم', sibling: 'أخ/أخت', child: 'ابن/ابنة', other: 'أخرى'"))
})

test('phone layout: the header wraps, the tabs scroll inside their own strip and the grids stack at ~390px', () => {
  assert.ok(page.includes('<div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">'))
  assert.ok(page.includes('<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6">'))
  assert.ok(page.includes('<div className="flex gap-2 overflow-x-auto pb-1">'))
  assert.ok(page.includes('shrink-0 whitespace-nowrap ${'))
  assert.equal((page.match(/grid grid-cols-1 lg:grid-cols-2 gap-6/g) || []).length, 2)
  assert.ok(page.includes('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'))
  // مفيش شبكة ثابتة الأعمدة في الصفحة غير الكروت الأربعة (صفين على الموبايل)
  assert.doesNotMatch(page, /"grid grid-cols-(3|4) /)
  // القيم الطويلة (البريد والآيبان) بتتكسر بدل ما توسّع الصفحة
  assert.ok(page.includes('<span className="font-medium text-gray-800 min-w-0 break-all" dir="ltr">'))
  // النافذة نفسها بتتمرر جواها على الشاشة الضيقة
  assert.ok(page.includes('className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-xl"'))
  assert.ok(page.includes('<div className="p-4 sm:p-6 overflow-y-auto space-y-6">'))
})
