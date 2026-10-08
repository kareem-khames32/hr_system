'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict'),setup=require('./codex-review-p3k-helpers.cjs')
test('P3K-S01: live aggregates reveal a single anonymous choice by subtraction; sparse question reveals one answer',async()=>{
 const f=await setup('survey');try{
  await f.enable('surveys')
  const dept=await f.repo('Department').save({name:'Original department',code:'SD',branchId:f.a.id})
  const hr=await f.account(['surveys.manage']),users=[]
  for(let i=0;i<6;i++){const e=await f.emp({departmentId:dept.id});users.push(await f.account([],{employeeId:e.id}))}
  const s=await f.ok('POST','/surveys',{title:'Anonymous privacy probe',kind:'PULSE',audience:{mode:'all',where:{mode:'branches',ids:[f.a.id]}},minGroup:5,questions:[{label:'Choose answer',type:'choice',options:['A','B']},{label:'Optional rating',type:'rating',required:false}]},hr)
  await f.ok('POST',`/surveys/${s.id}/open`,{},hr)
  for(let i=0;i<5;i++)await f.ok('POST',`/surveys/${s.id}/respond`,{answers:{q1:'A',...(i===0?{q2:2}:{})}},users[i])
  const before=await f.ok('GET',`/surveys/${s.id}/results`,null,hr)
  assert.equal(before.overall[1].answered,1);assert.equal(before.overall[1].average,2)
  await f.ok('POST',`/surveys/${s.id}/respond`,{answers:{q1:'B'}},users[5])
  const after=await f.ok('GET',`/surveys/${s.id}/results`,null,hr)
  const delta=after.overall[0].counts.map((r,i)=>r.count-before.overall[0].counts[i].count)
  assert.deepEqual(delta,[0,1]);assert.equal(after.total-before.total,1)
  await f.repo('Department').update({id:dept.id},{branchId:f.b.id,name:'PRIVATE_BRANCH_B_UNIT'})
  const moved=await f.ok('GET',`/surveys/${s.id}/results`,null,hr)
  assert.ok(JSON.stringify(moved.groups).includes('PRIVATE_BRANCH_B_UNIT'))
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'S01',anonymous:true,liveDelta:delta,sparseAnswered:before.overall[1].answered,sparseAverage:before.overall[1].average,foreignDepartmentExposed:true}))
 }finally{await f.close()}
},{timeout:180000})
