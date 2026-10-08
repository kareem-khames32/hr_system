'use strict'
const fs=require('node:fs'),path=require('node:path')
const source=fs.readFileSync(path.join(__dirname,'employee-privacy.integration.cjs'),'utf8')
fs.writeFileSync(path.join(__dirname,'codex-review-p4b-export-derived.integration.cjs'),source.slice(0,source.indexOf('\ntest('))+String.raw`
test('P4B-D03: confidential executed request remains visible through sourceRequestId obligation label',async t=>{
 const chain=await repo('ApprovalChain').save({code:'P4B_PRIVATE_FINANCE_CHAIN',nameAr:'Synthetic immediate chain',isActive:true,autoApprove:true})
 const rt=await repo('RequestType').save({code:'P4B_PRIVATE_EXPENSE',nameAr:'Synthetic private expense',category:'personal_data',destinationHandler:'expense_register',approvalChainId:chain.id,isActive:true,isConfidential:true,requiredFields:JSON.stringify(['amount','reason'])})
 const marker='P4B_CONFIDENTIAL_MEDICAL_EXPENSE_REASON'
 const req=ok(await request(U.self,'POST','/requests',{typeCode:rt.code,payload:{amount:321,reason:marker},submit:true}),201)
 assert.equal(req.status,'COMPLETED')
 await repo('User').update({id:U.editor.id},{permissions:JSON.stringify(['employees.view','employees.edit','requests.view_all'])});U.editor.permissions=JSON.stringify(['employees.view','employees.edit','requests.view_all'])
 const detail=ok(await request(U.editor,'GET','/requests/'+req.id),200)
 assert.equal(JSON.stringify(detail).includes(marker),false,'ordinary request reader must not see confidential reason')
 const result=ok(await request(U.editor,'GET','/employees/'+E.target.id+'/data-export'),200)
 const requests=result.sections.find(s=>s.key==='requests').rows,obligations=result.sections.find(s=>s.key==='obligations').rows
 assert.equal(requests.some(r=>r.id===req.id),false)
 const leaked=obligations.find(r=>r.sourceRequestId===req.id)
 assert.ok(leaked);assert.ok(leaked.label.includes(marker));assert.equal(Number(leaked.amount),321)
 t.diagnostic(JSON.stringify({requestEndpointMasked:true,requestsSectionOmitted:true,obligationLeaksReason:true,sourceRequestId:leaked.sourceRequestId,amount:Number(leaked.amount)}))
})
`)
