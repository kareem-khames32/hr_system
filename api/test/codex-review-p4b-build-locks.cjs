'use strict'
const fs=require('node:fs'),path=require('node:path')
const source=fs.readFileSync(path.join(__dirname,'employee-privacy.integration.cjs'),'utf8')
fs.writeFileSync(path.join(__dirname,'codex-review-p4b-export-locks.integration.cjs'),source.slice(0,source.indexOf('\ntest('))+String.raw`
test('P4B-N01: employee export and request execution have opposite employee/request locks',async t=>{
 const chain=await repo('ApprovalChain').save({code:'P4B_TITLE_CHAIN',nameAr:'Synthetic title chain',isActive:true,autoApprove:true})
 const rt=await repo('RequestType').findOneByOrFail({code:'TITLE_CHANGE'})
 await repo('RequestType').update({id:rt.id},{approvalChainId:chain.id,isActive:true,destinationHandler:'employee_update'})
 const {EntityManager,Repository}=require('../node_modules/typeorm'),query=EntityManager.prototype.query,find=Repository.prototype.findOne
 let reached,release,empReached,paused=false,requestStarted=false;const arrived=new Promise(r=>reached=r),gate=new Promise(r=>release=r),employeeWait=new Promise(r=>empReached=r)
 const errors=[]
 EntityManager.prototype.query=async function(sql,args,...rest){try{const result=await query.call(this,sql,args,...rest);if(!paused&&/SELECT \[id\], \[branchId\] FROM \[employees\] WITH \(UPDLOCK, ROWLOCK\)/.test(sql)&&args?.[0]===E.target.id){paused=true;reached();await gate}return result}catch(e){errors.push(e.number??e.driverError?.number??e.originalError?.info?.number);throw e}}
 Repository.prototype.findOne=async function(opts){if(requestStarted&&this.metadata.name==='Employee'&&opts?.where?.id===E.target.id&&opts?.lock?.mode==='pessimistic_write')empReached();return find.call(this,opts)}
 const exporting=request(U.editor,'GET','/employees/'+E.target.id+'/data-export');let editing
 try{
 await Promise.race([arrived,exporting.then(()=>{throw Error('export missed lock barrier')})]);requestStarted=true
 editing=request(U.self,'POST','/requests',{typeCode:'TITLE_CHANGE',payload:{toTitle:'P4B synthetic title'},submit:true})
 await Promise.race([employeeWait,editing.then(r=>{throw Error('request missed employee lock barrier: '+JSON.stringify(r))})])
 release();const [out,req]=await Promise.all([exporting,editing])
 assert.ok(out.status===500||req.status===500,JSON.stringify({export:out.status,request:req.status}))
 assert.ok(out.status===200||req.status===201)
 assert.ok(errors.includes(1205),JSON.stringify(errors))
 t.diagnostic(JSON.stringify({exportStatus:out.status,requestStatus:req.status,oppositeLockOrder:true,sqlErrors:errors}))
 }finally{release();EntityManager.prototype.query=query;Repository.prototype.findOne=find;await exporting;if(editing)await editing}
})
`)
