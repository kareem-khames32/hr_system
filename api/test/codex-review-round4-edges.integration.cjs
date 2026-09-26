'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
let f,a,b,c,scoped,seq=0
const change={effectiveFrom:'2026-01-01',changeReason:'Independent fourth review dated rule'}
before(async()=>{
 f=await require('./codex-review-round4-fixture.cjs')('r4edges')
 ;[a,b,c]=await f.repo('Branch').save(['A','B','C'].map(code=>({name:'Review '+code,code:'R4E'+code,country:'EG'})))
 scoped=await f.repo('User').save({email:'scope@r4edges.invalid',displayName:'Review scoped',passwordHash:'fixture-only',role:'employee',branchId:a.id,scopeBranchIds:JSON.stringify([a.id,b.id]),permissions:JSON.stringify(['settings.manage','requests.view_all','employees.view','request_types.manage','approval_chains.manage'])})
 await f.setting('payroll.cycle_start_day',23);await f.setting('attendance.weekend_days','SAT')
},{timeout:120000})
after(async()=>{if(f)await f.close()})
async function employee(extra={}){return f.repo('Employee').save({employeeCode:'R4EDGE'+(++seq),fullName:'Review employee '+seq,branchId:a.id,joinDate:'2020-01-01',isActive:true,status:'active',...extra})}
async function workSchedule(rule,extra={}){return f.ok('POST','/catalogs/work-schedules',{name:'Review schedule '+(++seq),startTime:'08:00',endTime:'16:00',weekendDays:'SAT',isDefault:false,isActive:true,flexEnabled:false,weekendExceptions:rule?[rule]:[],...change,...extra})}

test('CR4 financial and calendar Saturday occurrences are checked against enumerated dates, then versioned',async t=>{
 const occurrences=['1ST','2ND','3RD','4TH','LAST','ALL'],seen=[]
 for(const basis of ['PAYROLL','CALENDAR'])for(const occurrence of occurrences){
   const dates=basis==='PAYROLL'?['2026-08-29','2026-09-05','2026-09-12','2026-09-19']:['2026-09-05','2026-09-12','2026-09-19','2026-09-26']
   const from=basis==='PAYROLL'?'2026-08-23':'2026-09-01',to=basis==='PAYROLL'?'2026-09-22':'2026-09-30'
   const s=await workSchedule({weekday:'SAT',occurrence,effect:'WORK',basis}),e=await employee({workScheduleId:s.id})
   const response=await f.ok('GET',`/attendance/working-days?from=${from}&to=${to}&employeeId=${e.id}`)
   const expected=occurrence==='ALL'?dates:[dates[occurrence==='LAST'?dates.length-1:occurrences.indexOf(occurrence)]]
   assert.deepEqual(dates.filter(d=>!response.skipped.includes(d)),expected)
   const saved=await f.repo('WorkSchedule').findOneByOrFail({id:s.id})
   if(basis==='PAYROLL'&&occurrence!=='ALL')assert.equal(JSON.parse(saved.weekendExceptions)[0].cycleStartDay,23)
   seen.push({basis,occurrence,expected})
 }
 const s=await workSchedule({weekday:'SAT',occurrence:'LAST',effect:'WORK',basis:'PAYROLL'}),e=await employee({workScheduleId:s.id})
 await f.ok('PATCH',`/catalogs/work-schedules/${s.id}`,{weekendExceptions:[{weekday:'SAT',occurrence:'ALL',effect:'WORK',basis:'PAYROLL'}],effectiveFrom:'2026-09-10',changeReason:'Review mid-month version'})
 const after=await f.ok('GET',`/attendance/working-days?from=2026-09-01&to=2026-09-20&employeeId=${e.id}`)
 assert.ok(after.skipped.includes('2026-09-05'));assert.ok(!after.skipped.includes('2026-09-12'))
 await f.setting('payroll.cycle_start_day',1)
 const history=await f.ok('GET',`/attendance-rules/WORK_SCHEDULE/${s.id}/history`)
 assert.equal(history.length,2);assert.equal(JSON.parse(history.find(v=>v.version===1).snapshot.weekendExceptions)[0].cycleStartDay,23)
 await f.setting('payroll.cycle_start_day',23)
 t.diagnostic(JSON.stringify({calendarCases:seen,midMonthVersion:true,pinnedCycleRetained:true}))
},{timeout:120000})

test('CR4 service window ignores cancelled and pre-rehire offboarding, honors actual start and archive fallback',async t=>{
 const e=await employee({joinDate:'2026-09-01',actualStartDate:'2026-09-04',archivedAt:new Date('2026-09-18T12:00:00Z'),status:'archived',isActive:false})
 await f.repo('OffboardingCase').save([{employeeId:e.id,lastWorkingDay:'2026-08-20',status:'CLOSED',terminationReason:'termination'},
  {employeeId:e.id,lastWorkingDay:'2026-09-10',status:'CANCELLED',terminationReason:'termination'}])
 const windows=await f.ok('GET','/attendance/employment-windows'),w=windows.find(x=>x.employeeId===e.id)
 assert.equal(w.from,'2026-09-04');assert.equal(w.to,'2026-09-18');assert.equal(w.toSource,'ARCHIVE')
 const shift=await f.ok('POST','/catalogs/shifts',{name:'Review clipped shift',startTime:'08:00',endTime:'16:00',...change})
 const r=await f.ok('POST','/attendance/schedule/day/bulk',{employeeIds:[e.id],dates:['2026-09-03','2026-09-04','2026-09-18','2026-09-19'],shiftId:shift.id})
 assert.equal(r.applied,2);assert.equal(r.outsideEmployment,2)
 const attendance=f.app.get(require('../src/attendance/attendance.service').AttendanceService)
 for(const date of ['2026-09-03','2026-09-19']){
  const day=await attendance.computeDay(e.id,date)
  assert.ok(day.status!=='absent'||day.outsideEmployment===true)
  assert.equal(await f.repo('AttendanceDay').countBy({employeeId:e.id,date,status:'absent'}),0)
 }
 t.diagnostic(JSON.stringify({serviceWindow:w,applied:r.applied,outside:r.outsideEmployment}))
})

test('CR4 foreign work schedule and shift history must respect branch scope',async t=>{
 const schedule=await workSchedule(null,{branchId:c.id})
 const shift=await f.ok('POST','/catalogs/shifts',{name:'Foreign review shift',startTime:'09:00',endTime:'17:00',branchId:c.id,...change})
 const probes=[]
 for(const [kind,id] of [['WORK_SCHEDULE',schedule.id],['SHIFT',shift.id]]){
  const result=await f.request('GET',`/attendance-rules/${kind}/${id}/history`,null,scoped)
  probes.push({kind,status:result.status,rows:Array.isArray(result.body)?result.body.length:null,exposesReason:Array.isArray(result.body)&&result.body.some(v=>v.reason===change.changeReason)})
 }
 t.diagnostic(JSON.stringify({probe:'foreign-rule-history',probes}))
 assert.ok(probes.every(p=>[403,404].includes(p.status)),'Foreign branch rule history was returned')
})

test('CR4 request card masks confidential records and must not reveal the new foreign organization after transfer',async t=>{
 const e=await employee({jobTitle:'Original job'})
 const type=await f.repo('RequestType').save({code:'R4E_CARD',nameAr:'Review employee card',category:'training',destinationHandler:'none',isActive:true})
 const req=await f.repo('Request').save({typeCode:type.code,definitionCode:type.code,requesterId:e.id,branchId:a.id,status:'DRAFT',payload:'{}',createdByUserId:f.admin.id})
 const initial=await f.ok('GET',`/requests/${req.id}`,null,scoped)
 if(process.env.REVIEW_BASELINE==='true')assert.equal(initial.requester,undefined);else assert.equal(initial.requester.fullName,e.fullName)
 await f.repo('RequestType').update({id:type.id},{isConfidential:true})
 const masked=await f.ok('GET',`/requests/${req.id}`,null,scoped);assert.ok(masked.requester==null);assert.ok(masked.submittedBy==null)
 await f.repo('RequestType').update({id:type.id},{isConfidential:false})
 await f.repo('Employee').update({id:e.id},{branchId:c.id,jobTitle:'Foreign current job'})
 const direct=await f.request('GET',`/employees/${e.id}`,null,scoped)
 const historic=await f.ok('GET',`/requests/${req.id}`,null,scoped)
 t.diagnostic(JSON.stringify({probe:'card-after-transfer',baseline:process.env.REVIEW_BASELINE==='true',directEmployeeStatus:direct.status,historicalRequestStatus:200,card:historic.requester??null,confidentialMasked:true}))
 assert.ok(direct.status>=400)
 assert.ok(historic.requester==null||historic.requester.jobTitle!=='Foreign current job','Historical request exposed current out-of-scope employee data')
})

test('CR4 unauthorized upper-case licence makes real self-calculated payroll approve',async t=>{
 const {PAYROLL_SELF_APPROVAL_KEY}=require('../src/payroll/payroll-run-approval')
 const branch=await f.repo('Branch').save({code:'R4SODPAY',name:'Review self approval'})
 const version=await f.policy(),e=await employee({branchId:branch.id,basicSalary:6000,housingAllowance:0,transportAllowance:0,phoneAllowance:0,otherAllowance:0,workNatureAllowance:0,payMethod:'cash',currency:'SAR'})
 const user=await f.repo('User').save({email:'payroll@r4edges.invalid',displayName:'Review calculator with settings',role:'employee',passwordHash:'fixture-only',scopeAllBranches:true,permissions:JSON.stringify(['settings.manage','payroll.view','payroll.calculate','payroll.approve','payroll.pay'])})
 const rows=[];for(let i=0;i<30;i++)rows.push({employeeId:e.id,branchId:branch.id,date:new Date(Date.UTC(2026,5,23+i)).toISOString().slice(0,10),status:'present',checkIn:'08:00',checkOut:'16:00',shiftName:'Review fixed',shiftStart:'08:00',shiftEnd:'16:00',workMinutes:480})
 await f.repo('AttendanceDay').save(rows)
 await f.setting(PAYROLL_SELF_APPROVAL_KEY,'false')
 const draft=await f.ok('POST','/payroll/runs',{name:'Review real separation',policyVersionId:version,period:'2026-07',filters:{branchIds:[branch.id]}},user)
 await f.ok('POST',`/payroll/runs/${draft.id}/calculate`,{},user)
 const before=await f.request('POST',`/payroll/runs/${draft.id}/approve`,{},user)
 assert.equal(before.status,403);assert.equal(before.body.code,'PAYRUN-STATE-003')
 const bypass=await f.request('PATCH','/settings/config',{key:PAYROLL_SELF_APPROVAL_KEY.toUpperCase(),value:'true'},user)
 assert.equal(bypass.status,200)
 await require('./fixtures/payroll-parity-reasons.cjs').writeParityReasonsBeforeApproval((u,m,r,body)=>f.request(m,r,body,u),user,'POST',`/payroll/runs/${draft.id}/approve`)
 const report=await f.ok('GET',`/payroll/runs/${draft.id}/unassigned`,null,user)
 await f.ok('POST',`/payroll/runs/${draft.id}/unassigned-ack`,{reportHash:report.reportHash},user)
 const after=await f.request('POST',`/payroll/runs/${draft.id}/approve`,{},user)
 const saved=await f.repo('PayrollRun').findOneByOrFail({id:draft.id})
 t.diagnostic(JSON.stringify({probe:'actual-self-approval',beforeStatus:before.status,beforeCode:before.body.code,uppercasePatch:bypass.status,afterStatus:after.status,savedStatus:saved.status,approvedBy:saved.approvedBy,calculator:user.id,actorHasLicence:false}))
 await f.setting(PAYROLL_SELF_APPROVAL_KEY,'false')
 assert.equal(after.status,403,'Actual run approved by its own calculator without licence permission')
},{timeout:120000})

test('CR4 live calendar priority keeps official holiday above schedule, branch and company rules',async t=>{
 const date='2026-09-19',working=await workSchedule({weekday:'SAT',occurrence:'LAST',effect:'WORK',basis:'PAYROLL'})
 const resting=await workSchedule({weekday:'SAT',occurrence:'ALL',effect:'OFF',basis:'CALENDAR'},{weekendDays:'FRI'})
 const plain=await workSchedule(null),people=await Promise.all([working,resting,plain].map(s=>employee({workScheduleId:s.id})))
 const company=await f.repo('ScheduleExceptionRule').save({name:'Review company off',weekday:'SAT',occurrence:'ALL',effect:'OFF',isActive:true})
 const branch=await f.repo('ScheduleExceptionRule').save({name:'Review branch work',weekday:'SAT',occurrence:'ALL',effect:'WORK',branchId:a.id,isActive:true})
 const isWorking=async e=>!(await f.ok('GET',`/attendance/working-days?from=${date}&to=${date}&employeeId=${e.id}`)).skipped.includes(date)
 assert.deepEqual(await Promise.all(people.map(isWorking)),[true,false,true])
 const holiday=await f.repo('PublicHoliday').save({name:'Review official holiday',date,country:'EG'})
 assert.deepEqual(await Promise.all(people.map(isWorking)),[false,false,false])
 await f.repo('PublicHoliday').delete({id:holiday.id});await f.repo('ScheduleExceptionRule').delete({id:company.id});await f.repo('ScheduleExceptionRule').delete({id:branch.id})
 const attendance=f.app.get(require('../src/attendance/attendance.service').AttendanceService)
 const shift=await f.ok('POST','/catalogs/shifts',{name:'Review work on calendar rest',startTime:'11:00',endTime:'19:00',...change})
 await f.ok('POST','/attendance/schedule/day',{employeeId:people[2].id,date,shiftId:shift.id})
 const restDay=await attendance.computeDay(people[2].id,date)
 assert.notEqual(restDay.status,'absent');assert.equal(await f.repo('AttendanceDay').countBy({employeeId:people[2].id,date,status:'absent'}),0)
 const workDay=await attendance.computeDay(people[0].id,date);assert.equal(workDay.status,'absent')
 t.diagnostic(JSON.stringify({calendarPriority:true,beforeHoliday:[true,false,true],duringHoliday:[false,false,false],shiftDoesNotCreateAbsenceOnRest:true,workScheduleAbsence:true}))
})

test('CR4 category rollback and concurrent changes keep every follower on the final mapping',async t=>{
 const chains=await f.repo('ApprovalChain').save([1,2,3].map(n=>({code:'R4ATOMIC'+n,nameAr:'Review atomic '+n,isActive:true})))
 await f.repo('ApprovalStep').save(chains.map(ch=>({chainId:ch.id,stepOrder:1,approverRole:'hr'})))
 const types=await f.repo('RequestType').save([1,2,3].map(n=>({code:'R4ATOMIC_TYPE'+n,nameAr:'Review atomic type '+n,category:'training',destinationHandler:'none',approvalChainId:chains[0].id,isActive:true})))
 await f.ok('PUT','/settings/request-categories/training/chain',{chainId:chains[0].id})
 await f.ds.query(`ALTER TABLE requests_config ADD CONSTRAINT CK_R4_CONFIG_FAILURE CHECK ([key] <> 'requests.category_chain.training' OR [value] <> '${chains[1].id}')`)
 let failure
 try{failure=await f.request('PUT','/settings/request-categories/training/chain',{chainId:chains[1].id});assert.equal(failure.status,500)
  for(const type of types)assert.equal((await f.repo('RequestType').findOneByOrFail({id:type.id})).approvalChainId,chains[0].id)
  assert.equal((await f.repo('RequestsConfig').findOneByOrFail({key:'requests.category_chain.training'})).value,String(chains[0].id))
 }finally{await f.ds.query('ALTER TABLE requests_config DROP CONSTRAINT CK_R4_CONFIG_FAILURE')}
 const concurrent=await Promise.all([
   f.request('PUT','/settings/request-categories/training/chain',{chainId:chains[1].id}),
   f.request('PUT','/settings/request-categories/training/chain',{chainId:chains[2].id}),
   f.request('POST',`/settings/request-types/${types[0].id}/customize-chain`,{})])
 assert.ok(concurrent.every(r=>r.status>=200&&r.status<300))
 const final=Number((await f.repo('RequestsConfig').findOneByOrFail({key:'requests.category_chain.training'})).value)
 for(const type of types.slice(1))assert.equal((await f.repo('RequestType').findOneByOrFail({id:type.id})).approvalChainId,final)
 const special=(await f.repo('RequestType').findOneByOrFail({id:types[0].id})).approvalChainId
 assert.ok(!chains.some(ch=>ch.id===special))
 t.diagnostic(JSON.stringify({atomicRollback:true,injectedFailure:failure.status,concurrentStatuses:concurrent.map(r=>r.status),finalMapping:final,followers:2,customTypeRetained:true}))
})
