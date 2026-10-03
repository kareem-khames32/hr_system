'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),setup=require('./codex-review-round42-support.cjs')
let f,reader,stayer,mover,oldRun,newRun,reversal,owner,items,restored
const reason='دورة مستقلة للتحقق من حجب كل موظف بفترات مسيراته',oldPeriod='2026-07',period='2026-11'
before(async()=>{
 f=await setup('r42_mixed');reader=await f.actor('r42-reader',['payroll.view','reports.view'])
 const department=await f.repo('Department').save({name:'CR42 department A',branchId:f.A.id})
 stayer=await f.employee(6000,f.A,{bankName:'CR42 bank'});mover=await f.employee(9000,f.B,{bankName:'CR42 bank'})
 for(const e of [stayer,mover])await f.repo('AttendanceExemption').save({employeeId:e.id,effectiveFrom:'2020-01-01',effectiveTo:'2031-12-31',reasonCode:'field_role',reason,status:'APPROVED',createdByUserId:f.admin.id,approvedByUserId:f.admin.id,approvedAt:new Date('2020-01-01T08:00:00Z'),requiresCheckinForPresence:false})
 const credits=[]
 for(const [e,amount] of [[stayer,11.11],[mover,22.22]])credits.push(await f.ok('POST','/obligations',{employeeId:e.id,type:'CREDIT',amount,label:'CR42 allowance '+e.employeeCode,category:'allowance',effectiveDate:'2026-07-01'}))
 oldRun=await f.draft('CR42 mixed July',[stayer.id,mover.id]);await f.calculate(oldRun);await f.pay(oldRun)
 assert.equal(Number((await f.repo('PayrollRun').findOneByOrFail({id:oldRun.id})).totalNet),15033.33)
 reversal=await f.reverse(oldRun,[stayer.id,mover.id]);assert.equal(Number((await f.repo('PayrollRun').findOneByOrFail({id:reversal.id})).totalNet),-15033.33)
 restored=new Map();for(const credit of credits){const row=await f.repo('EmployeeObligation').findOneByOrFail({payrollReversalOfObligationId:credit.id});assert.ok(row.label.includes('مسير '+oldPeriod));restored.set(row.employeeId,row)}
 const c=await f.ok('GET','/attendance/calendar-context?scope=EMPLOYEE&sourceId='+mover.id)
 await f.ok('PATCH','/employees/'+mover.id,{branchId:f.A.id,departmentId:department.id,teamId:null,calendarChange:{effectiveFrom:new Date().toLocaleDateString('en-CA'),reason,expectedRevision:c.revision,expectedCurrentSourceHash:c.currentSourceHash}})
 newRun=await f.draft('CR42 visible November',[stayer.id,mover.id],period);await f.calculate(newRun);await f.pay(newRun)
 items=new Map((await f.repo('PayrollItem').findBy({runId:newRun.id})).map(row=>[row.employeeId,row]))
 assert.equal(Number(items.get(stayer.id).netPay),6011.11);assert.equal(Number(items.get(mover.id).netPay),9022.22)
 assert.equal(Number((await f.repo('PayrollRun').findOneByOrFail({id:newRun.id})).totalNet),15033.33)
 owner=await f.actor('r42-owner',[],f.A,{employeeId:mover.id})
 assert.equal((await f.request('GET','/payroll/runs/'+oldRun.id,null,reader)).status,403)
 assert.equal((await f.request('GET','/payroll/runs/'+newRun.id,null,reader)).status,200)
},{timeout:240000})
after(async()=>{if(f)await f.close()})
async function state(){return {runs:await f.repo('PayrollRun').find({order:{id:'ASC'}}),items:await f.repo('PayrollItem').find({order:{id:'ASC'}}),obligations:await f.repo('EmployeeObligation').find({order:{id:'ASC'}}),events:await f.repo('PayrollRunEvent').find({order:{id:'ASC'}})}}
const lineFor=(lines,e)=>lines.find(row=>Number(row.amount)===(e.id===stayer.id?11.11:22.22))
test('CR42 mixed reader: each employee keeps only authorized historical text and stable row-column keys across four line readers',{timeout:90000},async t=>{
 const before=await state(),routes={table:'/payroll/runs/'+newRun.id+'/lines',month:'/payroll/overview/lines?period='+period,review:'/payroll/approval-chain/runs/'+newRun.id+'/review'},views={}
 for(const [name,url] of Object.entries(routes))views[name]=await f.ok('GET',url,null,reader)
 const observations=[]
 for(const e of [stayer,mover]){
  const expected=e.id===stayer.id?restored.get(e.id).label:restored.get(e.id).label.replace('مسير '+oldPeriod,'مسير خارج نطاق صلاحيتك')
  const slip=await f.ok('GET','/payroll/items/'+items.get(e.id).id,null,reader),base=lineFor(slip.lines.earnings,e)
  assert.equal(base.name,expected)
  for(const [name,view] of Object.entries(views)){
   const row=view.rows.find(row=>row.employeeId===e.id),line=lineFor(name==='review'?row.earningLines:row.earnings,e)
   assert.deepEqual(line,base,name+' same line as the employee payslip')
   if(name!=='review')assert.equal(view.columns.earnings.filter(col=>col.key===line.key&&col.name===line.name).length,1)
   assert.equal(Number(name==='review'?row.net:row.totals.net),Number(items.get(e.id).netPay))
  }
  const company=await f.ok('GET','/payroll/items/'+items.get(e.id).id);assert.equal(lineFor(company.lines.earnings,e).name,restored.get(e.id).label)
  observations.push({employee:e.id,hidden:e.id===mover.id,name:base.name,key:base.key,net:Number(items.get(e.id).netPay)})
 }
 assert.equal(views.table.rows.reduce((n,row)=>n+Math.round(row.totals.net*100),0),1503333)
 const own=await f.ok('GET','/payroll/items/'+items.get(mover.id).id,null,owner),company=await f.ok('GET','/payroll/items/'+items.get(mover.id).id)
 assert.deepEqual(own.lines,company.lines)
 const detail=await f.ok('GET','/payroll/runs/'+newRun.id,null,reader);assert.equal(detail.items.length,2)
 const financial=await f.ok('GET','/reports/financial/payroll-register?period='+period,null,reader);assert.equal(financial.rows.length,2)
 const fullFinancial=await f.ok('GET','/reports/financial/payroll-register?period='+period)
 for(const e of [stayer,mover]){
  const row=financial.rows.find(row=>row.employeeId===e.id),full=fullFinancial.rows.find(row=>row.employeeId===e.id)
  const expected=e.id===stayer.id?restored.get(e.id).label:restored.get(e.id).label.replace('مسير '+oldPeriod,'مسير خارج نطاق صلاحيتك')
  assert.equal(lineFor(row.lines,e).label,expected,'financial register safety net is per employee')
  assert.equal(lineFor(full.lines,e).label,restored.get(e.id).label,'company register retains full text')
  assert.equal(Number(row.net),Number(items.get(e.id).netPay));assert.equal(row.net,full.net)
 }
 assert.deepEqual(await state(),before)
 t.diagnostic(JSON.stringify({case:'CR42-mixed-real-cycle',oldRunRead:403,newRunRead:200,observations,net:15033.33,reversal:-15033.33,companyAndOwnerFullText:true,storedUnchanged:true}))
})

test('CR42 query variants and client-supplied nested text do not become an employee payroll context',{timeout:90000},async t=>{
 const before=await state(),url='/payroll/items/'+items.get(mover.id).id,plain=await f.ok('GET',url,null,owner)
 const variants=['?employeeId='+stayer.id,'?employeeId=2147483647','?employeeId='+stayer.id+'&employeeId='+mover.id,'?employee[id]='+stayer.id,'?employeeId='+stayer.id+'&employeeIds='+stayer.id]
 for(const query of variants)assert.deepEqual(await f.ok('GET',url+query,null,owner),plain,query)
 // The response walker must not parse attacker-controlled JSON strings as employee context.
 const {responseEmployeeIds,scrubResponseRunPeriods}=require('../src/payroll/hidden-run-periods.interceptor')
 const payload=JSON.stringify({note:{employeeId:stayer.id,label:'مسير 2026-07'}}),wire={requester:{employeeId:mover.id},payload}
 assert.deepEqual([...responseEmployeeIds(wire)],[mover.id])
 assert.deepEqual(scrubResponseRunPeriods(wire,new Map([[stayer.id,new Set(['2026-07'])]])),wire)
 assert.deepEqual(await state(),before)
 t.diagnostic(JSON.stringify({case:'CR42-context-controls',queryVariants:variants.length,identicalSelfResponses:true,untrustedSerializedPayloadNotParsed:true,storedUnchanged:true}))
})
