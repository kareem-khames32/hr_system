'use strict'
const path=require('node:path'),{test}=require('node:test'),assert=require('node:assert/strict')
require('../node_modules/ts-node').register({project:path.resolve(__dirname,'../tsconfig.json'),transpileOnly:true})
require('../node_modules/reflect-metadata')
for(const n of ['surveys','performance-reviews','cases','helpdesk','preboarding','tasks-assignment-rules','comments-rules','payroll-bonuses','payroll-typed-deductions']){
 require(path.join(__dirname,n+'.test.cjs'))
}
test('P3M-S05: published totals minus every published group never isolate fewer than the threshold',()=>{
 const {complementaryHidden,summarize,visibleGroups}=require('../src/surveys/survey-rules')
 const q=[{key:'q',label:'Optional',type:'choice',options:['A','B'],required:false}];let cases=0
 for(const min of [3,5])for(const a of [1,3,5,7])for(const b of [1,3,5,7])for(const c of [0,1,4,6]){
  for(let na=0;na<=a;na++)for(let nb=0;nb<=b;nb++)for(let nc=0;nc<=c;nc++){
   const groups=[a,b,c].map((size,i)=>({key:i,answers:Array.from({length:size},(_,j)=>j<[na,nb,nc][i]?{q:i===1?'B':'A'}:{})}))
   const all=groups.flatMap(g=>g.answers),shown=new Set(visibleGroups(groups.map(g=>({key:g.key,count:g.answers.length})),min))
   const publicGroups=groups.filter(g=>shown.has(g.key)),hidden=complementaryHidden(q,publicGroups,groups.filter(g=>!shown.has(g.key)).flatMap(g=>g.answers),min)
   const total=summarize(q,all,min)[0];if(total.hidden)continue
   let known=0
   for(const g of publicGroups){const view=summarize(q,g.answers,min,hidden.get('q')?.has(g.key)?new Set(['q']):undefined)[0];if(!view.hidden)known+=view.answered;else assert.equal(view.answered,undefined)}
   const residual=total.answered-known;assert.ok(residual===0||residual>=min,JSON.stringify({min,a,b,c,na,nb,nc,residual}));cases++
  }
 }
 console.log('REVIEW_MEASURE '+JSON.stringify({case:'S05',publicationScenarios:cases,unsafeResiduals:0}))
})
