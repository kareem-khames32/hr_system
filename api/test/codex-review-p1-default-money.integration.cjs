'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{execFileSync}=require('node:child_process')
const baseline=process.env.REVIEW_BASELINE==='true',baseRoot=path.resolve(__dirname,'../../../b01s-fix'),variant=baseline?'baseline':'current'
const setup=baseline?require(path.join(baseRoot,'api/test/codex-review-round42-support.cjs')):require('./codex-review-p1-support.cjs')
let f
before(async()=>{
 if(baseline)assert.equal(execFileSync('git',['-c','safe.directory='+baseRoot.replaceAll('\\','/'),'diff','--name-only','ce15142','--','api/src','src'],{cwd:baseRoot,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim(),'')
 f=await setup('p1_money_'+variant)
},{timeout:120000})
after(async()=>{if(f)await f.close()})
test('P1 default-off money is identical to ce15142 for Egyptian Saudi and uninsured actual payrolls',{timeout:180000},async t=>{
 const period='2026-11',sa=await f.repo('Branch').save({code:'P1-SA',name:'P1 Saudi',country:'SA',insuranceSystem:'SAUDI'}),eg=await f.repo('Branch').save({code:'P1-EG',name:'P1 Egypt',country:'EG',insuranceSystem:'EGYPTIAN'})
 const scenarios=[{name:'none',salary:6000,branch:f.A,extra:{housingAllowance:1000,workPressureAllowance:400}},{name:'egypt-high',salary:20000,branch:eg,extra:{nationality:'مصري',isGosiRegistered:true}},{name:'egypt-low',salary:2000,branch:eg,extra:{nationality:'مصري',isGosiRegistered:true}},{name:'saudi-old',salary:6000,branch:sa,extra:{nationality:'سعودي',isGosiRegistered:true,housingAllowance:1500}}]
 const employees=[]
 for(const s of scenarios){
  const e=await f.employee(s.salary,s.branch,{bankName:'P1 synthetic bank',...s.extra});employees.push(e)
  await f.repo('AttendanceExemption').save({employeeId:e.id,effectiveFrom:'2020-01-01',effectiveTo:'2031-12-31',reasonCode:'field_role',reason:'P1 controlled payroll fixture',status:'APPROVED',createdByUserId:f.admin.id,approvedByUserId:f.admin.id,approvedAt:new Date('2020-01-01T08:00:00Z'),requiresCheckinForPresence:false})
 }
 // Actual credit API plus an existing pending debit fixture, no new feature enabled.
 await f.ok('POST','/obligations',{employeeId:employees[0].id,type:'CREDIT',amount:123.45,label:'P1 ordinary credit',category:'allowance',effectiveDate:'2026-11-01'})
 await f.repo('EmployeeObligation').save({employeeId:employees[0].id,type:'DEBIT',amount:67.89,label:'P1 existing debit',category:'other',effectiveDate:'2026-11-01',status:'PENDING'})
 const run=await f.draft('P1 default controls',employees.map(e=>e.id),period);await f.calculate(run);await f.pay(run)
 const rows=await f.repo('PayrollItem').find({where:{runId:run.id},order:{employeeId:'ASC'}})
 const keys=f.repo('PayrollItem').metadata.columns.filter(c=>c.type==='decimal').map(c=>c.propertyName).sort()
 const result={variant,rows:rows.map((row,i)=>({scenario:scenarios[i].name,amounts:Object.fromEntries(keys.filter(k=>k in row).map(k=>[k,Number(row[k])])),socialInsurance:(()=>{const s=JSON.parse(row.breakdown||'{}').socialInsurance;return s?Object.fromEntries(['insuredSalary','employeePct','employerPct','employeeShare','employerShare'].map(k=>[k,Number(s[k])])):null})()})),totalNet:Number((await f.repo('PayrollRun').findOneByOrFail({id:run.id})).totalNet),status:'PAID'}
 assert.deepEqual(rows.map(r=>Number(r.netPay)),[7455.56,18163,1703,6915])
 assert.equal(result.totalNet,34236.56)
 fs.writeFileSync(path.join(__dirname,`codex-review-p1-money-${variant}.cjs`),'module.exports = '+JSON.stringify(result,null,2)+'\n')
 t.diagnostic(JSON.stringify({case:'P1-default-money',...result}))
})
