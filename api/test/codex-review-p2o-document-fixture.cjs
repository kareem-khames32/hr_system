'use strict'
const crypto=require('node:crypto')
module.exports=async function(label,options){
 const f=await require('./codex-review-p2o-fixture.cjs')(label,options)
 const A=await f.repo('Branch').save({name:'Synthetic branch A',code:'PN_A'}),B=await f.repo('Branch').save({name:'Synthetic branch B',code:'PN_B'})
 let seq=0
 const employee=async(branch=A,extra={})=>f.repo('Employee').save({employeeCode:'PN'+(++seq),fullName:'Synthetic Employee '+seq,branchId:branch.id,basicSalary:1234.56,joinDate:'2020-01-01',status:'active',isActive:true,...extra})
 const account=async(emp=null,permissions=[],branch=A)=>f.repo('User').save({email:crypto.randomUUID()+'@review.invalid',displayName:'Synthetic Account',passwordHash:'synthetic',employeeId:emp?.id??null,branchId:branch.id,role:'employee',permissions:JSON.stringify(permissions),isActive:true})
 const employeeA=await employee(),employeeB=await employee(B),other=await employee()
 const self=await account(employeeA),selfB=await account(employeeB),hrA=await account(null,['documents.manage']),hrB=await account(null,['documents.manage'],B),taskManager=await account(null,['tasks.manage','tasks.view_all'])
 await f.setting('company.name','Synthetic review company')
 const draft=await f.ok('POST','/hr-documents/templates',{name:'Synthetic private template',category:'acknowledgement',draft:{title:'Synthetic title',greeting:'',body:'For {{employee.fullName}}',closing:'',footer:''},customFields:[]})
 const template=await f.ok('POST',`/hr-documents/templates/${draft.id}/publish`,{version:draft.version})
 const input=(emp=employeeA,extra={})=>({templateId:template.id,revisionId:template.publishedRevision.id,employeeId:emp.id,values:{},idempotencyKey:crypto.randomUUID(),requireAck:true,...extra})
 const issue=(emp=employeeA,extra={},actor=f.admin)=>f.ok('POST','/hr-documents/issue',input(emp,extra),actor)
 const columns=async id=>(await f.ds.query('SELECT ackRequestedAt,ackTaskId,ackContentHash,fileId FROM hr_issued_documents WHERE id=@0',[id]))[0]
 const ack=(actor,id,hash)=>f.request('POST',`/hr-documents/issued/${id}/acknowledge`,{contentHash:hash},actor)
 const cancel=(actor,id)=>f.request('POST',`/hr-documents/issued/${id}/acknowledgement/cancel`,{},actor)
 return{...f,A,B,employee,account,employeeA,employeeB,other,self,selfB,hrA,hrB,taskManager,template,input,issue,columns,ack,cancel}
}
