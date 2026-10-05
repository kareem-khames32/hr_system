'use strict'
// Transport-only: the supplied worktree is under .claude, a dot directory.
// Allow only this review's disposable upload fixtures, after real authorization.
const path=require('node:path'),response=require('../node_modules/express').response
const original=response.sendFile,root=path.resolve(__dirname,'codex-review-p2b-tmp')+path.sep
response.sendFile=function(file,options,callback){
 const target=path.resolve(String(file)),relative=target.startsWith(root)?target.slice(root.length):''
 if(/^(hr-file-upload-files-|hr-profile-files-|hr-sec1-files-|hr-letter-files-|hr-hrdoc-files-|hr-documents-files-)[^\\/]+[\\/]/i.test(relative))return original.call(this,file,{...(options&&typeof options==='object'?options:{}),dotfiles:'allow'},typeof options==='function'?options:callback)
 return original.call(this,file,options,callback)
}
console.log('CRP1_TRANSPORT B2 private upload fixture permits dot directory segments; product authorization unchanged')
