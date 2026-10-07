'use strict'
const crypto=require('node:crypto')
module.exports=async(label,options)=>{
 const f=await require('./codex-review-p3b-fixture.cjs')(label,options)
 const A=await f.repo('Branch').save({code:'P3B_A',name:'Synthetic branch A',country:'SA'}),B=await f.repo('Branch').save({code:'P3B_B',name:'Synthetic branch B',country:'SA'})
 const department=async(branch=A,name='Synthetic own department')=>f.repo('Department').save({code:crypto.randomUUID().slice(0,12),name,branchId:branch.id})
 const D=await department(),E=await department(B,'Synthetic foreign department')
 const T=await f.repo('Team').save({code:'P3B_T',name:'Synthetic own team',departmentId:D.id})
 const title=await f.repo('JobTitle').save({title:'Synthetic analyst',isActive:true})
 let n=0
 const employee=async(extra={})=>f.repo('Employee').save({employeeCode:'P3B'+(++n),fullName:'Synthetic employee '+n,branchId:A.id,departmentId:D.id,teamId:T.id,jobTitle:title.title,joinDate:'2020-01-01',basicSalary:5000,status:'active',isActive:true,...extra})
 const account=async(emp=null,permissions=[],branch=A)=>f.repo('User').save({email:crypto.randomUUID()+'@review.invalid',displayName:'Synthetic reviewer',passwordHash:'synthetic',employeeId:emp?.id??null,branchId:branch.id,role:'employee',permissions:JSON.stringify(permissions),isActive:true})
 const viewer=await account(null,['positions.view','positions.manage','employees.create','audit.view'])
 const modules=f.app.get(require('../src/modules-registry/modules.service').ModulesService)
 await f.ok('PUT','/modules/positions',{enabled:true});modules.invalidate()
 const service=f.app.get(require('../src/positions/positions.service').PositionsService)
 const position=(extra={},actor=viewer)=>f.ok('POST','/positions',{jobTitleId:title.id,branchId:A.id,departmentId:D.id,headcount:3,...extra},actor)
 const requester=await employee(),requesterU=await account(requester)
 const approverU=await account(null,['approve.hr','requests.view_all'])
 const chain=await f.repo('ApprovalChain').save({code:'P3B_HR',nameAr:'Synthetic positions chain',isActive:true,autoApprove:false})
 await f.repo('ApprovalStep').save({chainId:chain.id,stepOrder:1,approverRole:'hr'})
 const type=await f.repo('RequestType').save({code:'POSITION_REQUEST',nameAr:'Synthetic positions request',category:'employment_status',destinationHandler:'positions_headcount',approvalChainId:chain.id,isActive:true})
 const ask=(payload={},actor=requesterU)=>f.ok('POST','/requests',{typeCode:type.code,payload:{positionTitle:title.title,headcount:2,reason:'Synthetic expansion',...payload},submit:true},actor)
 const approve=id=>f.request('POST',`/requests/${id}/act`,{action:'APPROVE'},approverU)
 return {...f,A,B,D,E,T,title,department,employee,account,viewer,modules,service,position,requester,requesterU,approverU,type,ask,approve}
}
