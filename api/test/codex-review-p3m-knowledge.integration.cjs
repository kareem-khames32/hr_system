'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict'),setup=require('./codex-review-p3m-helpers.cjs')
test('P3M-K01: article cannot reference or expose a policy outside both editor and reader audience',{timeout:120000},async()=>{
 const f=await setup('knowledge');try{
  await f.enable('helpdesk')
  const e=await f.emp(),reader=await f.account([],{employeeId:e.id}),editor=await f.account(['helpdesk.manage'])
  const policy=await f.repo('Policy').save({title:'PRIVATE_POLICY_BRANCH_B',audience:JSON.stringify({mode:'all',where:{mode:'branches',ids:[f.b.id]}}),isMandatory:false,graceDays:0,status:'DRAFT',createdByUserId:f.admin.id,createdAt:new Date()})
  const res=await f.request('POST','/helpdesk/articles',{title:'Public help article',body:'Synthetic article content',isPublished:true,audience:{mode:'all',where:{mode:'branches',ids:[f.a.id]}},policyId:policy.id},editor)
  assert.equal(res.status,400);await f.ok('POST','/helpdesk/articles',{title:'Public help article',body:'Synthetic content',isPublished:true,audience:{mode:'all',where:{mode:'branches',ids:[f.a.id]}}},editor);const legacy=await f.repo('KbArticle').findOneByOrFail({title:'Public help article'});await f.repo('KbArticle').update({id:legacy.id},{policyId:policy.id});const managed=await f.ok('GET','/helpdesk/articles/manage',null,editor)
  const article=managed.articles.find(x=>x.title==='Public help article')
  assert.equal(article.policyTitle,null);assert.equal(article.policyId,null)
  const shown=await f.ok('GET','/helpdesk/articles/'+article.id,null,reader)
  assert.equal(shown.policy,null)
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'K01',editorForeignPolicyTitle:false,ordinaryReaderForeignDraftPolicy:shown.policy}))
 }finally{await f.close()}
})
