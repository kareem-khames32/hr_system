'use strict'
// Transport fixture only: Express defaults to ignoring files below the supplied .claude worktree.
// Permit dot directory segments solely for this test's known private PDF fixtures, after real guards/file access.
const path=require('node:path'),response=require('../node_modules/express').response
const original=response.sendFile,root=path.resolve(__dirname,'codex-review-round39-tmp')+path.sep
response.sendFile=function(file,options,callback){
 const target=path.resolve(String(file)),relative=target.startsWith(root)?target.slice(root.length):''
 if(/^hr-sec1-files-[^\\/]+[\\/]letters[\\/][a-f0-9-]+\.pdf$/i.test(relative)){
  return original.call(this,file,{...(options&&typeof options==='object'?options:{}),dotfiles:'allow'},typeof options==='function'?options:callback)
 }
 return original.call(this,file,options,callback)
}
console.log('CR39_TRANSPORT private PDF fixture permits dot directory segments; authorization and storage checks unchanged')
