'use strict'
// Real frontend session/cache functions, simulated storage and HTTP response. No browser layout or SQL claim.
const { test } = require('node:test'), assert = require('node:assert/strict'), path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname,'../tsconfig.json'), transpileOnly:true,
  compilerOptions:{jsx:'react-jsx',module:'commonjs',moduleResolution:'node'} })
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k),clear:()=>data.clear()}}
test('CR20 a fresh login by the same user reloads the branch currency context',async t=>{
  const previous={window:global.window,localStorage:global.localStorage,sessionStorage:global.sessionStorage,fetch:global.fetch}
  global.window={location:{pathname:'/profile',href:'/profile'}};global.localStorage=storage();global.sessionStorage=storage()
  const api=require('../../src/lib/api'),modulePath=require.resolve('../../src/lib/currency')
  const user={id:81,role:'employee',employeeId:71,branchId:1,permissions:[],displayName:'Review user',email:'review@invalid.test'}
  let count=0,context={defaultCurrency:'EGP',ownCurrency:'EGP',branches:[{id:1,currency:'EGP'}]}
  global.fetch=async()=>{count++;return {ok:true,status:200,text:async()=>JSON.stringify(context)}}
  try{
    api.saveSession('synthetic-session-one',user,false)
    let currency=require(modulePath);assert.equal(await currency.loadCurrency(),'ج.م');assert.equal(count,1)
    api.clearSession()
    // Model full-page logout/login by discarding module memory, retaining the tab's sessionStorage.
    delete require.cache[modulePath]
    context={defaultCurrency:'EGP',ownCurrency:'SAR',branches:[{id:2,currency:'SAR'}]}
    api.saveSession('synthetic-session-two',{...user,branchId:2},false)
    currency=require(modulePath)
    const shown=await currency.loadCurrency(),cached=await currency.loadCurrencyContext()
    t.diagnostic(JSON.stringify({case:'same-user-new-login',httpCalls:count,expectedCurrency:'ر.س',shownCurrency:shown,sessionBranch:api.getCurrentUser().branchId,cachedBranchIds:cached.branches.map(x=>x.id)}))
    assert.equal(shown,'ر.س','New login must not reuse the previous branch currency');assert.equal(count,2)
  }finally{delete require.cache[modulePath];Object.assign(global,previous)}
})
