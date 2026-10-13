'use strict'
const fs = require('node:fs'), path = require('node:path')
const originals={}
for(const file of ['payroll/payroll.service.ts','payroll/payroll-policy-snapshot.ts','payroll/payroll-item-lines.ts','requests/approver-resolver.service.ts']) {
  originals[file]=require('node:child_process').execFileSync('git',['show','cfd56bd4:api/src/'+file],{cwd:path.resolve(__dirname,'../..'),encoding:'utf8',maxBuffer:8000000})
}
fs.writeFileSync(path.join(__dirname,'codex-review-p8a-baseline.cjs'),'module.exports = '+JSON.stringify(originals)+'\n')
function fixture(source, target, tests) {
  const body = fs.readFileSync(path.join(__dirname,source+'.integration.cjs'),'utf8').split(/\r?\ntest\(/)[0]
  fs.writeFileSync(path.join(__dirname,'codex-review-p8a-'+target+'.integration.cjs'), body+'\n'+tests)
}
fixture('missing-punch-deduction','payroll',String.raw`
test('P8A-F00: off payroll calculation, policy fingerprint and slip match approved baseline',async()=>{
  const {baseline}=require('./codex-review-p8a-baseline-loader.cjs')
  const old=baseline('payroll/payroll.service.ts').PayrollService
  const current=t.app.get(require('../src/payroll/payroll.service').PayrollService)
  for(const raw of [undefined,'0','bad']) {
    if(raw!==undefined) await t.repo('RequestsConfig').save({key:'payroll.missing_punch.penalty_days',value:raw})
    const a=await require('../src/payroll/payroll-policy-snapshot').capturePayrollRunPolicySnapshot(t.ds.manager,{period:PERIOD,policyVersionId:null},admin.id)
    const b=await baseline('payroll/payroll-policy-snapshot.ts').capturePayrollRunPolicySnapshot(t.ds.manager,{period:PERIOD,policyVersionId:null},admin.id)
    delete a.capturedAt; delete b.capturedAt; assert.deepEqual(a,b)
  }
  const run=await runFor([E.off,E.clean]), beforeItems=run.items
  const original=Object.getPrototypeOf(current)
  let recalculated
  try {
    Object.setPrototypeOf(current,old.prototype)
    recalculated=t.expectStatus(await t.request(admin,'POST','/payroll/runs/'+run.id+'/recalculate',{reason:'P8A baseline comparison'}),201)
  } finally {Object.setPrototypeOf(current,original)}
  const money=['basicSalary','allowances','overtimeAmount','otherAdditions','latenessDeduction','shortfallDeduction','absenceDeduction','unpaidLeaveDeduction','loanInstallments','otherDeductions','socialInsuranceDeduction','netPay']
  for(const item of beforeItems) {
    const prev=recalculated.items.find(x=>x.employeeId===item.employeeId)
    for(const key of money) {assert.notEqual(item[key],undefined,key); assert.deepEqual(item[key],prev[key],key)}
    assert.deepEqual(JSON.parse(item.breakdown),JSON.parse(prev.breakdown))
    assert.deepEqual(lines.projectPayrollItemLines(item),baseline('payroll/payroll-item-lines.ts').projectPayrollItemLines(prev))
  }
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'P8A-F00',baseline:'cfd56bd4',items:beforeItems.length,snapshotAndHashEqual:true,breakdownAndSlipEqual:true}))
})
test('P8A-F01: late pending correction versus final payroll approval', async () => {
  t.expectStatus(await config('payroll.missing_punch.penalty_days','0.25'),200)
  t.expectStatus(await config('payroll.missing_punch.free_count','0'),200)
  const emp = await employee('P8A late correction',['2026-09-03'])
  const run = await runFor([emp])
  assert.equal(Number(itemOf(run,emp).latenessDeduction),75)
  const chain=await t.repo('ApprovalChain').save({code:'P8A_CORRECTION',nameAr:'P8A approval'})
  await t.repo('ApprovalStep').save({chainId:chain.id,stepOrder:1,approverRole:'hr',slaDays:3})
  await t.repo('RequestType').update({code:'PUNCH_CORRECTION'},{approvalChainId:chain.id,requiredFields:JSON.stringify(['date','punchType','time','reason'])})
  const owner=await t.user({role:'employee',permissions:'[]',employeeId:emp.id,branchId:branch.id})
  const req=t.expectStatus(await t.request(owner,'POST','/requests',{typeCode:'PUNCH_CORRECTION',submit:true,payload:{date:'2026-09-03',punchType:'OUT',time:'17:00',reason:'P8A late correction'}}),201)
  assert.equal(req.status,'UNDER_REVIEW')
  assert.ok(req.id)
  const result = await approve(run)
  const saved = await t.repo('PayrollItem').findOneBy({runId:run.id,employeeId:emp.id})
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'P8A-F01',approval:result.status,code:result.body.code,pendingCorrection:req.id,deduction:Number(saved.latenessDeduction)}))
  assert.equal(result.status,201,'bug witness: approval must currently pass')
  assert.equal(Number(saved.latenessDeduction),75)
})
test('P8A-F02: exemption preview omits missing-punch amount that execution later drops',async()=>{
  t.expectStatus(await config('payroll.late_deduction_enabled','true'),200)
  const emp=await employee('P8A exemption estimate',['2026-09-03'])
  await t.repo('AttendanceDay').update({employeeId:emp.id,date:'2026-09-03'},{lateMinutes:30})
  const run=await runFor([emp]), before=Number(itemOf(run,emp).latenessDeduction)
  assert.ok(before>75)
  const input={runId:run.id,employeeId:emp.id,scopeKind:'DEDUCTION_TYPE',targetKind:'LATENESS',reason:'P8A documented employee attendance correction after independent management review'}
  const preview=await t.request(admin,'POST','/payroll/exemptions/preview',input)
  assert.ok([200,201].includes(preview.status),JSON.stringify(preview.body))
  const grant=t.expectStatus(await t.request(admin,'POST','/payroll/exemptions',{...input,previewHash:preview.body.previewHash}),201)
  const updated=t.expectStatus(await t.request(admin,'POST','/payroll/runs/'+run.id+'/recalculate',{reason:'P8A after approved exemption'}),201)
  const after=Number(itemOf(updated,emp).latenessDeduction)
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'P8A-F02',before,estimated:grant.estimatedAmount,after,actualDropped:before-after}))
  assert.equal(after,0)
  assert.equal(before-Number(grant.estimatedAmount),75,'bug witness: 75 was dropped without appearing in approved estimate')
})
test('P8A-F03: global lateness waiver also removes missing punch with exact slip sum',async()=>{
  const emp=await employee('P8A waived missing',['2026-09-03'])
  const run=await runFor([emp]);assert.equal(Number(itemOf(run,emp).latenessDeduction),75)
  t.expectStatus(await t.request(admin,'POST','/payroll/overview/waivers',{period:PERIOD,kind:'LATENESS',targetLevel:'employees',branchId:branch.id,employeeIds:[emp.id],reason:'P8A approved waiver'}),201)
  const updated=t.expectStatus(await t.request(admin,'POST','/payroll/runs/'+run.id+'/recalculate',{reason:'P8A after lateness waiver'}),201)
  const item=itemOf(updated,emp);assert.equal(Number(item.latenessDeduction),0)
  assert.ok(!deductionKeys(item).some(([key])=>key==='MISSING_PUNCH'))
  const slip=lines.projectPayrollItemLines(item)
  assert.equal(Math.round((slip.totals.earnings-slip.totals.deductions)*100),Math.round(Number(item.netPay)*100))
})
test('P8A-F04: missing punch respects the net floor and exact payslip cents',async()=>{
  t.expectStatus(await config('payroll.policy.min_net_guarantee','8980'),200)
  const emp=await employee('P8A net floor',['2026-09-03'])
  const run=await runFor([emp]), item=itemOf(run,emp), slip=lines.projectPayrollItemLines(item)
  assert.equal(Number(item.netPay),8980)
  assert.equal(Number(item.latenessDeduction),20)
  assert.deepEqual(deductionKeys(item),[['MISSING_PUNCH',20]])
  assert.equal(Math.round(slip.deductions.reduce((n,x)=>n+x.amount,0)*100),2000)
  assert.equal(slip.totals.net,8980)
  t.expectStatus(await config('payroll.policy.min_net_guarantee','null'),200)
})
test('P8A-F05: enabled penalty does not waive an unrelated attendance review reason',async()=>{
  const emp=await employee('P8A unrelated review',['2026-09-03'])
  await t.repo('AttendanceDay').update({employeeId:emp.id,date:'2026-09-03'},{attendanceReviewReason:'P8A unrelated schedule conflict'})
  const run=await runFor([emp]), result=await approve(run)
  assert.equal(result.status,409,JSON.stringify(result.body))
  assert.equal(result.body.code,'PAYRUN-ATTENDANCE-REVIEW')
})
`)
const mailbox=fs.readFileSync(path.join(__dirname,'mailbox.integration.cjs'),'utf8')
const anchor="app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger, abortOnError: false })"
if(!mailbox.includes(anchor))throw Error('Mailbox capture anchor missing')
fs.writeFileSync(path.join(__dirname,'codex-review-p8a-mailbox-copy.integration.cjs'),mailbox.replace(anchor,anchor+"\n  // Review harness disables the logger; restore the fixture's memory-only sink before testing secrets.\n  app.useLogger(logger); require('../node_modules/@nestjs/common').Logger.overrideLogger(logger)"))
fixture('review-evaluator','evaluator',String.raw`
test('P8A-R01: employee transferred after scope judgment before evaluator write', async () => {
  const row=await rowOf(emps.rep)
  const otherDepartment=await t.repo('Department').save({name:'P8A moved department',code:'P8A_MOVED',branchId:org.b.id})
  const calendar=t.expectStatus(await t.request(users.admin,'GET','/attendance/calendar-context?scope=EMPLOYEE&sourceId='+emps.rep.id),200)
  const calendarChange={effectiveFrom:'2026-10-01',reason:'P8A branch transfer',expectedRevision:calendar.revision,expectedCurrentSourceHash:calendar.currentSourceHash}
  const {Repository}=require('typeorm'), original=Repository.prototype.findOne
  let hit=false
  Repository.prototype.findOne=async function(options) {
    if(!hit && this.metadata.name==='Employee' && options?.where?.id===emps.senior.id && options?.lock?.mode==='pessimistic_write') {
      hit=true
      const moved=await t.request(users.admin,'PATCH','/employees/'+emps.rep.id,{branchId:org.b.id,departmentId:otherDepartment.id,calendarChange})
      console.log('REVIEW_MEASURE '+JSON.stringify({case:'P8A-R01-transfer',status:moved.status,error:moved.status!==200?moved.body:undefined}))
      t.expectStatus(moved,200)
    }
    return original.call(this,options)
  }
  let result
  try { result=await setEvaluator(users.hr,row.id,emps.senior.id) } finally { Repository.prototype.findOne=original }
  assert.equal(hit,true)
  const saved=await t.repo('ReviewAssignment').findOneBy({id:row.id})
  const subject=await t.repo('Employee').findOneBy({id:emps.rep.id})
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'P8A-R01',status:result.status,branch:subject.branchId,hrBranch:org.a.id,manager:saved.managerEmployeeId,chosen:emps.senior.id}))
  assert.equal(subject.branchId,org.b.id)
  assert.equal(result.status,200,'bug witness: stale scope currently writes')
  assert.equal(saved.managerEmployeeId,emps.senior.id)
  assert.equal((await setEvaluator(users.hr,row.id,emps.boss.id)).status,404,'fresh request correctly denied')
})
`)
fixture('meet-calls','meeting-races',String.raw`
test('P8A-M01: call closed before token issuance still yields a signed join grant',async()=>{
  await modules.enable('meet')
  const dialed=await dial(U.amal,{userId:U.basem.id})
  await ok(U.basem,call(dialed.id,'/accept'))
  const original=service.people
  let hit=false
  service.people=async function(...args) {
    if(!hit) {hit=true; await ok(U.basem,call(dialed.id,'/hangup'))}
    return original.apply(this,args)
  }
  let result
  try {result=await post(U.amal,call(dialed.id,'/token'))} finally {service.people=original}
  assert.equal(hit,true)
  assert.ok((await rowOf(dialed.id)).endedAt)
  assert.equal(result.status,200)
  const jwt=decode(result.body.token)
  assert.equal(jwt.video.roomJoin,true)
  assert.equal(jwt.exp-jwt.nbf,7200)
  const freshStatus=(await post(U.amal,call(dialed.id,'/token'))).status;assert.equal(freshStatus,410)
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'P8A-M01',ended:true,status:result.status,roomJoin:jwt.video.roomJoin,ttl:jwt.exp-jwt.nbf,freshStatus}))
})
test('P8A-M02: meeting ended before token issuance still yields a signed join grant',async()=>{
  const ms=t.app.get(require('../src/meet/meet.service').MeetService)
  const meeting=t.expectStatus(await post(U.amal,'/meet/rooms',{title:'P8A end race',inviteUserIds:[U.basem.id]}),201)
  const original=ms.people; let hit=false
  ms.people=async function(...args){
    if(!hit){hit=true;await ok(U.amal,'/meet/rooms/'+meeting.id+'/end')}
    return original.apply(this,args)
  }
  let result
  try { result=await post(U.basem,'/meet/rooms/'+meeting.id+'/token') }finally{ms.people=original}
  assert.equal(hit,true); assert.equal(result.status,200)
  assert.equal(decode(result.body.token).video.roomJoin,true)
  const freshStatus=(await post(U.basem,'/meet/rooms/'+meeting.id+'/token')).status;assert.equal(freshStatus,410)
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'P8A-M02',ended:true,status:result.status,roomJoin:true,freshStatus}))
})
`)
