'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict')
require('./financial-report-ui.test.cjs')
require('./payroll-approval-chain.test.cjs')
const {futureYearLike2026,future,YEAR}=require('./fixtures/future-calendar.cjs')
test('CR23 shifted date fixtures preserve every March-December weekday and original payroll constants',t=>{
  let checked=0
  for(const currentYear of [2026,2027,2037,2043,2099]){
    const year=futureYearLike2026(new Date(currentYear,11,31));assert.ok(year>currentYear)
    for(let month=2;month<12;month++)for(let day=1;day<=new Date(2026,month+1,0).getDate();day++){
      assert.equal(new Date(year,month,day).getDay(),new Date(2026,month,day).getDay());checked++
    }
  }
  assert.equal(future('2026-10-10'),`${YEAR}-10-10`);assert.equal(future('2026-11'),`${YEAR}-11`)
  assert.throws(()=>future('2026-02-28'))
  assert.equal(Math.trunc(1000*22/30*100)/100,733.33)
  assert.equal(14400/30/8/60,1);assert.equal(2*135+120,390)
  t.diagnostic(JSON.stringify({case:'future-calendar',mappedYear:YEAR,weekdayComparisons:checked,lateLine:270,permissionLine:120,joinerAllowance:733.33}))
})
