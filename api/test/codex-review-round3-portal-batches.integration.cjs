'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
const {PortalController}=require('../src/assets/portal.controller')
let f,portal
before(async()=>{f=await require('./codex-review-round2-fixture.cjs')('r3portal');portal=f.app.get(PortalController)},{timeout:180000})
after(async()=>{if(f)await f.close()})
const targets=prefix=>Array.from({length:500},(_,i)=>({id:`${prefix}-${i}`,keys:[`synthetic:${i}`]}))
test('CR3 portal extra changed call site saves 500 notification read states then updates them atomically',async()=>{
 const items=targets('r3good'),user={sub:f.admin.id}
 await portal.saveStates(user,items,false)
 const first=await f.repo('NotificationRead').findBy({userId:f.admin.id})
 assert.equal(first.length,500);assert.ok(first.every(r=>r.readAt&&r.dismissedAt===null))
 await portal.saveStates(user,items,true)
 const second=await f.repo('NotificationRead').findBy({userId:f.admin.id})
 assert.equal(second.length,500);assert.ok(second.every(r=>r.dismissedAt))
 assert.deepEqual(second.map(r=>r.id).sort((a,b)=>a-b),first.map(r=>r.id).sort((a,b)=>a-b))
})
test('CR3 portal late-batch SQL constraint failure plus automatic retry leaves no partial notification rows',async()=>{
 const items=targets('r3reject'),repository=f.repo('NotificationRead'),table=repository.metadata.tableName
 assert.match(table,/^[a-z_]+$/)
 await f.ds.query(`ALTER TABLE [${table}] ADD CONSTRAINT CK_cr3_last_batch CHECK (notificationId <> N'r3reject-499')`)
 try{await assert.rejects(portal.saveStates({sub:f.approver.id},items,false));assert.equal(await repository.countBy({userId:f.approver.id}),0)}
 finally{await f.ds.query(`ALTER TABLE [${table}] DROP CONSTRAINT CK_cr3_last_batch`)}
})
