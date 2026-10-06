'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
let f,service,team,C
const rcsi=process.env.REVIEW_RCSI==='true'
before(async()=>{
 f=await require('./codex-review-p2s-comments-fixture.cjs')('p2s_transfer',{rcsi})
 C=await f.repo('Branch').save({name:'Synthetic third branch',code:'PS_C'})
 const department=await f.repo('Department').save({name:'Synthetic transfer department',branchId:f.B.id,managerEmployeeId:f.far.id})
 team=await f.repo('Team').save({name:'Synthetic transfer team',departmentId:department.id,leaderEmployeeId:f.far.id})
 const chain=await f.repo('ApprovalChain').save({code:'P2S_AUTO_TRANSFER',nameAr:'Synthetic auto approval',isActive:true,autoApprove:true})
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
const user=id=>f.repo('User').findOneByOrFail({id})
const execute=x=>f.ds.transaction(em=>service.executeTransfer(em,x.transfer.id))
function checkAudit(event,account,oldBranch,actor=null){
 assert.ok(event);assert.equal(event.category,'PERMISSIONS');assert.equal(event.action,'USER_UPDATED');assert.equal(event.branchId,f.B.id)
 assert.equal(event.summary,'تعديل الحساب '+account.email);assert.equal(event.entityId,String(account.id));assert.equal(event.actorUserId,actor)
 assert.deepEqual(JSON.parse(event.before),{branchId:oldBranch});assert.deepEqual(JSON.parse(event.after),{branchId:f.B.id})
}
async function atUpdate(x,during){
 const {EntityManager}=require('../node_modules/typeorm'),original=EntityManager.prototype.query
 let enter,release,pending,timer;const entered=new Promise(r=>{enter=r}),held=new Promise(r=>{release=r})
 EntityManager.prototype.query=async function(sql,params,...rest){
  if(this.connection===f.ds&&sql.includes('DECLARE @moved TABLE')&&params?.[1]===x.employee.id){enter();await held}
  return original.call(this,sql,params,...rest)
 }
 try{
  pending=execute(x)
  await Promise.race([entered,pending.then(()=>{throw Error('Transfer finished before the SQL barrier')}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('No transfer SQL barrier')),15000)})]);clearTimeout(timer)
  await during();release();assert.equal(await pending,true)
 }finally{clearTimeout(timer);release();if(pending)await pending.catch(()=>{});EntityManager.prototype.query=original}
}
test('P2S transfer audits the actual previous branch per account; same-branch accounts only revoke sessions; triggers are supported',async t=>{
 const x=await scheduled(),third=await f.account(x.employee,[],C),same=await f.account(x.employee,[],f.B),nil=await f.account(x.employee),other=await f.account(await f.employee())
 await f.repo('User').update(nil.id,{branchId:null})
 await f.ds.query('CREATE TRIGGER [codex_p2s_users_trigger] ON [dbo].[users] AFTER UPDATE AS BEGIN SET NOCOUNT ON; END')
 try{assert.equal(await execute(x),true)}finally{await f.ds.query('DROP TRIGGER [codex_p2s_users_trigger]')}
 for(const [u,branch] of [[x.user,f.A.id],[third,C.id],[nil,null]]){
  const row=await user(u.id);assert.equal(row.employeeId,x.employee.id);assert.equal(row.branchId,f.B.id);assert.equal(row.tokenVersion,1)
  const audit=await events(u.id);assert.equal(audit.length,1);checkAudit(audit[0],u,branch)
 }
 assert.equal((await user(same.id)).tokenVersion,1);assert.equal((await events(same.id)).length,0);assert.equal((await user(other.id)).tokenVersion,0)
 assert.equal((await f.repo('Employee').findOneByOrFail({id:x.employee.id})).basicSalary,x.employee.basicSalary)
 assert.equal(await execute(x),false);assert.equal((await events(x.user.id)).length,1)
 t.diagnostic(JSON.stringify({rcsi,changedAccounts:4,auditEvents:3,sameBranchAuditEvents:0,reexecution:false}))
})
test('P2S SQL predicate excludes an account rebound through PATCH while transfer is waiting',async()=>{
 const x=await scheduled(),next=await f.employee()
 await atUpdate(x,()=>f.ok('PATCH',`/users/${x.user.id}`,{employeeId:next.id}))
 const current=await user(x.user.id);assert.equal(current.employeeId,next.id);assert.equal(current.branchId,f.A.id)
 assert.equal(current.tokenVersion,1)
 assert.equal(await require('../src/employees/employee-change-log').wasLoginAccountOf(f.ds.manager,x.user.id,x.employee.id),true)
 assert.equal((await events(x.user.id)).filter(e=>Object.keys(JSON.parse(e.after)).length===1&&'branchId' in JSON.parse(e.after)).length,0)
})
test('P2S OUTPUT audits branch changes committed just before UPDATE and includes newly linked accounts',async()=>{
 const x=await scheduled(),newly=await f.account(null,[],C)
 await atUpdate(x,async()=>{
  await f.ok('PATCH',`/users/${x.user.id}`,{branchId:C.id})
  // Committed concurrent writer: isolated data setup only. The production transfer must select its affected set at UPDATE time.
  await f.ds.query('UPDATE [users] SET [employeeId]=@0 WHERE [id]=@1',[x.employee.id,newly.id])
 })
 for(const u of [x.user,newly]){const row=await user(u.id);assert.equal(row.employeeId,x.employee.id);assert.equal(row.branchId,f.B.id);checkAudit((await events(u.id)).at(-1),u,C.id)}
 assert.equal((await user(x.user.id)).tokenVersion,2);assert.equal((await user(newly.id)).tokenVersion,1)
})
test('P2S audit failure rolls back transfer, account writes and prior audit inserts; retry is complete once',async()=>{
 const x=await scheduled(),second=await f.account(x.employee,[],C),audit=require('../src/audit/audit'),record=audit.recordAudit
 let reached=0
 audit.recordAudit=async function(em,entry){if(entry.action==='USER_UPDATED'&&[x.user.id,second.id].includes(Number(entry.entityId))){if(++reached===2)throw Error('P2S synthetic audit failure')}return record(em,entry)}
 try{await assert.rejects(execute(x),/P2S synthetic audit failure/)}finally{audit.recordAudit=record}
 assert.equal(reached,2);assert.equal((await f.repo('Transfer').findOneByOrFail({id:x.transfer.id})).status,'SCHEDULED')
 assert.equal((await f.repo('Employee').findOneByOrFail({id:x.employee.id})).branchId,f.A.id)
 for(const [u,branch] of [[x.user,f.A.id],[second,C.id]]){assert.equal((await user(u.id)).branchId,branch);assert.equal((await user(u.id)).tokenVersion,0);assert.equal((await events(u.id)).length,0)}
 await audit.auditRequestContext.run({userId:f.admin.id,ip:'127.0.0.7',userAgent:'P2S synthetic agent'},()=>execute(x))
 for(const [u,branch] of [[x.user,f.A.id],[second,C.id]]){const rows=await events(u.id);assert.equal(rows.length,1);checkAudit(rows[0],u,branch,f.admin.id);assert.equal(rows[0].userAgent,'P2S synthetic agent')}
})
