'use strict'
const fs=require('node:fs'),path=require('node:path')
const source=fs.readFileSync(path.join(__dirname,'codex-review-p4d-text-bypasses.integration.cjs'),'utf8').replace(/\r\n/g,'\n')
const prefix=source.split('async function removeWithReason')[0]
fs.writeFileSync(path.join(__dirname,'codex-review-p4d-text-race.integration.cjs'),prefix+String.raw`
test('P4D-X04: a confidential request commits after the text snapshot and before exporting its copied custody field',async t=>{
 const asset=await repo('Asset').save({name:'Synthetic race asset',category:'Equipment',branchId:B.one.id,currentHolderId:E.target.id,status:'ASSIGNED',value:0})
 const assignment=await repo('CustodyAssignment').save({assetId:asset.id,employeeId:E.target.id,status:'ACTIVE',condition:'Public condition'})
 const rt=await privateType('P4D_CUSTODY_RACE','custody_finance',['assignmentId','description'])
 const marker='Confidential narrative committed during export'
 const permissions=JSON.stringify(['employees.view','employees.edit','requests.view_all']);await repo('User').update({id:U.editor.id},{permissions});U.editor.permissions=permissions
 const {EntityManager}=require('../node_modules/typeorm'),original=EntityManager.prototype.query
 let signal,release,paused=false,timer
 const reached=new Promise(r=>signal=r),gate=new Promise(r=>release=r)
 EntityManager.prototype.query=async function(statement,parameters,...rest){
  const rows=await original.call(this,statement,parameters,...rest)
  if(!paused&&statement.includes('SELECT r.[payload] FROM dbo.[requests] r')&&parameters?.[0]===E.target.id){paused=true;signal();await gate}
  return rows
 }
 let exporting,creating
 try{
  exporting=request(U.editor,'GET','/employees/'+E.target.id+'/data-export')
  await Promise.race([reached,exporting.then(()=>{throw Error('Export finished before snapshot barrier')})])
  creating=request(U.self,'POST','/requests',{typeCode:rt.code,payload:{assignmentId:assignment.id,description:marker},submit:true})
  const early=await Promise.race([creating,new Promise(resolve=>timer=setTimeout(()=>resolve(null),3000))]);clearTimeout(timer)
  release()
  const createdRequest=ok(await creating,201),data=ok(await exporting,200)
  assert.ok(early,'Request waited for export rather than committing in the text-snapshot window')
  assert.equal(createdRequest.status,'COMPLETED')
  const row=data.sections.find(s=>s.key==='custody').rows.find(r=>r.id===assignment.id)
  assert.equal(row.condition,marker)
  assert.ok(!data.sections.find(s=>s.key==='requests').rows.some(r=>r.id===createdRequest.id))
  assert.equal(JSON.stringify(ok(await request(U.editor,'GET','/requests/'+createdRequest.id),200)).includes(marker),false)
  const later=ok(await request(U.editor,'GET','/employees/'+E.target.id+'/data-export'),200)
  assert.equal(later.sections.find(s=>s.key==='custody').rows.find(r=>r.id===assignment.id).condition,'[محجوب: نص من طلب سري]')
  t.diagnostic(JSON.stringify({requestCommittedBeforeExportContinued:true,firstExportLeaked:true,nextExportRedacted:true,requestHidden:true}))
 }finally{clearTimeout(timer);release();EntityManager.prototype.query=original;await exporting;if(creating)await creating}
})
`)
console.log('P4D real two-request race fixture written')
