'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict'),setup=require('./codex-review-p3k-helpers.cjs')
test('P3K-K01: article can reference and expose a policy outside both editor and reader audience',{timeout:120000},async()=>{
 const f=await setup('knowledge');try{
  await f.enable('helpdesk')
  const e=await f.emp(),reader=await f.account([],{employeeId:e.id}),editor=await f.account(['helpdesk.manage'])
  const policy=await f.repo('Policy').save({title:'PRIVATE_POLICY_BRANCH_B',audience:JSON.stringify({mode:'all',where:{mode:'branches',ids:[f.b.id]}}),isMandatory:false,graceDays:0,status:'DRAFT',createdByUserId:f.admin.id,createdAt:new Date()})
  const res=await f.ok('POST','/helpdesk/articles',{title:'Public help article',body:'Synthetic article content',isPublished:true,audience:{mode:'all',where:{mode:'branches',ids:[f.a.id]}},policyId:policy.id},editor)
  const managed=await f.ok('GET','/helpdesk/articles/manage',null,editor)
  const article=managed.articles.find(x=>x.title==='Public help article')
  assert.equal(article.policyTitle,'PRIVATE_POLICY_BRANCH_B')
  const shown=await f.ok('GET','/helpdesk/articles/'+article.id,null,reader)
  assert.equal(shown.policy.title,'PRIVATE_POLICY_BRANCH_B')
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'K01',editorForeignPolicyTitle:true,ordinaryReaderForeignDraftPolicy:shown.policy}))
 }finally{await f.close()}
})
