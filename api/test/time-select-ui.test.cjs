// حقل الوقت العادي (input type="time") في نموذج الطلبات: الإذن من/إلى ووقت تصحيح البصمة.
// المستخدم بيكتب الساعة والدقيقة وص/م بنفسه — مفيش قائمة ربع ساعة ولا تقريب. بلا خادم.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true,
  compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const React = require('../../node_modules/react')
const { renderToStaticMarkup } = require('../../node_modules/react-dom/server')
const timeSelect = require('../../src/components/TimeSelect')
const TimeSelect = timeSelect.default
// الملفات على الديسك CRLF — بنوحّدها قبل أي assert على نص المصدر
const src = file => fs.readFileSync(path.join(__dirname, '..', '..', 'src', file), 'utf8').replace(/\r\n/g, '\n')
const render = props => renderToStaticMarkup(React.createElement(TimeSelect, { onChange: () => {}, ...props }))
// الهاندلر نفسه: بننادي المكوّن كدالة عادية وناخد onChange من الـinput جوه الـdiv
const inputProps = props => TimeSelect({ onChange: () => {}, ...props }).props.children[0].props

test('حقل وقت طبيعي: type="time" من الشمال لليمين، ومفيش قائمة select/option خالص', () => {
  const html = render({ value: '17:00', 'aria-label': 'من الساعة' })
  assert.match(html, /<input type="time"/)
  assert.match(html, /dir="ltr"/)
  assert.match(html, /style="text-align:left"/)
  assert.match(html, /aria-label="من الساعة"/)
  assert.match(html, /value="17:00"/)
  assert.doesNotMatch(html, /<select/)
  assert.doesNotMatch(html, /<option/)
  // الكلاس والـid والتعطيل بيعدّوا زي ما هم للحقل نفسه
  const custom = render({ value: '', id: 'from-time', className: 'input', disabled: true })
  assert.match(custom, /<input type="time" id="from-time" class="input" disabled=""/)
})

test('stepMinutes بتتحول لثواني على الـstep بتاع الحقل', () => {
  assert.match(render({ value: '' }), /step="900"/)            // الافتراضي ربع ساعة
  assert.match(render({ value: '09:05', stepMinutes: 5 }), /step="300"/)  // وقت البصمة كل 5 دقايق
  assert.match(render({ value: '10:00', stepMinutes: 30 }), /step="1800"/)
  assert.equal(inputProps({ value: '', stepMinutes: 5 }).step, 300)
  assert.equal(inputProps({ value: '' }).step, 900)
})

test('وقت برّه الشبكة (09:07) يتقبل ويتعرض زي ما هو من غير تقريب ولا رفض', () => {
  const html = render({ value: '9:07' })
  assert.match(html, /value="09:07"/)
  assert.doesNotMatch(html, /value="09:0[05]"/, 'مفيش تقريب لأقرب ربع/خمس دقايق')
  // الخطوة بترجع لدقيقة عشان المتصفح ما يعتبرش 09:07 قيمة غلط جوه شبكة ربع ساعة
  assert.equal(inputProps({ value: '09:07' }).step, 60)
  assert.equal(inputProps({ value: '09:07', stepMinutes: 5 }).step, 60)
  // قيمة على الشبكة بتفضل بالخطوة الأصلية
  assert.equal(inputProps({ value: '09:15' }).step, 900)
})

test("عقد القيمة 'HH:MM': المتصفح لو رجّع ثواني بنقصّها، والمسح بيرجّع نص فاضي", () => {
  const got = []
  const onChange = v => got.push(v)
  const handler = TimeSelect({ value: '', onChange }).props.children[0].props.onChange
  handler({ target: { value: '09:07:00' } })
  handler({ target: { value: '09:07:30' } })
  handler({ target: { value: '17:45' } })
  handler({ target: { value: '' } })
  handler({ target: { value: '25:00' } })
  assert.deepEqual(got, ['09:07', '09:07', '17:45', '', ''])
  // القيمة الداخلة كمان بتتظبّط: '9:07' و'09:07:00' الاتنين بيبقوا '09:07'
  assert.equal(inputProps({ value: '09:07:00' }).value, '09:07')
  assert.equal(inputProps({ value: '9:07' }).value, '09:07')
  assert.equal(inputProps({ value: 'إيه ده' }).value, '')
})

test('تلميح ص/م حيّ تحت الحقل، ومفيش تلميح وهو فاضي', () => {
  assert.match(render({ value: '01:00' }), /01:00 — 1:00 ص</)
  assert.match(render({ value: '13:30' }), /13:30 — 1:30 م</)
  assert.match(render({ value: '9:07' }), /09:07 — 9:07 ص</)
  const empty = render({ value: '' })
  assert.doesNotMatch(empty, /—\s*\d+:\d+\s*[صم]/)
  assert.doesNotMatch(empty, /<p/)
  assert.ok(!/[٠-٩]/.test(render({ value: '13:30' })), 'مفيش أرقام هندي')
})

test('timeLabel و normalizeTime زي ما هما (كود واختبارات تانية بتعتمد عليهم)', () => {
  assert.equal(timeSelect.timeLabel('13:30'), '13:30 — 1:30 م')
  assert.equal(timeSelect.timeLabel('00:15'), '00:15 — 12:15 ص')
  assert.equal(timeSelect.timeLabel('12:00'), '12:00 — 12:00 م')
  assert.equal(timeSelect.normalizeTime('9:07'), '09:07')
  assert.equal(timeSelect.normalizeTime('09:07:00'), '09:07')
  assert.equal(timeSelect.normalizeTime('25:00'), null)
  assert.equal(timeSelect.normalizeTime('10:60'), null)
  assert.equal(timeSelect.normalizeTime(''), null)
  assert.equal(timeSelect.normalizeTime(null), null)
})

test('timeOptions فاضلة مُصدّرة بنفس السلوك حتى لو الحقل مابقاش بيستخدمها', () => {
  const options = timeSelect.timeOptions()
  assert.equal(options.length, 96)
  assert.equal(options[0].value, '00:00'); assert.equal(options.at(-1).value, '23:45')
  assert.ok(options.every(o => /^\d{2}:\d{2}$/.test(o.value)))
  assert.deepEqual(options.slice(36, 41).map(o => o.value), ['09:00', '09:15', '09:30', '09:45', '10:00'])
  const withExtra = timeSelect.timeOptions(15, '9:07')
  assert.equal(withExtra.length, 97)
  assert.deepEqual(withExtra.slice(36, 39).map(o => o.value), ['09:00', '09:07', '09:15'])
  assert.equal(timeSelect.timeOptions(5).length, 288)
  assert.deepEqual(timeSelect.timeOptions(5).slice(108, 111).map(o => o.value), ['09:00', '09:05', '09:10'])
})

test('مدة الإذن في الشاشة: عادية ونص الليل ووقت ناقص', () => {
  assert.equal(timeSelect.timeSpanMinutes('09:00', '10:00'), 60)
  assert.equal(timeSelect.timeSpanMinutes('23:30', '00:30'), 60)
  assert.equal(timeSelect.timeSpanMinutes('10:00', '10:00'), 0)
  assert.equal(timeSelect.timeSpanMinutes('09:00', '09:07'), 7)
  assert.equal(timeSelect.timeSpanMinutes('', '10:00'), null)
})

test('نموذج الطلبات: من/إلى ووقت البصمة كلهم على TimeSelect، ومفيش حقل نصي HH:MM بالإيد', () => {
  const page = src('app/requests/page.tsx')
  assert.match(page, /import TimeSelect, \{[^}]*\} from '@\/components\/TimeSelect'/)
  // الحقل الأصلي جوه المكوّن المشترك، مش متكرر في الصفحة
  assert.doesNotMatch(page, /<input[^>]*type="time"/)
  assert.doesNotMatch(page, /placeholder=\{[^}]*'HH:MM'/)
  assert.match(page, /\(key === 'from' \|\| key === 'to'\) &&\s*\n?\s*\(isPermission/)
  // الحقلين بيروحوا لـ TimeSelect في الفرعين: الحقول المخصصة والاستنتاج القديم (الاتنين بيعدّوا على renderSmartField)
  assert.equal((page.match(/renderSmartField\(f(\.key)?\)/g) || []).length, 2)
  const timeBranch = page.slice(page.indexOf("if (key === 'time') {"), page.indexOf("if (key === 'leaveType'"))
  assert.match(timeBranch, /<TimeSelect/)
  assert.match(timeBranch, /<TimeSelect\s+value=\{tv\}[\s\S]{0,200}?stepMinutes=\{5\}[\s\S]{0,100}?\/>/)
  const permissionBranch = page.slice(page.indexOf("(key === 'from' || key === 'to') &&"), page.indexOf("if (key === 'time') {"))
  assert.match(permissionBranch, /<TimeSelect/)
  assert.doesNotMatch(permissionBranch, /stepMinutes/)
  // الإذن: الوقتين مطلوبين قبل الإرسال والمدة محسوبة بنفس المساعد
  assert.match(page, /اختار وقت بداية ونهاية الإذن/)
  assert.match(page, /timeSpanMinutes\(from, to\)/)
  // المكوّن المشترك هو اللي فيه الحقل الحقيقي
  const comp = src('components/TimeSelect.tsx')
  assert.match(comp, /<input\s+type="time"/)
  assert.doesNotMatch(comp, /<select/)
})
