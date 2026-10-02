'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
const fixture=require('./codex-review-round23-fixture.cjs')
let f,A,B,manager,employee,foreign,unlinked,hr,structural,types={}
const period=new Date().toLocaleDateString('en-CA').slice(0,7),today=new Date().toLocaleDateString('en-CA')
before(async()=>{
  f=await fixture('r23_previews')
  A=await f.repo('Branch').save({code:'R23-A',name:'فرع الاختبار'});B=await f.repo('Branch').save({code:'R23-B',name:'فرع محجوب'})
  const person=(code,branch,extra={})=>f.repo('Employee').save({employeeCode:code,fullName:code,branchId:branch.id,joinDate:'2020-01-01',status:'active',isActive:true,basicSalary:9000,payMethod:'cash',...extra})
  manager=await person('R23-MANAGER',A);employee=await person('R23-EMPLOYEE',A,{managerEmployeeId:manager.id});foreign=await person('R23-FOREIGN-SECRET',B)
  const account=(code,permissions,extra={})=>f.repo('User').save({email:`${code}@r23.invalid`,displayName:code,role:'employee',branchId:A.id,passwordHash:'test-only',permissions:JSON.stringify(permissions),...extra})
  unlinked=await account('unlinked',[]);hr=await account('hr',['deductions.manage','bonuses.manage'],{role:'hr_manager'});structural=await account('manager',[],{employeeId:manager.id})
  await f.setting('payroll.salary_evidence_mode','MONTHLY_HISTORY_OR_CURRENT_FILE')
  for(const kind of ['bonuses','deductions']){
    types[kind]={}
    for(const [key,scopes,active] of [['hr',['HR'],true],['inactive',['HR'],false],['structural',['DIRECT_MANAGER'],true]]){
      types[kind][key]=await f.ok('POST',`/${kind}/types`,{code:`R23_${kind.toUpperCase()}_${key.toUpperCase()}`,nameAr:`تعريف ${kind} ${key}`,calcMethod:'FIXED_AMOUNT',creatorScopes:scopes,approvalSteps:['HR'],escalationDays:null,isActive:active,...(kind==='deductions'?{category:'PERFORMANCE'}:{})})
    }
  }
},{timeout:120000})
after(async()=>{if(f)await f.close()})
const input=(kind,type,ids=[employee.id])=>({[kind==='bonuses'?'bonusTypeId':'deductionTypeId']:type.id,inputValue:'77.77',reason:'اختبار مستقل لحدود محتوى رد المعاينة',targetPeriod:period,...(kind==='deductions'?{incidentDate:today}:{}),selection:{mode:'EMPLOYEES',ids}})

test('CR23 preview and stale bulk protect both inactive and outside-basis definitions from unlinked and structural users',async t=>{
  let refused=0
  for(const kind of ['bonuses','deductions'])for(const type of [types[kind].hr,types[kind].inactive])for(const user of [unlinked,structural])for(const action of ['preview','bulk']){
    const r=await f.request('POST',`/${kind}/${action}`,{...input(kind,type),...(action==='bulk'?{previewHash:'0'.repeat(64)}:{})},user)
    assert.equal(r.status,403,JSON.stringify(r.body));assert.equal(r.body.code,kind==='bonuses'?'BONUS_OUT_OF_SCOPE':'DEDUCTION_OUT_OF_SCOPE')
    assert.deepEqual(Object.keys(r.body).sort(),['code','message']);refused++
  }
  for(const kind of ['bonuses','deductions'])for(const action of ['preview','bulk']){
    const r=await f.request('POST',`/${kind}/${action}`,{...input(kind,types[kind].inactive),...(action==='bulk'?{previewHash:'0'.repeat(64)}:{})},hr)
    assert.equal(r.status,400);assert.match(r.body.code,/TYPE_INACTIVE$/)
  }
  t.diagnostic(JSON.stringify({case:'definition-response-matrix',outsideBasis403:refused,authorizedInactive400:4}))
})

test('CR23 allowed HR without employeeId and structural manager retain correct preview money and foreign rows are anonymous',async t=>{
  for(const kind of ['bonuses','deductions']){
    const active=await f.ok('POST',`/${kind}/preview`,input(kind,types[kind].hr),hr)
    assert.equal(active.rows[0].amount,'77.77');assert.equal(active.totals.totalAmount,'77.77')
    const managerView=await f.ok('POST',`/${kind}/preview`,input(kind,types[kind].structural,[employee.id,foreign.id,999999]),structural)
    assert.equal(managerView.totals.totalAmount,'77.77')
    for(const row of managerView.rows.filter(r=>r.employeeId!==employee.id)){assert.equal(row.fullName,null);assert.equal(row.employeeCode,null);assert.match(row.status,/OUT_OF_SCOPE$/)}
    assert.ok(!JSON.stringify(managerView).includes(foreign.fullName))
    const saved=await f.ok('POST',`/${kind}/bulk`,{...input(kind,types[kind].hr),previewHash:active.previewHash},hr)
    const obligations=await f.repo('EmployeeObligation').findBy({employeeId:employee.id,type:kind==='bonuses'?'CREDIT':'DEBIT'})
    assert.equal(obligations.length,1);assert.equal(Number(obligations[0].amount),77.77)
    t.diagnostic(JSON.stringify({case:'authorized-financial-preview',kind,amount:77.77,obligationCount:1,bulkStatus:saved.status??'returned',foreignNameHidden:true}))
  }
})
