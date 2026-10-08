'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const read=name=>fs.readFileSync(path.join(__dirname,'codex-review-p4c-'+name),'utf8').replace(/\r\n/g,'\n').replaceAll('P4C','P4D').replaceAll('codex-review-p4c-','codex-review-p4d-')
const write=(name,source)=>fs.writeFileSync(path.join(__dirname,'codex-review-p4d-'+name),source)
for(const name of ['export.integration.cjs','export-derived.integration.cjs','export-locks.integration.cjs'])write(name,read(name))
let closures=read('updated-sources.integration.cjs')
closures=closures.replace('assert.equal(leaked.removeReason,marker)','assert.equal(leaked.removeReason,\'[محجوب: نص من طلب سري]\')')
 .replace('assert.equal(leaked.condition,marker)','assert.equal(leaked.condition,\'[محجوب: نص من طلب سري]\')')
 .replace('assert.equal(data.employee.archiveReason,marker)','assert.equal(data.employee.archiveReason,\'[محجوب: نص من طلب سري]\')')
 .replaceAll('privateReasonExported:true','privateReasonExported:false').replaceAll('privateDescriptionExported:true','privateDescriptionExported:false')
write('closures.integration.cjs',closures)
let controls=read('export-controls.integration.cjs').replace("P4D-P02: installment section is skipped even for a public loan because it lacks employeeId","P4D-P02: public loan installments exported; confidential parent and foreign owner excluded")
controls=controls.replace("assert.equal(data.sections.some(s=>s.key==='loanInstallments'),false)","assert.ok(data.sections.find(s=>s.key==='loanInstallments').rows.some(r=>r.id===installment.id))")
controls=controls.replace("t.diagnostic(JSON.stringify({publicLoanExported:true,installmentExists:true,installmentSectionPresent:false}))",String.raw`
 const rt=await repo('RequestType').findOneByOrFail({code:'LOAN'})
 const source=await repo('Request').save({typeCode:'LOAN',requesterId:E.target.id,branchId:B.one.id,status:'COMPLETED',payload:'{}'})
 await repo('Loan').update({id:loan.id},{requestId:source.id});await repo('RequestType').update({id:rt.id},{isConfidential:true})
 const foreign=await repo('Loan').save({employeeId:E.other.id,amount:300,status:'ACTIVE'})
 const foreignPart=await repo('LoanInstallment').save({loanId:foreign.id,dueDate:'2026-12-01',amount:300,paid:false})
 const hidden=ok(await request(U.editor,'GET','/employees/'+E.target.id+'/data-export'),200)
 assert.ok(!hidden.sections.find(s=>s.key==='loanInstallments').rows.some(r=>r.id===installment.id||r.id===foreignPart.id))
 t.diagnostic(JSON.stringify({publicInstallment:true,confidentialInstallment:false,foreignInstallment:false}))`)
write('export-controls.integration.cjs',controls)
const prefix=read('updated-sources.integration.cjs').split("test('P4D-S01:")[0]
assert.ok(prefix.includes('async function privateType'))
write('text-bypasses.integration.cjs',prefix+String.raw`
async function removeWithReason(code,reason){
 ok(await request(admin,'PUT','/modules/dependents',{enabled:true}),200);app.get(require('../src/modules-registry/modules.service').ModulesService).invalidate()
 const name='Dependent '+code
 const dependent=ok(await request(admin,'POST','/dependents',{employeeId:E.target.id,nameAr:name,relation:'SON',birthDate:'2020-01-01'}),201)
 const rt=await privateType(code,'dependents_update',['reason'])
 const req=ok(await request(U.self,'POST','/requests',{typeCode:rt.code,payload:{dependentAction:'حذف معال',dependent:name+' — ابن (#'+dependent.id+')',reason},submit:true}),201)
 assert.equal(req.status,'COMPLETED')
 const rows=await maskedAndExported(req,reason,'dependents')
 return {row:rows.find(r=>r.id===dependent.id),req}
}
test('P4D-X01: real dependent destination normalizes whitespace and defeats confidential text matching',async t=>{
 const raw='خلاف\nعائلي\tخاص   يستوجب حذف المعال من سجل الموظف'.replaceAll('\\n','\n').replaceAll('\\t','\t')
 // Use actual whitespace characters, not a manual paraphrase.
 const reason=raw.replaceAll('\\n',String.fromCharCode(10)).replaceAll('\\t',String.fromCharCode(9))
 const normalized=reason.replace(/\s+/g,' ').trim()
 assert.notEqual(reason,normalized)
 const {row}=await removeWithReason('P4D_SPACE_REASON',reason)
 assert.equal(row.removeReason,normalized)
 t.diagnostic(JSON.stringify({requestHidden:true,historyHidden:true,normalizedPrivateTextExported:true}))
})
test('P4D-X02: three-letter sensitive narrative is copied by the real destination and not scrubbed',async t=>{
 const {row}=await removeWithReason('P4D_SHORT_REASON','مرض')
 assert.equal(row.removeReason,'مرض')
 t.diagnostic(JSON.stringify({requestHidden:true,shortPrivateTextExported:true}))
})
test('P4D-X03: free-text custody condition is not a narrative key; a one-word description leaks',async t=>{
 const asset=await repo('Asset').save({name:'Synthetic return asset',category:'Equipment',branchId:B.one.id,currentHolderId:E.target.id,status:'ASSIGNED',value:0})
 const assignment=await repo('CustodyAssignment').save({assetId:asset.id,employeeId:E.target.id,status:'ACTIVE',condition:'Public condition'})
 const rt=await privateType('P4D_CUSTODY_RETURN','custody_return',['assignmentId','condition'])
 const marker='contaminated'
 const req=ok(await request(U.self,'POST','/requests',{typeCode:rt.code,payload:{assignmentId:assignment.id,condition:marker},submit:true}),201)
 assert.equal(req.status,'COMPLETED')
 const rows=await maskedAndExported(req,marker,'custody'),row=rows.find(r=>r.id===assignment.id)
 assert.equal(row.condition,marker)
 t.diagnostic(JSON.stringify({requestHidden:true,freeTextConditionExported:true}))
})
`)
console.log('P4D closure and independent fixtures written')
