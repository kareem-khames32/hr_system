'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
let f,editor,viewer,editOnly,builder,fields,seq=0
before(async()=>{
 f=await require('./codex-review-p2t-comments-fixture.cjs')('p2t_independent',{rcsi:process.env.REVIEW_RCSI==='true'})
 editor=await f.account(null,['employees.view','employees.edit']);viewer=await f.account(null,['employees.view']);editOnly=await f.account(null,['employees.edit']);builder=await f.account(null,['request_types.manage'])
 fields=f.app.get(require('../src/employees/employee-custom-fields.service').EmployeeCustomFieldsService)
},{timeout:180000})
after(async()=>{if(f)await f.close()})
const define=body=>f.ok('POST','/settings/employee-fields',body)
const values=(actor,emp=f.worker)=>f.request('GET',`/employees/${emp.id}/custom-fields`,null,actor)
const save=(actor,body,emp=f.worker)=>f.request('PUT',`/employees/${emp.id}/custom-fields`,{values:body},actor)
const value=(response,key)=>response.body.fields?.find(x=>x.fieldKey===key)?.value
const setAudience=(type,conditions)=>f.ok('PATCH',`/settings/request-types/${type.id}`,{visibleTo:{mode:'all',ids:[],conditions}})
async function type(){return f.repo('RequestType').save({code:'PT_'+(++seq),nameAr:'Synthetic audience '+seq,category:'personal_data',destinationHandler:'none',approvalChainId:f.type.approvalChainId,isActive:true})}
const create=(actor,t,submit=true)=>f.request('POST','/requests',{typeCode:t.code,payload:{reason:'Synthetic audience test'},submit},actor)
const seen=async(actor,t)=>JSON.stringify(await f.ok('GET','/requests/types',null,actor)).includes('"code":"'+t.code+'"')

test('P2T A: initial draft submission must recheck current employee attributes',async t=>{
 const rt=await type();await f.repo('Employee').update(f.worker.id,{nationality:'سعودي',contractType:'fixed_term'})
 await setAudience(rt,[{field:'nationality',values:['SAUDI']},{field:'contractType',values:['fixed_term']}])
 const draft=await create(f.workerU,rt,false);assert.equal(draft.status,201);assert.equal(draft.body.status,'DRAFT')
 await f.repo('Employee').update(f.worker.id,{contractType:'permanent'})
 assert.equal(await seen(f.workerU,rt),false);assert.equal((await create(f.workerU,rt)).status,403)
 const submitted=await f.request('POST',`/requests/${draft.body.id}/submit`,{},f.workerU)
 t.diagnostic(JSON.stringify({case:'attribute-draft-recheck',freshCreate:403,draftSubmit:submitted.status,state:submitted.body.status}))
 assert.equal(submitted.status,403,'An unsubmitted draft is not an already submitted request; current contract must govern its first submission')
})
test('P2T B: an initial draft must not bypass a custom audience field that became restricted',async t=>{
 const field=await define({fieldKey:'draft_choice',label:'Draft custom choice',type:'CHOICE',options:['allowed','other']})
 assert.equal((await save(editor,{draft_choice:'allowed'})).status,200)
 const rt=await type();await setAudience(rt,[{field:'custom',key:field.fieldKey,values:['allowed']}])
 const draft=await create(f.workerU,rt,false);assert.equal(draft.status,201)
 await f.ok('PATCH',`/settings/employee-fields/${field.id}`,{restricted:true})
 assert.equal(await seen(f.workerU,rt),false);assert.equal((await create(f.workerU,rt)).status,403)
 const submitted=await f.request('POST',`/requests/${draft.body.id}/submit`,{},f.workerU)
 t.diagnostic(JSON.stringify({case:'restricted-custom-draft',freshCreate:403,draftSubmit:submitted.status,state:submitted.body.status}))
 assert.equal(submitted.status,403,'Restricted audience field must close the first-submission path as well as creation')
})
test('P2T A: corrupted stored condition must fail closed on actual catalog and request creation',async t=>{
 const rt=await type();await f.repo('Employee').update(f.worker.id,{nationality:null})
 const invalid={mode:'all',ids:[],conditions:[{field:'nationality',values:['UNKNOWN']}]}
 assert.equal((await f.request('PATCH',`/settings/request-types/${rt.id}`,{visibleTo:invalid})).status,400)
 // Corrupt stored configuration is an explicit review requirement; write only in this disposable database.
 await f.repo('RequestType').update(rt.id,{visibleTo:JSON.stringify(invalid)})
 const catalog=await seen(f.workerU,rt),submitted=await create(f.workerU,rt)
 t.diagnostic(JSON.stringify({case:'invalid-condition',catalog,submit:submitted.status,nationalityMissing:true}))
 assert.deepEqual([catalog,submitted.status],[false,403])
})
test('P2T B: edit-only permission must not commit values then answer forbidden',async t=>{
 const field=await define({fieldKey:'editor_note',label:'Editor note',type:'TEXT'})
 const response=await save(editOnly,{editor_note:'committed despite error'})
 const row=await f.repo('EmployeeCustomValue').findOneBy({employeeId:f.worker.id,fieldId:field.id})
 t.diagnostic(JSON.stringify({case:'edit-only-save',status:response.status,stored:row?.textValue??null}))
 assert.ok(response.status<400||row===null,'A forbidden response must not follow a committed write')
})
test('P2T controls: field hiding, branch boundary, rebinding and unknown keys do not expose or partially save',async()=>{
 const restricted=await define({fieldKey:'private_note',label:'Synthetic private label',type:'TEXT',restricted:true})
 assert.equal((await save(editor,{private_note:'Synthetic secret value'})).status,200)
 const publicOwn=await values(f.workerU),publicViewer=await values(viewer),edit=await values(editor)
 for(const r of [publicOwn,publicViewer]){assert.equal(r.status,200);assert.equal(JSON.stringify(r.body).includes(restricted.label),false);assert.equal(JSON.stringify(r.body).includes('Synthetic secret value'),false)}
 assert.equal(value(edit,'private_note'),'Synthetic secret value')
 assert.equal((await values(viewer,f.far)).status,404);assert.equal((await values(viewer,{id:2000000000})).status,404)
 const before=await f.repo('EmployeeCustomValue').find({where:{employeeId:f.worker.id},order:{id:'ASC'}})
 assert.equal((await save(editor,{private_note:'must roll back',unknown_key:'x'})).status,400)
 assert.deepEqual(await f.repo('EmployeeCustomValue').find({where:{employeeId:f.worker.id},order:{id:'ASC'}}),before)
 await f.ok('PATCH',`/users/${f.workerU.id}`,{employeeId:null})
 assert.equal((await values(f.workerU)).status,401)
 const updated=await f.repo('User').findOneByOrFail({id:f.workerU.id});assert.equal((await values(updated)).status,403)
 await f.ok('PATCH',`/users/${f.workerU.id}`,{employeeId:f.worker.id});f.workerU=await f.repo('User').findOneByOrFail({id:f.workerU.id})
 const audience=await f.ok('GET','/settings/employee-fields/audience',null,builder);assert.equal(audience.some(x=>x.fieldKey==='private_note'),false)
})
test('P2T object-name field control: constructor is accepted through the API and is included among audience-editor options',async()=>{
 const field=await define({fieldKey:'constructor',label:'Object name field',type:'YESNO'})
 assert.equal(field.fieldKey,'constructor');assert.equal((await save(editor,{constructor:true})).status,200)
 const options=await f.ok('GET','/settings/employee-fields/audience',null,builder);assert.ok(options.some(x=>x.fieldKey==='constructor'))
 const rt=await type();await setAudience(rt,[{field:'custom',key:'constructor',values:['yes']}]);assert.equal(await seen(f.workerU,rt),true)
})
