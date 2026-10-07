'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict');let f
const latch=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve}}
const bounded=async(p,label)=>{let timer;try{return await Promise.race([p,new Promise((_,r)=>timer=setTimeout(()=>r(new Error(label)),25000))])}finally{clearTimeout(timer)}}
before(async()=>{f=await require('./codex-review-p2x-employment-fixture.cjs')('p2x_lock_order')},{timeout:180000})
after(async()=>{if(f)await f.close()})
test('P2X characterize bank approval versus suspension lock order, including the previous unlocked-read behavior',async t=>{
 const {Repository}=require('../node_modules/typeorm'),service=f.app.get(require('../src/employees/employees.service').EmployeesService)
 const outcomes=[]
 for(const oldRead of [false,true]){
  const emp=await f.employee(),owner=await f.account(emp)
  const type=await f.repo('RequestType').save({code:'P2X_BANK_'+String(oldRead),nameAr:'Synthetic bank request',category:'financial',destinationHandler:'payroll_bank_secure',isActive:true})
  const req=await f.repo('Request').save({typeCode:type.code,definitionCode:type.code,requesterId:emp.id,createdByUserId:owner.id,branchId:f.A.id,status:'UNDER_REVIEW',currentStep:1,
   resolvedSteps:JSON.stringify([{stepOrder:1,role:'hr',approverEmployeeId:null}]),payload:JSON.stringify({iban:'SA4420000001234567891234',bankName:'Synthetic bank',reason:'Synthetic concurrent update'})})
  const overlap=service.assertNoLeaveOverlap,find=Repository.prototype.findOne,employeeHeld=latch(),employeeRead=latch(),release=latch();let suspension,approval,hit=false,armed=false,sqlError=null
  service.assertNoLeaveOverlap=async function(em,id,...rest){
   if(id===emp.id){employeeHeld.resolve();await release.promise}
   try{return await overlap.call(this,em,id,...rest)}catch(e){sqlError=e.number??e.driverError?.number??e.driverError?.originalError?.info?.number??null;throw e}
  }
  Repository.prototype.findOne=async function(options){
   if(armed&&!hit&&this.metadata.name==='Employee'&&options?.where?.id===emp.id&&options.lock?.mode==='pessimistic_write'){
    hit=true;employeeRead.resolve();await release.promise
    if(oldRead){const {lock,...withoutLock}=options;return find.call(this,withoutLock)}
   }
   return find.call(this,options)
  }
  try{
   suspension=f.request('POST',`/employees/${emp.id}/suspensions`,{fromDate:f.year+'-11-15',toDate:f.year+'-11-16',reason:'Synthetic overlap check'},f.admin);suspension.catch(()=>{})
   await bounded(Promise.race([employeeHeld.promise,suspension.then(r=>{throw Error('Suspension did not reach barrier '+JSON.stringify(r))})]),'suspension barrier')
   armed=true;approval=f.request('POST',`/requests/${req.id}/act`,{action:'APPROVE'},f.admin);approval.catch(()=>{})
   await bounded(Promise.race([employeeRead.promise,approval.then(r=>{throw Error('Approval did not reach barrier '+JSON.stringify(r))})]),'bank barrier')
   release.resolve();const [a,b]=await bounded(Promise.all([approval,suspension]),'concurrent operations did not finish')
   const outcome={oldRead,approval:a.status,suspension:b.status,sqlError,request:(await f.repo('Request').findOneByOrFail({id:req.id})).status};outcomes.push(outcome)
   assert.equal(sqlError,1205,'Verify the observed 500 is a SQL deadlock, not another failure')
   assert.ok([a.status,b.status].every(s=>s===201||s===500),JSON.stringify({a,b}))
  }finally{release.resolve();await Promise.allSettled([approval,suspension].filter(Boolean));service.assertNoLeaveOverlap=overlap;Repository.prototype.findOne=find}
 }
 t.diagnostic(JSON.stringify({case:'bank-suspension-lock-order',outcomes}))
 // This characterizes whether the new read lock introduces a new failure, without changing product files.
 assert.deepEqual(outcomes.map(o=>[o.approval,o.suspension].sort()),[[201,500],[201,500]])
})
