'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
let f,service,team
before(async()=>{
 f=await require('./codex-review-p2r-comments-fixture.cjs')('p2r_transfer')
 const department=await f.repo('Department').save({name:'Synthetic transfer department',branchId:f.B.id,managerEmployeeId:f.far.id})
 team=await f.repo('Team').save({name:'Synthetic transfer team',departmentId:department.id,leaderEmployeeId:f.far.id})
 const chain=await f.repo('ApprovalChain').save({code:'P2R_AUTO_TRANSFER',nameAr:'Synthetic auto approval',isActive:true,autoApprove:true})
 await f.repo('RequestType').save({code:'TEAM_TRANSFER',nameAr:'Synthetic transfer',category:'employment_status',destinationHandler:'transfers_effective_date',approvalChainId:chain.id,isActive:true})
 service=f.app.get(require('../src/requests/destinations.service').DestinationsService)
},{timeout:180000})
after(async()=>{if(f)await f.close()})
async function scheduled(){
 const employee=await f.employee(),user=await f.account(employee,['requests.view_all'])
 const req=await f.ok('POST','/requests',{typeCode:'TEAM_TRANSFER',payload:{employeeId:employee.id,toTeamId:team.id,effectiveDate:'2099-01-01'},submit:true})
 assert.equal(req.status,'IN_EXECUTION')
 const transfer=await f.repo('Transfer').findOneByOrFail({requestId:req.id})
 await f.repo('Transfer').update(transfer.id,{effectiveDate:'2026-10-01'})
 return{employee,user,req,transfer}
}
const events=async id=>f.ds.query("SELECT * FROM audit_log WHERE entityType=N'user' AND entityId=@0 AND action=N'USER_UPDATED' ORDER BY id",[String(id)])
test('P2R executed transfer preserves the existing USER_UPDATED audit of account branch and token revocation',async t=>{
 const x=await scheduled(),before=await events(x.user.id)
 assert.equal(await f.ds.transaction(em=>service.executeTransfer(em,x.transfer.id)),true)
 const current=await f.repo('User').findOneByOrFail({id:x.user.id});assert.equal(current.branchId,f.B.id);assert.equal(current.employeeId,x.employee.id);assert.equal(current.tokenVersion,1)
 const after=await events(x.user.id)
 t.diagnostic(JSON.stringify({case:'transfer-account-audit',before:before.length,after:after.length,branchUpdated:true,sessionRevoked:true}))
 assert.equal(after.length,before.length+1,'A transfer changing the account scope must retain the central audit event produced by the previous writer')
})
test('P2R diagnostic baseline: the previous transfer save emits that audit with the same subscriber and transaction',async()=>{
 const x=await scheduled(),{Repository}=require('../node_modules/typeorm'),update=Repository.prototype.update
 let intercepted=false
 Repository.prototype.update=async function(criteria,partial){
  if(this.metadata.tableName==='users'&&criteria?.employeeId===x.employee.id&&partial?.branchId===f.B.id){
   intercepted=true
   for(const user of await this.find({where:criteria})){user.branchId=partial.branchId;user.tokenVersion=(user.tokenVersion||0)+1;await this.save(user)}
   return{affected:1,raw:[],generatedMaps:[]}
  }
  return update.call(this,criteria,partial)
 }
 try{assert.equal(await f.ds.transaction(em=>service.executeTransfer(em,x.transfer.id)),true)}finally{Repository.prototype.update=update}
 assert.equal(intercepted,true);assert.equal((await events(x.user.id)).length,1)
})
test('P2R transfer waiting before its targeted User UPDATE does not restore a binding changed through PATCH',async()=>{
 const x=await scheduled(),next=await f.employee(),{Repository}=require('../node_modules/typeorm'),update=Repository.prototype.update
 let enter,release;const entered=new Promise(r=>{enter=r}),held=new Promise(r=>{release=r});let transfer
 Repository.prototype.update=async function(criteria,partial){
  if(this.metadata.tableName==='users'&&criteria?.employeeId===x.employee.id&&partial?.branchId===f.B.id){enter();await held}
  return update.call(this,criteria,partial)
 }
 try{
  transfer=f.ds.transaction(em=>service.executeTransfer(em,x.transfer.id));await entered
  await f.ok('PATCH',`/users/${x.user.id}`,{employeeId:next.id})
  release();assert.equal(await transfer,true)
  const current=await f.repo('User').findOneByOrFail({id:x.user.id});assert.equal(current.employeeId,next.id);assert.equal(current.branchId,f.A.id)
  assert.equal(await require('../src/employees/employee-change-log').wasLoginAccountOf(f.ds.manager,x.user.id,x.employee.id),true)
 }finally{release();if(transfer)await transfer.catch(()=>{});Repository.prototype.update=update}
})
