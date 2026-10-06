'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
let f,editor,viewer,service,sequence=0
before(async()=>{
 f=await require('./codex-review-p2t-comments-fixture.cjs')('p2t_read_races',{rcsi:process.env.REVIEW_RCSI==='true'})
 editor=await f.account(null,['employees.view','employees.edit']);viewer=await f.account(null,['employees.view'])
 service=f.app.get(require('../src/employees/employee-custom-fields.service').EmployeeCustomFieldsService)
},{timeout:180000})
after(async()=>{if(f)await f.close()})
const save=(emp,key,val,actor=f.admin)=>f.ok('PUT',`/employees/${emp.id}/custom-fields`,{values:{[key]:val}},actor)
async function scenario(){
 const emp=await f.employee(),field=await f.ok('POST','/settings/employee-fields',{fieldKey:'race_'+(++sequence),label:'Race field '+sequence,type:'TEXT'})
 await save(emp,field.fieldKey,'public-before');return{emp,field}
}
async function pauseRead(match,operation,change){
 const {Repository}=require('../node_modules/typeorm'),find=Repository.prototype.find,findOne=Repository.prototype.findOne
 let release,enter,pending,timer,hit=false;const held=new Promise(r=>{release=r}),entered=new Promise(r=>{enter=r})
 for(const [name,original] of [['find',find],['findOne',findOne]])Repository.prototype[name]=async function(options){
  const row=await original.call(this,options)
  if(!hit&&this.manager.connection===f.ds&&match(this,name,options)){hit=true;enter();await held}
  return row
 }
 try{
  pending=operation();await Promise.race([entered,pending.then(()=>{throw Error('Read finished before barrier')}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Read barrier not reached')),15000)})]);clearTimeout(timer)
  await change();release();return await pending
 }finally{clearTimeout(timer);release();if(pending)await pending.catch(()=>{});Repository.prototype.find=find;Repository.prototype.findOne=findOne}
}
test('P2T restricted field race must not disclose a new restricted value through an older public definition',async t=>{
 const {emp,field}=await scenario()
 const response=await pauseRead((repo,name)=>repo.metadata.tableName==='employee_custom_fields'&&name==='find',
  ()=>f.request('GET',`/employees/${emp.id}/custom-fields`,null,viewer),async()=>{
   await f.ok('PATCH',`/settings/employee-fields/${field.id}`,{restricted:true})
   await save(emp,field.fieldKey,'RESTRICTED_AFTER_FLAG')
  })
 const leaked=JSON.stringify(response.body).includes('RESTRICTED_AFTER_FLAG')
 t.diagnostic(JSON.stringify({case:'restricted-after-definition-read',status:response.status,leaked}))
 assert.equal(leaked,false,'No point in time made the new value readable to this viewer')
})
test('P2T branch race must not disclose values written in the foreign branch after initial employee check',async t=>{
 const {emp,field}=await scenario()
 const response=await pauseRead((repo,name,o)=>repo.metadata.tableName==='employees'&&name==='findOne'&&o?.where?.id===emp.id&&!o?.lock,
  ()=>f.request('GET',`/employees/${emp.id}/custom-fields`,null,editor),async()=>{
   await f.repo('Employee').update(emp.id,{branchId:f.B.id})
   await save(emp,field.fieldKey,'FOREIGN_BRANCH_NEW_VALUE')
  })
 const leaked=JSON.stringify(response.body).includes('FOREIGN_BRANCH_NEW_VALUE')
 t.diagnostic(JSON.stringify({case:'branch-after-authorization',status:response.status,leaked}))
 assert.equal(leaked,false,'Scope check on an old employee row must not authorize newer foreign-branch values')
})
test('P2T post-write response must not pick up a foreign value after its scope check',async t=>{
 const {emp,field}=await scenario()
 const response=await pauseRead((repo,name,o)=>repo.metadata.tableName==='employees'&&name==='findOne'&&o?.where?.id===emp.id&&!o?.lock,
  ()=>f.request('PUT',`/employees/${emp.id}/custom-fields`,{values:{[field.fieldKey]:'saved-by-A'}},editor),async()=>{
   await f.repo('Employee').update(emp.id,{branchId:f.B.id})
   await save(emp,field.fieldKey,'FOREIGN_POSTWRITE')
  })
 const leaked=JSON.stringify(response.body).includes('FOREIGN_POSTWRITE')
 t.diagnostic(JSON.stringify({case:'postwrite-scope-race',status:response.status,leaked}))
 assert.equal(leaked,false,'Successful write response must not include data saved in another branch after commit')
})
