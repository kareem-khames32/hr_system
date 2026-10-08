'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const read=n=>fs.readFileSync(path.join(__dirname,n),'utf8'),write=(n,s)=>fs.writeFileSync(path.join(__dirname,n),s)
const rename=s=>s.replaceAll('p4b-','p4c-').replaceAll('P4B','P4C')
write('codex-review-p4c-export.integration.cjs',rename(read('codex-review-p4b-export.integration.cjs')))
let s=rename(read('codex-review-p4b-export-derived.integration.cjs'))
s=s.replace('confidential executed request remains visible through sourceRequestId obligation label','confidential executed request and obligation omitted; public control remains visible')
s=s.replace('assert.ok(leaked);assert.ok(leaked.label.includes(marker));assert.equal(Number(leaked.amount),321)',"assert.equal(leaked,undefined);assert.equal(JSON.stringify(result).includes(marker),false);await repo('RequestType').update({id:rt.id},{isConfidential:false});const plain=ok(await request(U.editor,'GET','/employees/'+E.target.id+'/data-export'),200);assert.ok(plain.sections.find(s=>s.key==='obligations').rows.some(r=>r.sourceRequestId===req.id&&r.label.includes(marker)))")
s=s.replace('obligationLeaksReason:true,sourceRequestId:leaked.sourceRequestId,amount:Number(leaked.amount)','obligationOmitted:true,publicControlVisible:true')
write('codex-review-p4c-export-derived.integration.cjs',s)
s=rename(read('codex-review-p4b-export-locks.integration.cjs'))
s=s.replace('employee export and request execution have opposite employee/request locks','real export deadlock retries successfully with one committed audit')
s=s.replace("const exporting=request(U.editor", "const auditsBefore=await repo('AuditLog').countBy({action:'EMPLOYEE_DATA_EXPORT'});const exporting=request(U.editor")
s=s.replace("assert.ok(out.status===500||req.status===500,JSON.stringify({export:out.status,request:req.status}))", "assert.deepEqual([out.status,req.status],[200,201]);assert.equal(await repo('AuditLog').countBy({action:'EMPLOYEE_DATA_EXPORT'})-auditsBefore,1)")
write('codex-review-p4c-export-locks.integration.cjs',s)
const prefix=read('employee-privacy.integration.cjs').split('\ntest(')[0]
write('codex-review-p4c-updated-sources.integration.cjs',prefix+String.raw`
async function privateType(code,handler,required=[]){const chain=await repo('ApprovalChain').save({code:code+'_CHAIN',nameAr:'Synthetic private chain',isActive:true,autoApprove:true});return repo('RequestType').save({code,nameAr:code,category:'personal_data',destinationHandler:handler,approvalChainId:chain.id,isActive:true,isConfidential:true,requiredFields:JSON.stringify(required)})}
async function maskedAndExported(req,marker,section){
 const permissions=JSON.stringify(['employees.view','employees.edit','requests.view_all']);await repo('User').update({id:U.editor.id},{permissions});U.editor.permissions=permissions
 assert.equal(JSON.stringify(ok(await request(U.editor,'GET','/requests/'+req.id),200)).includes(marker),false)
 const data=ok(await request(U.editor,'GET','/employees/'+E.target.id+'/data-export'),200)
 assert.ok(!data.sections.find(s=>s.key==='requests').rows.some(r=>r.id===req.id))
 assert.equal(JSON.stringify(data.sections.find(s=>s.key==='changeHistory')).includes(marker),false)
 return data.sections.find(s=>s.key===section).rows
}
test('P4C-S01: confidential dependent removal copies reason onto an existing unlinked row',async t=>{
 ok(await request(admin,'PUT','/modules/dependents',{enabled:true}),200);app.get(require('../src/modules-registry/modules.service').ModulesService).invalidate()
 const dependent=ok(await request(admin,'POST','/dependents',{employeeId:E.target.id,nameAr:'Synthetic dependent',relation:'SON',birthDate:'2020-01-01'}),201)
 const rt=await privateType('P4C_DEP_REMOVE','dependents_update',['reason'])
 const marker='P4C_PRIVATE_DEPENDENT_REMOVAL_REASON'
 const req=ok(await request(U.self,'POST','/requests',{typeCode:rt.code,payload:{dependentAction:'حذف معال',dependent:'Synthetic dependent — ابن (#'+dependent.id+')',reason:marker},submit:true}),201)
 assert.equal(req.status,'COMPLETED')
 const rows=await maskedAndExported(req,marker,'dependents'),leaked=rows.find(r=>r.id===dependent.id)
 assert.ok(leaked);assert.equal(leaked.removeReason,marker);assert.equal(leaked.requestId,null)
 t.diagnostic(JSON.stringify({requestHidden:true,historyHidden:true,section:'dependents',privateReasonExported:true,creationRequestId:leaked.requestId}))
})
test('P4C-S02: confidential custody loss copies description onto the old assignment',async t=>{
 const asset=await repo('Asset').save({name:'Synthetic asset',category:'Equipment',branchId:B.one.id,currentHolderId:E.target.id,status:'ASSIGNED',value:200})
 const assignment=await repo('CustodyAssignment').save({assetId:asset.id,employeeId:E.target.id,status:'ACTIVE',condition:'Public original condition'})
 const rt=await privateType('P4C_CUSTODY_LOSS','custody_finance',['assignmentId','description'])
 const marker='P4C_PRIVATE_CUSTODY_LOSS_DESCRIPTION'
 const req=ok(await request(U.self,'POST','/requests',{typeCode:rt.code,payload:{assignmentId:assignment.id,description:marker},submit:true}),201)
 assert.equal(req.status,'COMPLETED')
 const rows=await maskedAndExported(req,marker,'custody'),leaked=rows.find(r=>r.id===assignment.id)
 assert.ok(leaked);assert.equal(leaked.condition,marker);assert.equal(leaked.requestId,null)
 t.diagnostic(JSON.stringify({requestHidden:true,section:'custody',privateDescriptionExported:true,creationRequestId:leaked.requestId}))
})
test('P4C-S03: confidential archive request copies its reason into the exported employee',async t=>{
 const rt=await privateType('P4C_ARCHIVE','employee_status',['newStatus','reason'])
 const marker='P4C_PRIVATE_ARCHIVE_REASON'
 const req=ok(await request(U.self,'POST','/requests',{typeCode:rt.code,payload:{newStatus:'archived',reason:marker},submit:true}),201)
 assert.equal(req.status,'COMPLETED')
 assert.equal(JSON.stringify(ok(await request(U.editor,'GET','/requests/'+req.id),200)).includes(marker),false)
 const data=ok(await request(U.editor,'GET','/employees/'+E.target.id+'/data-export'),200)
 assert.equal(JSON.stringify(data.sections.find(s=>s.key==='requests')).includes(marker),false)
 assert.equal(JSON.stringify(data.sections.find(s=>s.key==='changeHistory')).includes(marker),false)
 assert.equal(data.employee.archiveReason,marker)
 t.diagnostic(JSON.stringify({requestHidden:true,historyHidden:true,section:'employee.archiveReason',privateReasonExported:true}))
})
`)
console.log('P4C independent fixtures prepared')
