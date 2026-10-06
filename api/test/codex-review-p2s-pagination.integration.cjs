'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
let f
before(async()=>{f=await require('./codex-review-p2s-comments-fixture.cjs')('p2s_pagination')},{timeout:180000})
after(async()=>{if(f)await f.close()})
async function row(user,entityId,key){const [r]=await f.ds.query("INSERT notifications(recipientUserId,eventCode,category,kind,title,body,link,entityType,entityId,inApp,dedupeKey,createdAt) OUTPUT INSERTED.id VALUES(@0,N'comment.mentioned',N'comment',N'info',N'Synthetic mention',N'On request',N'/requests?request=1',N'comment',@1,1,@2,SYSUTCDATETIME())",[user.id,String(entityId),key]);return String(r.id)}
test('P2S keyset pagination deduplicates across pages and ignores concurrent new rows until the next read',async()=>{
 const u=await f.account(),allowed=new Set(),expected=[]
 for(let i=1;i<=24;i++){allowed.add(i);expected.unshift('n-'+await row(u,i,'visible-'+i))}
 // A duplicate with the newest ID wins across page boundaries.
 const duplicate='n-'+await row(u,24,'visible-duplicate');expected.splice(expected.indexOf(expected[0]),1);expected.unshift(duplicate)
 for(let i=100;i<230;i++)await row(u,i,'hidden-'+i)
 const store=require('../src/notifications/notification-store');let calls=0,concurrent
 const list=await store.storedInAppNotifications(f.ds.manager,u.id,async ids=>{
  if(++calls===1){allowed.add(999);concurrent='n-'+await row(u,999,'new-during-read')}
  return new Set(ids.filter(id=>allowed.has(id)))
 })
 assert.equal(calls,3)
 assert.deepEqual(list.map(r=>r.id),expected.slice(0,20));assert.equal(new Set(list.map(r=>r.id)).size,20)
 const next=await store.storedInAppNotifications(f.ds.manager,u.id,async ids=>new Set(ids.filter(id=>allowed.has(id))))
 assert.equal(next[0].id,concurrent);assert.equal(next.length,20)
})
test('P2S readable-comment memoization distinguishes internal and public comments for the same request',async()=>{
 const req=await f.submit(),publicComment=await f.say(f.managerU,req.id,{body:'Synthetic public'}),privateComment=await f.say(f.managerU,req.id,{body:'Synthetic internal',internal:true})
 assert.equal(publicComment.status,201);assert.equal(privateComment.status,201)
 const rows=await f.repo('Comment').findBy({entityType:'request',entityId:req.id}),service=f.app.get(require('../src/comments/comments.service').CommentsService)
 const payload={sub:f.workerU.id,role:f.workerU.role,employeeId:f.worker.id,branchId:f.A.id,branchIds:[f.A.id],permissions:[]}
 const readable=await service.readableComments(payload,rows.map(r=>r.id))
 assert.deepEqual([...readable],rows.filter(r=>!r.internal).map(r=>r.id))
})
test('P2S documented page cap stops at ten pages without exposing hidden links or changing stored rows',async()=>{
 const u=await f.account(),visible=await row(u,1,'cap-visible')
 for(let page=0;page<10;page++)await f.ds.query("INSERT notifications(recipientUserId,eventCode,category,kind,title,body,link,entityType,entityId,inApp,dedupeKey,createdAt) SELECT TOP(60) @0,N'comment.mentioned',N'comment',N'info',N'Synthetic mention',N'On request',N'/requests?request=hidden',N'comment',N'2',1,@1+CAST(ROW_NUMBER() OVER(ORDER BY (SELECT 1)) AS nvarchar(30)),SYSUTCDATETIME() FROM sys.all_objects",[u.id,'cap-hidden-'+page+'-'])
 const store=require('../src/notifications/notification-store');let pages=0
 const list=await store.storedInAppNotifications(f.ds.manager,u.id,async ids=>{pages++;return new Set(ids.filter(id=>id===1))})
 assert.equal(pages,10);assert.deepEqual(list,[])
 assert.equal(Number((await f.ds.query('SELECT COUNT(*) n FROM notifications WHERE recipientUserId=@0',[u.id]))[0].n),601)
 assert.ok(visible)
})
