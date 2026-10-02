'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
const fixture=require('./codex-review-round24-fixture.cjs')
const {writeParityReasonsBeforeApproval}=require('./fixtures/payroll-parity-reasons.cjs')
const SAFE=['branchId','correctionReason','endDate','id','name','paidAt','parentRunId','payChannel','payReference','period','runType','startDate','status'].sort()
const period='2026-07',start='2026-06-23',end='2026-07-22'
let f,version,branch,sequence=0
const actions=[]
before(async()=>{f=await fixture('r24_mutations');version=await f.policy();branch=await f.repo('Branch').save({code:'R24-MUT',name:'فرع حالات الردود'})},{timeout:180000})
after(async()=>{if(f)await f.close()})
const actor=async(label,permissions,extra={})=>f.repo('User').save({email:label+'@r24.invalid',displayName:label,passwordHash:'test-only',role:'employee',scopeAllBranches:true,permissions:JSON.stringify(permissions),...extra})
async function employee(salary,b=branch){
 const e=await f.repo('Employee').save({employeeCode:'R24-M-'+(++sequence),fullName:'موظف راتبه محجوب '+sequence,branchId:b.id,joinDate:'2020-01-01',basicSalary:salary,housingAllowance:0,transportAllowance:0,otherAllowance:0,payMethod:'transfer',status:'active',isActive:true})
 const days=[];for(let t=Date.parse(start+'T12:00:00Z');t<=Date.parse(end+'T12:00:00Z');t+=86400000)days.push({employeeId:e.id,branchId:b.id,date:new Date(t).toISOString().slice(0,10),status:'present',checkIn:'08:00',checkOut:'16:00',shiftStart:'08:00',shiftEnd:'16:00',shiftName:'وردية ثابتة',scheduleSource:'override',workMinutes:480,lateMinutes:0,deductibleMinutes:0,earlyLeaveMinutes:0})
 await f.repo('AttendanceDay').save(days,{chunk:50});return e
}
async function checkResponse(label,response,viewer,light=false){
 const stored=await f.repo('PayrollRun').findOneByOrFail({id:response.id})
 assert.equal(response.status,stored.status)
 if(!viewer){assert.deepEqual(Object.keys(response).sort(),SAFE,label);assert.ok(!JSON.stringify(response).includes('17341.37'),label)}
 else if(light){
   assert.equal(Number(response.totalNet),Number(stored.totalNet),label)
   const expected=Object.keys(stored).filter(k=>!['parityReport','policySnapshot'].includes(k)).sort()
   assert.deepEqual(Object.keys(response).sort(),expected,label)
 }else{
   assert.ok(Array.isArray(response.items),label);assert.ok(Array.isArray(response.members),label);assert.ok('engine' in response,label)
   assert.equal(Number(response.totalNet),Number(stored.totalNet),label)
 }
 for(const key of ['parityReport','policySnapshot'])assert.ok(!(key in response),label+' '+key)
 actions.push({label,viewer,runType:stored.runType,status:stored.status,keys:Object.keys(response).length,storedTotal:Number(stored.totalNet)})
 return response
}
async function ready(runId){
 const request=(user,method,route,body)=>f.request(method,route,body,user)
 await writeParityReasonsBeforeApproval(request,f.approver,'POST',`/payroll/runs/${runId}/approve`)
 const u=await f.ok('GET',`/payroll/runs/${runId}/unassigned`)
 await f.ok('POST',`/payroll/runs/${runId}/unassigned-ack`,{reportHash:u.reportHash})
}
for(const viewer of [false,true])test(`CR24 all run mutations preserve permissions and ${viewer?'payroll viewer details':'exact 13-field operation-only responses'}`,{timeout:240000},async t=>{
 const suffix=viewer?'view':'operation',extra=viewer?['payroll.view']:[]
 const calc=await actor('calculator-'+suffix,['payroll.calculate','payroll.cancel','payroll.reopen','payroll.reverse',...extra])
 const finance=await actor('finance-'+suffix,['payroll.approve','payroll.pay',...extra])
 const employees=[await employee(6000),await employee(17341.37)],ids=employees.map(e=>e.id)
 const mutate=async(label,method,route,body,user=calc,light=false)=>{
   const response=await checkResponse(label,await f.ok(method,route,body,user),viewer,light)
   if(viewer&&!light)assert.deepEqual(response,await f.ok('GET',`/payroll/runs/${response.id}`,null,user),label+' preserves full detail contract')
   return response
 }
 let run=await mutate('create-draft','POST','/payroll/runs',{name:'دورة '+suffix,period,policyVersionId:version,filters:{employeeIds:ids}})
 if(!viewer)assert.equal((await f.request('GET',`/payroll/runs/${run.id}`,null,calc)).status,403)
 await mutate('update-draft','PATCH',`/payroll/runs/${run.id}`,{name:'دورة معدلة '+suffix})
 await mutate('calculate-draft','POST',`/payroll/runs/${run.id}/calculate`,{})
 await mutate('recalculate','POST',`/payroll/runs/${run.id}/recalculate`,{reason:'تثبيت عدم تغير إجمالي الأجر'})
 const items=await f.repo('PayrollItem').findBy({runId:run.id})
 assert.deepEqual(items.map(i=>Number(i.netPay)).sort((a,b)=>a-b),[6000,17341.37]);assert.equal(Number((await f.repo('PayrollRun').findOneByOrFail({id:run.id})).totalNet),23341.37)
 await ready(run.id)
 await mutate('approve','POST',`/payroll/runs/${run.id}/approve`,{},finance,true)
 await mutate('reopen','POST',`/payroll/runs/${run.id}/reopen`,{reason:'اختبار الاستجابة دون مبالغ'})
 await ready(run.id)
 await mutate('approve-again','POST',`/payroll/runs/${run.id}/approve`,{},finance,true)
 await mutate('pay','POST',`/payroll/runs/${run.id}/pay`,{channel:'CASH',reference:'R24-'+suffix},finance,true)
 const preview=await f.ok('POST',`/payroll/runs/${run.id}/reversal-preview`,{employeeIds:ids},calc)
 assert.equal(preview.blocked,false)
 const reversal=await mutate('create-reversal','POST',`/payroll/runs/${run.id}/reversals`,{employeeIds:ids,previewHash:preview.previewHash,reason:'تصحيح مستقل لاختبار الرد'})
 await mutate('approve-reversal','POST',`/payroll/runs/${reversal.id}/approve`,{},finance,true)
 await mutate('pay-reversal','POST',`/payroll/runs/${reversal.id}/pay`,{channel:'CASH',reference:'R24-REV-'+suffix},finance,true)
 assert.equal(Number((await f.repo('PayrollRun').findOneByOrFail({id:reversal.id})).totalNet),-23341.37)
 const supplemental=await mutate('create-supplementary','POST',`/payroll/runs/${run.id}/supplementary`,{employeeIds:ids,name:'تكميلي '+suffix,reason:'تعويض المسير المعكوس'})
 await mutate('calculate-supplementary','POST',`/payroll/runs/${supplemental.id}/calculate`,{})
 await ready(supplemental.id)
 await mutate('approve-supplementary','POST',`/payroll/runs/${supplemental.id}/approve`,{},finance,true)
 await mutate('pay-supplementary','POST',`/payroll/runs/${supplemental.id}/pay`,{channel:'CASH',reference:'R24-SUP-'+suffix},finance,true)
 assert.equal(Number((await f.repo('PayrollRun').findOneByOrFail({id:supplemental.id})).totalNet),23341.37)
 const cancelled=await mutate('create-cancel-target','POST','/payroll/runs',{name:'إلغاء '+suffix,period:'2026-08',policyVersionId:version,filters:{employeeIds:ids}})
 await mutate('cancel-draft','POST',`/payroll/runs/${cancelled.id}/cancel`,{reason:'إلغاء مسودة الاختبار'})
 // Legacy test-only entry point is still a real calculator and uses the same response policy.
 const legacyEmployee=await employee(8123.45)
 const legacy=await mutate('legacy-calculate-defined','POST','/payroll/runs/calculate-defined',{name:'قديم '+suffix,period,scopeType:'CUSTOM',employeeIds:[legacyEmployee.id]})
 await mutate('cancel-calculated','POST',`/payroll/runs/${legacy.id}/cancel`,{reason:'إنهاء حالة المسار القديم'})
 const oldBranch=await f.repo('Branch').save({code:'R24-OLD-'+suffix,name:'فرع مدخل الحساب القديم '+suffix})
 await employee(7319.17,oldBranch)
 const branchRun=await mutate('legacy-calculate-branch','POST','/payroll/runs/calculate',{branchId:oldBranch.id,period})
 await mutate('cancel-branch-calculated','POST',`/payroll/runs/${branchRun.id}/cancel`,{reason:'إنهاء مدخل حساب الفرع'})
 // create-next-period returns explicit nonmonetary references, not serialized runs.
 const next=await f.ok('POST','/payroll/runs/create-next-period',{sourcePeriod:period},calc)
 assert.ok(next.created.length>0);assert.ok(!JSON.stringify(next).includes('totalNet'));assert.ok(!JSON.stringify(next).includes('netPay'))
 t.diagnostic(JSON.stringify({case:'mutation-matrix',viewer,actions:actions.filter(a=>a.viewer===viewer),netBeforeAndAfter:23341.37,reversalTotal:-23341.37,nextDrafts:next.created.length}))
})

test('CR24 scoped operation permission cannot act on a foreign run or return identifiers in the rejection',{timeout:60000},async t=>{
 const other=await f.repo('Branch').save({code:'R24-FOREIGN',name:'فرع آخر مخفي'})
 const e=await employee(9217.61,other)
 const run=await f.ok('POST','/payroll/runs',{name:'مسير خارجي مخفي',period,policyVersionId:version,filters:{employeeIds:[e.id]}})
 const outsider=await actor('scoped-operation',['payroll.calculate','payroll.cancel','payroll.reopen','payroll.approve','payroll.pay','payroll.reverse'],{scopeAllBranches:false,branchId:branch.id})
 const responses=[]
 for(const [method,tail,body] of [['PATCH','',{name:'محاولة تغيير'}],['POST','/calculate',{}],['POST','/recalculate',{reason:'محاولة إعادة الحساب'}],['POST','/reopen',{reason:'محاولة فتح'}],['POST','/cancel',{reason:'محاولة إلغاء'}],['POST','/approve',{}],['POST','/pay',{channel:'CASH',reference:'DENIED'}]]){
  const r=await f.request(method,`/payroll/runs/${run.id}${tail}`,body,outsider)
  assert.equal(r.status,403,JSON.stringify(r.body));assert.ok(!JSON.stringify(r.body).includes(run.name));assert.ok(!JSON.stringify(r.body).includes(e.fullName));assert.ok(!JSON.stringify(r.body).includes('9217'))
  responses.push({method,tail,status:r.status})
 }
 assert.equal((await f.repo('PayrollRun').findOneByOrFail({id:run.id})).status,'DRAFT')
  t.diagnostic(JSON.stringify({case:'scope-before-state',responses,storedStatus:'DRAFT'}))
})

test('CR24 membership mutation responses cannot bypass the run read permission',{timeout:120000},async t=>{
 const first=await employee(6000),peer=await employee(17341.37),added=await employee(8123.45)
 const operator=await actor('membership-only',['payroll.calculate'],{scopeAllBranches:false,branchId:branch.id})
 const viewer=await actor('membership-viewer',['payroll.calculate','payroll.view'],{scopeAllBranches:false,branchId:branch.id})
 let run=await f.ok('POST','/payroll/runs',{name:'مسير اختبار رد العضوية',period,policyVersionId:version,filters:{employeeIds:[first.id,peer.id]}})
 run=await f.ok('POST',`/payroll/runs/${run.id}/calculate`,{})
 const denied=await f.request('GET',`/payroll/runs/${run.id}`,null,operator);assert.equal(denied.status,403)
 // The bulk request selects an existing member: it makes no membership change but must not grant read access.
 const before=await f.repo('PayrollRun').findOneByOrFail({id:run.id})
 const bulk=await f.request('POST',`/payroll/runs/${run.id}/members/bulk`,{employeeIds:[first.id],reason:'التحقق من عضو موجود بالفعل'},operator)
 assert.equal(bulk.status,201,JSON.stringify(bulk.body))
 assert.deepEqual(bulk.body.added,[]);assert.deepEqual(bulk.body.moved,[])
 const after=await f.repo('PayrollRun').findOneByOrFail({id:run.id});assert.equal(after.snapshotVersion,before.snapshotVersion)
 const single=await f.request('POST',`/payroll/runs/${run.id}/members`,{employeeIds:[added.id],reason:'ضم موظف باختبار مستقل'},operator)
 assert.equal(single.status,201,JSON.stringify(single.body))
 assert.deepEqual(single.body.added,[added.id]);assert.equal(await f.repo('PayrollItem').countBy({runId:run.id}),3)
 assert.equal(Number((await f.repo('PayrollRun').findOneByOrFail({id:run.id})).totalNet),31464.82)
 const full=await f.ok('POST',`/payroll/runs/${run.id}/members/bulk`,{employeeIds:[first.id],reason:'عرض مخول لعضو موجود'},viewer)
 assert.deepEqual(full.run,await f.ok('GET',`/payroll/runs/${run.id}`,null,viewer))
 const summarize=(kind,r)=>({kind,status:r.status,runKeys:Object.keys(r.body.run||{}),items:r.body.run?.items?.map(i=>({employeeId:i.employeeId,netPay:i.netPay})),members:r.body.run?.members?.map(m=>({employeeId:m.employeeId,name:m.snapshot?.fullName})),hasEngine:!!r.body.run?.engine})
 t.diagnostic(JSON.stringify({case:'membership-mutation-run-leak',permissions:JSON.parse(operator.permissions),getStatus:denied.status,bulkDidNotChangeMembership:true,bulk:summarize('bulk',bulk),single:summarize('single',single),storedTotal:31464.82,authorizedViewerContractMatched:true}))
 for(const r of [bulk,single])assert.deepEqual(Object.keys(r.body.run||{}).sort(),SAFE,'Membership operations must use the same limited run response as calculation')
})
