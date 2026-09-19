// اختيار الوقت من قائمة كل ربع ساعة بدل الكتابة الحرة في نموذج الطلبات (الإذن من/إلى ووقت تصحيح البصمة). بلا خادم.
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
const src = file => fs.readFileSync(path.join(__dirname, '..', '..', 'src', file), 'utf8')

test('القائمة من 00:00 لـ 23:45 كل ربع ساعة بأرقام لاتيني وقيمة HH:MM', () => {
  const options = timeSelect.timeOptions()
  assert.equal(options.length, 96)
  assert.equal(options[0].value, '00:00'); assert.equal(options.at(-1).value, '23:45')
  assert.ok(options.every(o => /^\d{2}:\d{2}$/.test(o.value)))
  assert.deepEqual(options.slice(36, 41).map(o => o.value), ['09:00', '09:15', '09:30', '09:45', '10:00'])
  assert.equal(timeSelect.timeLabel('13:30'), '13:30 — 1:30 م')
  assert.equal(timeSelect.timeLabel('00:15'), '00:15 — 12:15 ص')
  assert.equal(timeSelect.timeLabel('12:00'), '12:00 — 12:00 م')
  assert.ok(options.every(o => !/[٠-٩]/.test(o.label)), 'مفيش أرقام هندي')
})

test('وقت قديم خارج الربع ساعة (مسودة 09:07 أو 9:07) يفضل ظاهر ومختار ومايضيعش', () => {
  assert.equal(timeSelect.normalizeTime('9:07'), '09:07')
  assert.equal(timeSelect.normalizeTime('09:07:00'), '09:07')
  assert.equal(timeSelect.normalizeTime('25:00'), null)
  assert.equal(timeSelect.normalizeTime(''), null)
  const options = timeSelect.timeOptions(15, '9:07')
  assert.equal(options.length, 97)
  assert.deepEqual(options.slice(36, 39).map(o => o.value), ['09:00', '09:07', '09:15'])
  const html = renderToStaticMarkup(React.createElement(TimeSelect, { value: '9:07', onChange: () => {} }))
  assert.match(html, /<option value="09:07" selected="">09:07 — 9:07 ص<\/option>/)
})

test('العنصر select بخيار فاضي والقيمة المختارة، ومن غير input نصي', () => {
  const html = renderToStaticMarkup(React.createElement(TimeSelect, { value: '17:00', onChange: () => {}, 'aria-label': 'من الساعة' }))
  assert.match(html, /^<select[^>]*aria-label="من الساعة"/)
  assert.match(html, /<option value="">— اختر الوقت —<\/option>/)
  assert.match(html, /<option value="17:00" selected="">17:00 — 5:00 م<\/option>/)
  assert.doesNotMatch(html, /<input/)
  const empty = renderToStaticMarkup(React.createElement(TimeSelect, { value: '', onChange: () => {} }))
  assert.match(empty, /<option value="" selected="">/)
  assert.doesNotMatch(empty, /value="\d\d:\d\d" selected/)
})

test('مدة الإذن في الشاشة: عادية ونص الليل ووقت ناقص', () => {
  assert.equal(timeSelect.timeSpanMinutes('09:00', '10:00'), 60)
  assert.equal(timeSelect.timeSpanMinutes('23:30', '00:30'), 60)
  assert.equal(timeSelect.timeSpanMinutes('10:00', '10:00'), 0)
  assert.equal(timeSelect.timeSpanMinutes('', '10:00'), null)
})

test('نموذج الطلبات: من/إلى ووقت البصمة بقوا قائمة، ومفيش كتابة حرة HH:MM ولا type="time"', () => {
  const page = src('app/requests/page.tsx')
  assert.match(page, /import TimeSelect, \{[^}]*\} from '@\/components\/TimeSelect'/)
  assert.doesNotMatch(page, /type="time"/)
  assert.doesNotMatch(page, /placeholder=\{[^}]*'HH:MM'/)
  assert.match(page, /\(key === 'from' \|\| key === 'to'\) &&\s*\n?\s*\(isPermission/)
  // الحقلين بيروحوا لـ TimeSelect في الفرعين: الحقول المخصصة والاستنتاج القديم (الاتنين بيعدّوا على renderSmartField)
  assert.equal((page.match(/renderSmartField\(f(\.key)?\)/g) || []).length, 2)
  const timeBranch = page.slice(page.indexOf("if (key === 'time') {"), page.indexOf("if (key === 'leaveType'"))
  assert.match(timeBranch, /<TimeSelect/)
  // وقت تصحيح البصمة كل 5 دقايق، وأوقات الإذن (من/إلى) فاضلة كل ربع ساعة
  assert.match(timeBranch, /<TimeSelect\s+value=\{tv\}[\s\S]{0,200}?stepMinutes=\{5\}[\s\S]{0,100}?\/>/)
  const permissionBranch = page.slice(page.indexOf("(key === 'from' || key === 'to') &&"), page.indexOf("if (key === 'time') {"))
  assert.match(permissionBranch, /<TimeSelect/)
  assert.doesNotMatch(permissionBranch, /stepMinutes/)
  assert.equal(timeSelect.timeOptions(5).length, 288)
  assert.deepEqual(timeSelect.timeOptions(5).slice(108, 111).map(o => o.value), ['09:00', '09:05', '09:10'])
  // الإذن: الوقتين مطلوبين قبل الإرسال والمدة محسوبة بنفس المساعد
  assert.match(page, /اختار وقت بداية ونهاية الإذن/)
  assert.match(page, /timeSpanMinutes\(from, to\)/)
})
