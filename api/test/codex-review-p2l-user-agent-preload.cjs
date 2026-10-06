'use strict'
// Supply the ordinary client header omitted by the in-process HTTP transport.
// The existing SQL-only network guard and all real Nest authorization remain.
require('./codex-review-round5-harness.cjs')
const transport=global.fetch
global.fetch=(url,options={})=>{
 const headers=new Headers(options.headers||{})
 if(!headers.has('user-agent'))headers.set('user-agent','Codex-P2L-Synthetic-Transport')
 return transport(url,{...options,headers})
}
console.log('REVIEW_PROGRESS synthetic User-Agent on in-process review requests; no network listener')
