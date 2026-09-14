// S28 — تلميح «صباح اليوم التالي» لبصمات الوردية الليلية المخزنة في صف يوم البداية (دخولًا وانصرافًا). بلا خادم.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true, compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const React = require('../../node_modules/react')
const { renderToStaticMarkup } = require('../../node_modules/react-dom/server')
const { nextDayPunchFields, isNextDayCheckout, NextDayCheckoutHint } = require('../../src/components/NextDayCheckoutHint')
const night = (checkIn, checkOut, shift = ['20:00', '01:00']) => ({ shiftStart: shift[0], shiftEnd: shift[1], checkIn, checkOut })

test('بصمات الليلة بعد منتصف الليل تُعلَّم صباح الغد، ومساء يوم البداية لا', () => {
  for (const [day, expected] of [
    [night('20:10', '00:50'), { checkIn: false, checkOut: true }],
    [night('00:30', '01:00'), { checkIn: true, checkOut: true }], // E1: الدخول والانصراف كلاهما بعد منتصف الليل
    [night('20:10', '02:30'), { checkIn: false, checkOut: true }],
    [night('19:50', '21:00'), { checkIn: false, checkOut: false }],
    [night(null, '00:50'), { checkIn: false, checkOut: true }],
    [night(null, '15:00'), { checkIn: false, checkOut: false }],
    [night('00:30', null), { checkIn: true, checkOut: false }],
    [night('08:00', '12:00'), { checkIn: false, checkOut: false }],
    [night('08:00', '00:40'), { checkIn: false, checkOut: true }],
    [night('22:05', '06:30', ['22:00', '06:00']), { checkIn: false, checkOut: true }],
    [night('09:00', '18:00', ['09:00', '18:00']), { checkIn: false, checkOut: false }],
    [night('00:30', '01:00', [null, '01:00']), { checkIn: false, checkOut: false }],
  ]) assert.deepEqual(nextDayPunchFields(day), expected, JSON.stringify(day))
  assert.equal(isNextDayCheckout(night('20:10', '00:50')), true)
})

test('المكون يعرض التلميح للحقل المطلوب فقط، والشاشات الثلاث تمرره للدخول والانصراف', () => {
  const render = props => renderToStaticMarkup(React.createElement(NextDayCheckoutHint, props))
  assert.match(render({ day: night('00:30', '01:00'), field: 'checkIn' }), /صباح اليوم التالي/)
  assert.match(render({ day: night('00:30', '01:00') }), /صباح اليوم التالي/)
  assert.equal(render({ day: night('20:10', '00:50'), field: 'checkIn' }), '')
  for (const page of ['attendance/page.tsx', 'attendance/monthly-sheet/page.tsx', 'my/attendance/page.tsx']) {
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'app', page), 'utf8')
    assert.match(source, /NextDayCheckoutHint day=\{\w+\} field="checkIn"/, page)
    assert.match(source, /NextDayCheckoutHint day=\{\w+\} \/>/, page)
  }
})
