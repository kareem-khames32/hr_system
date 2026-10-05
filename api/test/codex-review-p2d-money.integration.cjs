'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),setup=require('./codex-review-p2d-support.cjs')
test('P2A payroll outbox and audit failure roll back actual approval; all four money scenarios equal committed phase 1',async t=>{
 const f=await setup('p2a_money')
 try{
  const sa=await f.repo('Branch').save({code:'P2A-SA',name:'P2A Saudi',country:'SA',insuranceSystem:'SAUDI'}),eg=await f.repo('Branch').save({code:'P2A-EG',name:'P2A Egypt',country:'EG',insuranceSystem:'EGYPTIAN'})
  const scenarios=[{name:'none',salary:6000,branch:f.A,extra:{housingAllowance:1000,workPressureAllowance:400}},{name:'egypt-high',salary:20000,branch:eg,extra:{nationality:'مصري',isGosiRegistered:true}},{name:'egypt-low',salary:2000,branch:eg,extra:{nationality:'مصري',isGosiRegistered:true}},{name:'saudi-old',salary:6000,branch:sa,extra:{nationality:'سعودي',isGosiRegistered:true,housingAllowance:1500}}],employees=[]
  for(const s of scenarios){const e=await f.employee(s.salary,s.branch,{bankName:'P1 synthetic bank',...s.extra});employees.push(e);await f.repo('AttendanceExemption').save({employeeId:e.id,effectiveFrom:'2020-01-01',effectiveTo:'2031-12-31',reasonCode:'field_role',reason:'P1 controlled payroll fixture',status:'APPROVED',createdByUserId:f.admin.id,approvedByUserId:f.admin.id,approvedAt:new Date('2020-01-01T08:00:00Z'),requiresCheckinForPresence:false})}
  await f.ok('POST','/obligations',{employeeId:employees[0].id,type:'CREDIT',amount:123.45,label:'P1 ordinary credit',category:'allowance',effectiveDate:'2026-11-01'})
  await f.repo('EmployeeObligation').save({employeeId:employees[0].id,type:'DEBIT',amount:67.89,label:'P1 existing debit',category:'other',effectiveDate:'2026-11-01',status:'PENDING'})
  const run=await f.draft('P1 default controls',employees.map(e=>e.id),'2026-11');await f.calculate(run);await f.ready(run)
  const snapshot=async()=>({run:await f.repo('PayrollRun').findOneByOrFail({id:run.id}),items:await f.repo('PayrollItem').find({where:{runId:run.id},order:{id:'ASC'}}),obligations:await f.repo('EmployeeObligation').find({order:{id:'ASC'}}),events:await f.repo('PayrollRunEvent').find({where:{runId:run.id},order:{id:'ASC'}}),audit:await f.ds.query('SELECT * FROM [audit_log] ORDER BY id'),outbox:await f.ds.query('SELECT * FROM [outbox_events] ORDER BY id')})
  const controls=[]
  for(const [table,field,value] of [['outbox_events','eventType','PAYROLL_RUN_APPROVED'],['audit_log','action','APPROVED']]){
   const before=await snapshot();await f.ds.query(`CREATE TRIGGER [codex_p2a_fail_finance] ON [${table}] AFTER INSERT AS BEGIN SET NOCOUNT ON; IF EXISTS(SELECT 1 FROM inserted WHERE [${field}]=N'${value}') THROW 59002,N'P2A deliberate financial event failure',1; END`)
   let reply;try{reply=await f.request('POST',`/payroll/runs/${run.id}/approve`,{},f.approver)}finally{await f.ds.query('DROP TRIGGER [codex_p2a_fail_finance]')}
   assert.equal(reply.status,500);assert.deepEqual(await snapshot(),before,table+' failure must revert entire payroll approval')
   controls.push({failedTable:table,status:reply.status,allFinancialAndEventRowsUnchanged:true})
  }
  await f.pay(run)
  const rows=await f.repo('PayrollItem').find({where:{runId:run.id},order:{employeeId:'ASC'}}),keys=f.repo('PayrollItem').metadata.columns.filter(c=>c.type==='decimal').map(c=>c.propertyName).sort()
  const result={variant:'current',rows:rows.map((row,i)=>({scenario:scenarios[i].name,amounts:Object.fromEntries(keys.filter(k=>k in row).map(k=>[k,Number(row[k])])),socialInsurance:(()=>{const s=JSON.parse(row.breakdown||'{}').socialInsurance;return s?Object.fromEntries(['insuredSalary','employeePct','employerPct','employeeShare','employerShare'].map(k=>[k,Number(s[k])])):null})()})),totalNet:Number((await f.repo('PayrollRun').findOneByOrFail({id:run.id})).totalNet),status:'PAID'}
  assert.deepEqual(result,require('./codex-review-p1-money-current.cjs'));assert.equal(result.totalNet,34236.56)
  assert.equal((await f.ds.query(`SELECT COUNT(*) n FROM [outbox_events] WHERE [eventType]=N'PAYROLL_RUN_APPROVED' AND [entityId]=@0`,[String(run.id)]))[0].n,1)
  fs.writeFileSync(path.join(__dirname,'codex-review-p2d-money-evidence.cjs'),'module.exports = '+JSON.stringify({result,controls},null,2)+'\n')
  t.diagnostic(JSON.stringify({case:'P2A-money',totalNet:result.totalNet,net:rows.map(r=>Number(r.netPay)),allDecimalColumnsEqualPhase1:true,controls}))
 }finally{await f.close()}
},{timeout:240000})
