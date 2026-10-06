'use strict'
const crypto=require('node:crypto'),assert=require('node:assert/strict')
module.exports=async function(label,options){
 const f=await require('./codex-review-p2q-fixture.cjs')(label,options)
 const A=await f.repo('Branch').save({name:'Synthetic comments A',code:'PP_A'}),B=await f.repo('Branch').save({name:'Synthetic comments B',code:'PP_B'})
 let seq=0
 const employee=async(branch=A,extra={})=>f.repo('Employee').save({employeeCode:'PP'+(++seq),fullName:'Synthetic Comment Employee '+seq,branchId:branch.id,basicSalary:1234.56,joinDate:'2020-01-01',status:'active',isActive:true,...extra})
 const account=async(emp=null,permissions=[],branch=A)=>f.repo('User').save({email:crypto.randomUUID()+'@review.invalid',displayName:'Synthetic Comment Account',passwordHash:'synthetic',employeeId:emp?.id??null,branchId:branch.id,role:'employee',permissions:JSON.stringify(permissions),isActive:true})
 const manager=await employee(),worker=await employee(A,{managerEmployeeId:manager.id}),far=await employee(B),hr=await employee()
 const managerU=await account(manager),workerU=await account(worker),farU=await account(far,[],B),hrU=await account(hr,['requests.view_all','tasks.manage','tasks.view_all']),proxyU=await account(null,['requests.create_on_behalf'])
 const chain=await f.repo('ApprovalChain').save({code:'PP_DIRECT',nameAr:'Synthetic comment chain',isActive:true,autoApprove:false})
 await f.repo('ApprovalStep').save({chainId:chain.id,stepOrder:1,approverRole:'direct_manager_of_requester'})
 const type=await f.repo('RequestType').save({code:'PP_PLAIN',nameAr:'Synthetic comment request',category:'personal_data',destinationHandler:'none',approvalChainId:chain.id,isActive:true})
 const submit=(actor=workerU,extra={})=>f.ok('POST','/requests',{typeCode:type.code,payload:{reason:'Synthetic request'},submit:true,...extra},actor)
 const thread=(actor,id,kind='requests')=>f.request('GET',`/${kind}/${id}/comments`,null,actor)
 const say=(actor,id,body,kind='requests')=>f.request('POST',`/${kind}/${id}/comments`,typeof body==='string'?{body}:body,actor)
 const jwt=new(require('../node_modules/@nestjs/jwt').JwtService)({secret:process.env.JWT_SECRET})
 const headers=actor=>({Authorization:'Bearer '+jwt.sign({sub:actor.id,email:actor.email,role:actor.role,branchId:actor.branchId??null,branchIds:require('../src/auth/guards').effectiveBranchScope(actor)??undefined,employeeId:actor.employeeId??null,tokenVersion:actor.tokenVersion||0,permissions:actor.role==='super_admin'?['*']:JSON.parse(actor.permissions||'[]')})})
 // A valid, tiny PNG. No renderer, external network or native process is needed.
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=','base64')
 const upload=async(actor,name='synthetic-internal.png')=>{const form=new FormData();form.append('file',new Blob([png],{type:'image/png'}),name);const r=await fetch('http://127.0.0.1:1/api/files/upload?entityType=comment',{method:'POST',headers:headers(actor),body:form});const body=await r.json();assert.equal(r.status,201,JSON.stringify(body));return body}
 const download=async(actor,id)=>{const r=await fetch(`http://127.0.0.1:1/api/files/${id}`,{headers:headers(actor)});return{status:r.status,bytes:Buffer.from(await r.arrayBuffer())}}
 const notificationService=f.app.get(require('../src/notifications/notifications.service').NotificationsService)
 const dispatch=async ref=>{const rules=require('../src/comments/comment-rules');const comment=(await f.repo('Comment').find()).find(c=>rules.commentRef(c.id)===ref);assert.ok(comment);const [event]=await f.ds.query("SELECT TOP(1) * FROM outbox_events WHERE eventType=N'COMMENT_MENTION' AND entityId=@0 ORDER BY id DESC",[String(comment.id)]);assert.ok(event);await notificationService.dispatch({id:String(event.id),type:event.eventType,payload:JSON.parse(event.payload)});return comment}
 return{...f,A,B,employee,account,manager,worker,far,managerU,workerU,farU,hrU,proxyU,type,submit,thread,say,headers,png,upload,download,dispatch,notificationService}
}
