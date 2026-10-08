'use strict'
const fixture=require('./codex-review-p3l-fixture.cjs')
module.exports=async label=>{
 const f=await fixture('p3l_'+label);let n=0
 const a=await f.repo('Branch').save({code:'A',name:'Review branch A',country:'SA'}),b=await f.repo('Branch').save({code:'B',name:'Review branch B',country:'SA'})
 const emp=(extra={})=>f.repo('Employee').save({employeeCode:'K'+(++n),fullName:'Synthetic employee '+n,branchId:a.id,joinDate:'2020-01-01',status:'active',isActive:true,basicSalary:9000,currency:'SAR',payMethod:'cash',...extra})
 const account=(permissions=[],extra={})=>f.repo('User').save({email:'u'+(++n)+'@review.invalid',displayName:'Synthetic account '+n,passwordHash:'not-a-password',role:'employee',branchId:a.id,isActive:true,permissions:JSON.stringify(permissions),...extra})
 const enable=async code=>{await f.ok('PUT','/modules/'+code,{enabled:true});f.app.get(require('../src/modules-registry/modules.service').ModulesService).invalidate()}
 return Object.assign(f,{a,b,emp,account,enable})
}
