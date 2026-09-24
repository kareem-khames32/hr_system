'use strict'
// Reuse only the original disposable fixture and its public API helpers; independent matrix below.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict')
const filename=path.join(__dirname,'fulltest-leaves-payroll.integration.cjs')
let source=fs.readFileSync(filename,'utf8')
const original="const { test, before, after } = require('node:test')"
assert.ok(source.includes(original))
source=source.replace(original,"const { test: reviewTest, before, after } = require('node:test')\nconst test=(name,...args)=>reviewTest.skip(name,...args)")
source+=String.raw`
reviewTest('CR2 all eleven leave codes through named two-step chain and paid payroll',async t=>{
  const matrix=[]
  for(const code of ['ANNUAL','SICK','CASUAL','UNPAID','MATERNITY','PATERNITY','HAJJ','MARRIAGE','BEREAVEMENT','EXAM','COMPENSATORY']) {
    const person=await staff('matrix-'+code,'Synthetic leave '+code,[],{managerEmployeeId:mgr.id,gender:code==='MATERNITY'?'female':'male',basicSalary:6000,housingAllowance:1200,transportAllowance:600})
    await presentEveryDay(person.emp,CYCLE_FROM,CYCLE_TO)
    await require('../src/seed/seed-requests').ensureLeaveBalance(ds,person.id,21)
    const {id,submitted}=await submitRequest(person.user,'LEAVE',{leaveTypeCode:code,fromDate:'2026-10-04',toDate:'2026-10-04',days:99})
    assert.equal(submitted.status,201,code+' submit '+JSON.stringify(submitted.body))
    assert.equal(Number(JSON.parse((await detailOf(hrUser,id)).payload).days),1)
    expectStatus(await act(mgrUser,id,'APPROVE','Independent first step'),201)
    expectStatus(await act(hrUser,id,'APPROVE','Independent final step'),201)
    assert.equal((await detailOf(hrUser,id)).status,'COMPLETED')
    const rows=await repo('Leave').findBy({requestId:id});assert.equal(rows.length,1);assert.equal(Number(rows[0].days),1)
    matrix.push({code,employeeId:person.id,expected:code==='UNPAID'?7540:7800})
  }
  const run=await draft(calcUser,'Independent eleven leave codes',{employeeIds:matrix.map(r=>r.employeeId)})
  const calculated=await calcRun(calcUser,run.id)
  for(const row of matrix){const item=calculated.items.find(i=>i.employeeId===row.employeeId);assert.ok(item);assert.equal(Number(item.netPay),row.expected,row.code)}
  assert.equal(Number(calculated.totalNet),85540)
  expectStatus(await approveRun(approveUser,run.id),201)
  expectStatus(await request(approveUser,'POST','/payroll/runs/'+run.id+'/pay',{channel:'CASH',reference:'Independent eleven types'}),201)
  t.diagnostic(JSON.stringify({leaveCodes:matrix.map(({code,expected})=>({code,net:expected})),daysEach:1,chainSteps:2,expectedTotal:85540,actualTotal:Number(calculated.totalNet),finalStatus:'PAID'}))
},{timeout:600000})
`
const fixture=new Module(filename,module);fixture.filename=filename;fixture.paths=module.paths;fixture._compile(source,filename)
