'use strict'
const fs=require('node:fs'),path=require('node:path')
const read=name=>fs.readFileSync(path.join(__dirname,'codex-review-p4d-'+name),'utf8').replace(/\r\n/g,'\n').replaceAll('P4D','P4E').replaceAll('codex-review-p4d-','codex-review-p4e-')
const write=(name,source)=>fs.writeFileSync(path.join(__dirname,'codex-review-p4e-'+name),source)
for(const name of ['export.integration.cjs','export-derived.integration.cjs','export-locks.integration.cjs','export-controls.integration.cjs'])write(name,read(name))
write('closures.integration.cjs',read('closures.integration.cjs').replaceAll('[محجوب: نص من طلب سري]','[محجوب: للموظف طلب سري]'))
write('text-controls.integration.cjs',read('text-bypasses.integration.cjs')
 .replace('assert.equal(row.removeReason,normalized)',"assert.equal(row.removeReason,'[محجوب: للموظف طلب سري]')")
 .replace("assert.equal(row.removeReason,'مرض')","assert.equal(row.removeReason,'[محجوب: للموظف طلب سري]')")
 .replace('assert.equal(row.condition,marker)',"assert.equal(row.condition,'[محجوب: للموظف طلب سري]')")
 .replaceAll('normalizedPrivateTextExported:true','normalizedPrivateTextExported:false').replaceAll('shortPrivateTextExported:true','shortPrivateTextExported:false').replaceAll('freeTextConditionExported:true','freeTextConditionExported:false')
 .replace('defeats confidential text matching','remains redacted after whitespace normalization').replace('and not scrubbed','and redacted').replace('a one-word description leaks','a one-word description is redacted'))
const prefix=read('text-race.integration.cjs').split("test('P4E-X04:")[0]
write('text-race.integration.cjs',prefix+String.raw`
async function race(t,beforeCustody){
 const code=beforeCustody?'P4E_BEFORE_CUSTODY':'P4E_AFTER_SECRETS'
 const asset=await repo('Asset').save({name:code,category:'Equipment',branchId:B.one.id,currentHolderId:E.target.id,status:'ASSIGNED',value:0})
 const assignment=await repo('CustodyAssignment').save({assetId:asset.id,employeeId:E.target.id,status:'ACTIVE',condition:'Public condition'})
 const rt=await privateType(code,'custody_finance',['assignmentId','description'])
 const marker=code+' private narrative'
 const permissions=JSON.stringify(['employees.view','employees.edit','requests.view_all']);await repo('User').update({id:U.editor.id},{permissions});U.editor.permissions=permissions
 const {EntityManager}=require('../node_modules/typeorm'),original=EntityManager.prototype.query
 let signal,release,paused=false,timer
 const reached=new Promise(r=>signal=r),gate=new Promise(r=>release=r)
 EntityManager.prototype.query=async function(statement,parameters,...rest){
  const match=!paused&&parameters?.[0]===E.target.id&&(beforeCustody?statement.includes('FROM dbo.[custody_assignments] s WHERE'):statement.includes('SELECT r.[payload] FROM dbo.[requests] r'))
  if(match&&beforeCustody){paused=true;signal();await gate}
  const rows=await original.call(this,statement,parameters,...rest)
  if(match&&!beforeCustody){paused=true;signal();await gate}
  return rows
 }
 let exporting,creating
 try{
  exporting=request(U.editor,'GET','/employees/'+E.target.id+'/data-export')
  await Promise.race([reached,exporting.then(()=>{throw Error('Export finished before selected barrier')})])
  creating=request(U.self,'POST','/requests',{typeCode:rt.code,payload:{assignmentId:assignment.id,description:marker},submit:true})
  const early=await Promise.race([creating,new Promise(resolve=>timer=setTimeout(()=>resolve(null),3000))]);clearTimeout(timer)
  release()
  const createdRequest=ok(await creating,201),data=ok(await exporting,200)
  assert.ok(early,'Request must commit while export is paused to exercise the interleaving')
  assert.equal(createdRequest.status,'COMPLETED')
  const row=data.sections.find(s=>s.key==='custody').rows.find(r=>r.id===assignment.id)
  assert.equal(row.condition,beforeCustody?'[محجوب: للموظف طلب سري]':'Public condition')
  assert.ok(!JSON.stringify(data).includes(marker))
  assert.ok(!data.sections.find(s=>s.key==='requests').rows.some(r=>r.id===createdRequest.id))
  assert.equal(JSON.stringify(ok(await request(U.editor,'GET','/requests/'+createdRequest.id),200)).includes(marker),false)
  const later=ok(await request(U.editor,'GET','/employees/'+E.target.id+'/data-export'),200)
  assert.equal(later.sections.find(s=>s.key==='custody').rows.find(r=>r.id===assignment.id).condition,'[محجوب: للموظف طلب سري]')
  t.diagnostic(JSON.stringify({beforeCustody,requestCommittedBeforeExportContinued:true,firstExportLeaked:false,nextExportRedacted:true}))
 }finally{clearTimeout(timer);release();EntityManager.prototype.query=original;await exporting;if(creating)await creating}
}
// Each scenario needs a clean employee secret history for the old-value control.
test('P4E-X04a: final secret read follows a concurrent confidential custody effect',async t=>race(t,true))
test('P4E-X04b: request after final secret read cannot change already-read section data',async t=>{
 await repo('RequestType').update({code:'P4E_BEFORE_CUSTODY'},{isConfidential:false})
 await race(t,false)
})
`)
console.log('P4E copied and adapted review evidence only')
