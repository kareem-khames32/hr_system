'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict');let f,seq=0
before(async()=>{f=await require('./codex-review-p2u-comments-fixture.cjs')('p2u_draft_controls')},{timeout:180000})
after(async()=>{if(f)await f.close()})
const scoped=async()=>{const e=await f.employee(f.A,{managerEmployeeId:f.manager.id,nationality:'سعودي',contractType:'fixed_term'}),u=await f.account(e);const rt=await f.repo('RequestType').save({code:'PU_'+(++seq),nameAr:'Synthetic draft gate',category:'personal_data',destinationHandler:'none',approvalChainId:f.type.approvalChainId,isActive:true});await f.ok('PATCH',`/settings/request-types/${rt.id}`,{visibleTo:{mode:'all',ids:[],conditions:[{field:'contractType',values:['fixed_term']}]}});return{e,u,rt}}
test('P2U draft cannot use an unsupported edit route, resubmission or caller-supplied bypass flags to evade first-submission audience',async()=>{
 const {e,u,rt}=await scoped(),d=await f.ok('POST','/requests',{typeCode:rt.code,payload:{reason:'old'},submit:false},u)
 await f.repo('Employee').update(e.id,{contractType:'permanent'})
 // There is no PATCH draft endpoint in RequestsController; it must not mutate the draft.
 const altered=await f.request('PATCH',`/requests/${d.id}`,{payload:{reason:'edited'}},u);assert.equal(altered.status,404)
 assert.equal(JSON.parse((await f.repo('Request').findOneByOrFail({id:d.id})).payload).reason,'old')
 assert.equal((await f.request('POST',`/requests/${d.id}/resubmit`,{payload:{reason:'try as returned'}},u)).status,400)
 assert.equal((await f.request('POST',`/requests/${d.id}/submit?audienceJudged=true&resubmission=true`,{audienceJudged:true,resubmission:true},u)).status,403)
 assert.equal((await f.repo('Request').findOneByOrFail({id:d.id})).status,'DRAFT')
})
test('P2U real returned request continues after loss of audience while another never-submitted draft is denied',async()=>{
 const {e,u,rt}=await scoped(),live=await f.ok('POST','/requests',{typeCode:rt.code,payload:{reason:'submitted'},submit:true},u),draft=await f.ok('POST','/requests',{typeCode:rt.code,payload:{reason:'draft'},submit:false},u)
 await f.ok('POST',`/requests/${live.id}/act`,{action:'RETURN',comment:'Synthetic completeness'},f.managerU)
 await f.repo('Employee').update(e.id,{contractType:'permanent'})
 const retry=await f.request('POST',`/requests/${live.id}/resubmit`,{payload:{reason:'completed information'}},u)
 assert.equal(retry.status,201);assert.equal(retry.body.status,'UNDER_REVIEW')
 assert.equal((await f.request('POST',`/requests/${draft.id}/submit`,{},u)).status,403)
})
