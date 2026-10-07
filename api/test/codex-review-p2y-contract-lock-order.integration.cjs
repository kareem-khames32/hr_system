'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict');let f
const latch=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve}}
const bounded=async(p,label)=>{let timer;try{return await Promise.race([p,new Promise((_,r)=>timer=setTimeout(()=>r(Error(label)),25000))])}finally{clearTimeout(timer)}}
before(async()=>{f=await require('./codex-review-p2y-employment-fixture.cjs')('p2y_contract_order')},{timeout:180000})
after(async()=>{if(f)await f.close()})
test('P2Y contract renewal and request approval complete without an unhandled lock-order failure',async t=>{
 const {EntityManager,Repository}=require('../node_modules/typeorm')
 const emp=await f.employee(),owner=await f.account(emp)
 const type=await f.repo('RequestType').save({code:'P2Y_CONCURRENT_BANK',nameAr:'Synthetic bank request',category:'financial',destinationHandler:'payroll_bank_secure',isActive:true})
 const req=await f.repo('Request').save({typeCode:type.code,definitionCode:type.code,requesterId:emp.id,createdByUserId:owner.id,branchId:f.A.id,status:'UNDER_REVIEW',currentStep:1,
  resolvedSteps:JSON.stringify([{stepOrder:1,role:'hr',approverEmployeeId:null}]),payload:JSON.stringify({iban:'SA4420000001234567891234',bankName:'Synthetic bank',reason:'Synthetic concurrent bank update'})})
 const emFind=EntityManager.prototype.findOne,repoFind=Repository.prototype.findOne,held=latch(),approvalHeld=latch(),release=latch()
 let renewal,approval,armed=false,hit=false,sqlError=null
 EntityManager.prototype.findOne=async function(target,options){
  if((target?.name??target)==='Request'&&options?.where?.requesterId===emp.id){held.resolve();await release.promise
   try{return await emFind.call(this,target,options)}catch(e){sqlError=e.number??e.driverError?.number??null;throw e}}
  return emFind.call(this,target,options)
 }
 Repository.prototype.findOne=async function(options){
  if(armed&&!hit&&this.metadata.name==='Employee'&&options?.where?.id===emp.id&&options.lock?.mode==='pessimistic_write'){
   hit=true;approvalHeld.resolve();await release.promise
  }
  return repoFind.call(this,options)
 }
 try{
  renewal=f.request('POST',`/employees/${emp.id}/contract/renew`,{contractStart:(Number(f.year)+1)+'-01-01',contractEnd:(Number(f.year)+1)+'-12-31',reason:'Synthetic concurrent renewal'},f.admin)
  await bounded(Promise.race([held.promise,renewal.then(r=>{throw Error('Renewal missed barrier '+JSON.stringify(r))})]),'renewal barrier')
  armed=true;approval=f.request('POST',`/requests/${req.id}/act`,{action:'APPROVE'},f.admin)
  await bounded(Promise.race([approvalHeld.promise,approval.then(r=>{throw Error('Approval missed barrier '+JSON.stringify(r))})]),'approval barrier')
  release.resolve();const [a,b]=await bounded(Promise.all([approval,renewal]),'operations timeout')
  t.diagnostic(JSON.stringify({case:'contract-bank-lock-order',approval:a.status,renewal:b.status,sqlError}))
  assert.deepEqual([a.status,b.status],[201,201])
 }finally{release.resolve();await Promise.allSettled([renewal,approval].filter(Boolean));EntityManager.prototype.findOne=emFind;Repository.prototype.findOne=repoFind}
})
