'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),setup=require('./codex-review-round39-support.cjs')
let f
before(async()=>{f=await setup('r39_bonus')},{timeout:180000})
after(async()=>{if(f)await f.close()})
test('CR39 paid bonus: hide foreign applied period in payout/obligations/status while own, company and allowed branch retain it',{timeout:180000},async t=>{
 const reason='ضابط مستقل لإخفاء فترة صرف المكافأة دون تغيير المال',employee=await f.employee(9000,f.B,{bankName:'CR39 bonus bank'})
 await f.repo('AttendanceExemption').save({employeeId:employee.id,effectiveFrom:'2020-01-01',effectiveTo:'2031-12-31',reasonCode:'field_role',reason,status:'APPROVED',createdByUserId:f.admin.id,approvedByUserId:f.admin.id,approvedAt:new Date('2020-01-01T08:00:00Z'),requiresCheckinForPresence:false})
 const reader=await f.actor('r39-bonus-reader',['payroll.view','bonuses.view','bonuses.manage','bonuses.approve','approve.hr']),allowed=await f.actor('r39-bonus-b',['payroll.view','bonuses.view','bonuses.manage','approve.hr'],f.B)
 const type=await f.ok('POST','/bonuses/types',{code:'CR39_PAID',nameAr:'مكافأة الضابط',calcMethod:'FIXED_AMOUNT',creatorScopes:['HR'],approvalSteps:['HR']})
 const bonus=await f.ok('POST','/bonuses',{employeeId:employee.id,bonusTypeId:type.id,inputValue:'123.45',targetPeriod:'2026-07',reason,confirmNotDuplicate:true});assert.equal(bonus.status,'APPROVED')
 const run=await f.draft('CR39 paid bonus B',[employee.id]);await f.calculate(run);await f.pay(run)
 assert.equal(Number((await f.repo('PayrollRun').findOneByOrFail({id:run.id})).totalNet),9123.45)
 const beforeTransfer=await f.ok('GET',`/bonuses/${bonus.id}`,null,allowed);assert.equal(beforeTransfer.statusLabel,'مصروف في مسير 2026-07');assert.equal(beforeTransfer.payout.period,'2026-07')
 const dep=await f.repo('Department').save({name:'CR39 bonus destination A',branchId:f.A.id}),c=await f.ok('GET',`/attendance/calendar-context?scope=EMPLOYEE&sourceId=${employee.id}`)
 await f.ok('PATCH',`/employees/${employee.id}`,{branchId:f.A.id,departmentId:dep.id,teamId:null,calendarChange:{effectiveFrom:new Date().toLocaleDateString('en-CA'),reason,expectedRevision:c.revision,expectedCurrentSourceHash:c.currentSourceHash}})
 const owner=await f.actor('r39-bonus-self',[],f.A,{employeeId:employee.id})
 assert.equal((await f.request('GET',`/payroll/runs/${run.id}`,null,reader)).status,403)
 const stored=async()=>({bonus:await f.repo('BonusRequest').findOneByOrFail({id:bonus.id}),obligations:await f.repo('EmployeeObligation').find({where:{bonusRequestId:bonus.id},order:{id:'ASC'}}),events:await f.repo('BonusRequestEvent').find({where:{requestId:bonus.id},order:{id:'ASC'}})})
 const before=await stored(),hidden=await f.ok('GET',`/bonuses/${bonus.id}`,null,reader),company=await f.ok('GET',`/bonuses/${bonus.id}`),mine=await f.ok('GET','/bonuses/mine',null,owner)
 const self=mine.find(row=>row.id===bonus.id);assert.ok(self)
 assert.equal(hidden.statusLabel,'مصروف');assert.equal(hidden.payout.period,null);assert.equal(hidden.payout.runId,null)
 for(const obligation of hidden.obligations){assert.equal(obligation.appliedPeriod,null);assert.equal(obligation.appliedPayrollRunId,null)}
 for(const view of [hidden,company,self])assert.equal(Number(view.paidAmount),123.45)
 for(const view of [company,self]){assert.equal(view.statusLabel,beforeTransfer.statusLabel);assert.equal(view.payout.period,'2026-07');assert.equal(view.payout.runId,run.id)}
 assert.ok(company.obligations.some(o=>o.appliedPeriod==='2026-07')) // /mine deliberately has no obligations collection.
 assert.deepEqual(await stored(),before)
 t.diagnostic(JSON.stringify({case:'bonus-payout-period-control',directForeignRead:403,hiddenStatus:hidden.statusLabel,hiddenPayout:hidden.payout,companyPayout:company.payout,selfPayout:self.payout,amount:123.45,net:9123.45,storedUnchanged:true}))
})
