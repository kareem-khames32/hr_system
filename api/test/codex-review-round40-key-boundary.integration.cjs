'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),setup=require('./codex-review-round40-support.cjs')
let f,reader,owner,employee,original,reversal,current,restored,item
const reason='اختبار مستقل لنص القيد بعد عكس مسير ثم انتقال فرع',period='2026-11'
before(async()=>{
 f=await setup('r40_payslip');reader=await f.actor('r40-reader',['payroll.view','reports.view'])
 const department=await f.repo('Department').save({name:'CR40 department A',branchId:f.A.id})
 employee=await f.employee(9000,f.B,{bankName:'CR40 fixture bank'})
 await f.repo('AttendanceExemption').save({employeeId:employee.id,effectiveFrom:'2020-01-01',effectiveTo:'2031-12-31',reasonCode:'field_role',reason,status:'APPROVED',createdByUserId:f.admin.id,approvedByUserId:f.admin.id,approvedAt:new Date('2020-01-01T08:00:00Z'),requiresCheckinForPresence:false})
 const credit=await f.ok('POST','/obligations',{employeeId:employee.id,type:'CREDIT',amount:67.89,label:'CR40 original allowance',category:'allowance',effectiveDate:'2026-07-01'})
 original=await f.draft('CR40 private July B',[employee.id]);await f.calculate(original);await f.pay(original)
 assert.equal(Number((await f.repo('PayrollRun').findOneByOrFail({id:original.id})).totalNet),9067.89)
 reversal=await f.reverse(original,[employee.id]);assert.equal(Number((await f.repo('PayrollRun').findOneByOrFail({id:reversal.id})).totalNet),-9067.89)
 restored=await f.repo('EmployeeObligation').findOneByOrFail({payrollReversalOfObligationId:credit.id});assert.equal(restored.status,'PENDING');assert.ok(restored.label.includes('مسير 2026-07'))
 const c=await f.ok('GET',`/attendance/calendar-context?scope=EMPLOYEE&sourceId=${employee.id}`)
 await f.ok('PATCH',`/employees/${employee.id}`,{branchId:f.A.id,departmentId:department.id,teamId:null,calendarChange:{effectiveFrom:new Date().toLocaleDateString('en-CA'),reason,expectedRevision:c.revision,expectedCurrentSourceHash:c.currentSourceHash}})
 owner=await f.actor('r40-owner',[],f.A,{employeeId:employee.id})
 current=await f.draft('CR40 visible November A',[employee.id],period);await f.calculate(current);await f.pay(current)
 item=await f.repo('PayrollItem').findOneByOrFail({runId:current.id,employeeId:employee.id});assert.equal(Number(item.netPay),9067.89)
 const member=await f.repo('PayrollRunMember').findOneByOrFail({runId:current.id,employeeId:employee.id});assert.equal(member.snapshot.branchId,f.A.id)
 for(const run of [original,reversal])assert.equal((await f.request('GET',`/payroll/runs/${run.id}`,null,reader)).status,403)
 assert.equal((await f.request('GET',`/payroll/runs/${current.id}`,null,reader)).status,200)
},{timeout:240000})
after(async()=>{if(f)await f.close()})
async function state(){return {item:await f.repo('PayrollItem').findOneByOrFail({id:item.id}),ledger:await f.repo('EmployeeObligation').find({where:{employeeId:employee.id},order:{id:'ASC'}}),events:await f.repo('PayrollRunEvent').find({order:{id:'ASC'}})}}
const forbidden='مسير 2026-07'
function textPaths(value,prefix='$',out=[]){
 if(typeof value==='string'){if(value.includes(forbidden))out.push({path:prefix,text:value.length<500?value:'[serialized value contains foreign period]'})}
 else if(Array.isArray(value))value.forEach((v,i)=>textPaths(v,prefix+'['+i+']',out))
 else if(value&&typeof value==='object')for(const [k,v] of Object.entries(value))textPaths(v,prefix+'.'+k,out)
 return out
}

// This decoder accepts only the string returned to the restricted reader. No DB, privileged response, or run metadata.
function periodsRecoverableFromKey(key){
 const split=key.lastIndexOf('~'),rendered=key.slice(0,split),fingerprint=key.slice(split+1)
 if(split<0||!/^[a-f0-9]{8}$/.test(fingerprint))return []
 const candidates=[]
 for(let year=2000;year<=2035;year++)for(let month=1;month<=12;month++){
  const period=year+'-'+String(month).padStart(2,'0')
  const original=rendered.split('مسير خارج نطاق صلاحيتك').join('مسير '+period)
  if(require('node:crypto').createHash('sha1').update(original).digest('hex').slice(0,8)===fingerprint)candidates.push(period)
 }
 return candidates
}
test('CR40 line rendering controls: hidden text, stable row/column keys, unchanged totals, company/self and stored history',{timeout:60000},async t=>{
 const before=await state(),url='/payroll/runs/'+current.id+'/lines'
 const branch=await f.ok('GET',url,null,reader),again=await f.ok('GET',url,null,reader),company=await f.ok('GET',url)
 const slip=await f.ok('GET','/payroll/items/'+item.id,null,reader),own=await f.ok('GET','/payroll/items/'+item.id,null,owner)
 const companySlip=await f.ok('GET','/payroll/items/'+item.id)
 assert.deepEqual(again,branch);assert.deepEqual(slip.lines,branch.rows[0].totals?{earnings:branch.rows[0].earnings,deductions:branch.rows[0].deductions,totals:branch.rows[0].totals}:null)
 for(const side of ['earnings','deductions'])for(const line of branch.rows[0][side])assert.equal(branch.columns[side].filter(col=>col.key===line.key&&col.name===line.name).length,1)
 assert.equal(branch.rows[0].totals.net,9067.89);assert.equal(branch.rows[0].totals.earnings,9067.89)
 assert.equal(JSON.stringify(branch).includes(forbidden),false);assert.equal(JSON.stringify(slip.lines).includes(forbidden),false)
 assert.deepEqual(own.lines,companySlip.lines);assert.ok(JSON.stringify(company).includes(forbidden));assert.ok(JSON.stringify(own.lines).includes(forbidden))
 assert.deepEqual(await state(),before)
 t.diagnostic(JSON.stringify({case:'line-key-rendering-controls',hiddenKeys:branch.columns.earnings.map(x=>x.key),rowColumnMapping:true,stableReads:true,net:9067.89,companySelfPreserved:true,storedUnchanged:true}))
})
for(const route of ['payslip','run-lines'])test('CR40 '+route+': a masked key must not allow recovering the hidden payroll period offline',{timeout:60000},async t=>{
 const before=await state(),url=route==='payslip'?'/payroll/items/'+item.id:'/payroll/runs/'+current.id+'/lines'
 const branch=await f.ok('GET',url,null,reader),lines=route==='payslip'?branch.lines.earnings:branch.rows[0].earnings
 const line=lines.find(x=>x.key.includes('مسير خارج نطاق صلاحيتك'));assert.ok(line)
 assert.equal(line.key.includes('2026-07'),false);assert.equal(line.name.includes('2026-07'),false)
 const decoded=periodsRecoverableFromKey(line.key)
 assert.deepEqual(await state(),before)
 t.diagnostic(JSON.stringify({case:'recover-hidden-period-from-key',route,directForeignRead:403,currentRead:200,key:line.key,readerOnlyCandidateSpace:432,decoded,net:9067.89,storedUnchanged:true}))
 assert.deepEqual(decoded,[],'The returned unkeyed digest verifies a small dictionary of hidden payroll periods')
})
for(const route of ['overview-lines','approval-review'])test('CR40 adjacent '+route+': old foreign period must not survive in another line reader',{timeout:60000},async t=>{
 const before=await state(),url=route==='overview-lines'?'/payroll/overview/lines?period='+period:'/payroll/approval-chain/runs/'+current.id+'/review'
 const branch=await f.ok('GET',url,null,reader),company=await f.ok('GET',url),leaks=textPaths(branch),companyRefs=textPaths(company)
 const row=branch.rows.find(x=>x.employeeId===employee.id);assert.ok(row)
 assert.equal(Number(route==='overview-lines'?row.totals.net:row.net),9067.89)
 assert.deepEqual(await state(),before)
 t.diagnostic(JSON.stringify({case:'adjacent-reader-foreign-period',route,url,foreignRead:403,currentRead:200,leaks,companyRefs,net:9067.89,storedUnchanged:true}))
 assert.deepEqual(leaks,[],'A visible current payroll does not authorize an embedded foreign historical payroll period')
})
