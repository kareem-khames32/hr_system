'use strict'
// Express sendFile rejects a .claude ancestor of the disposable upload directory.
// Change only transport options for this review's private files, after the real
// controller/access checks; never permit another path or start a listener.
const path=require('node:path'),response=require('../node_modules/express').response
const original=response.sendFile,root=path.resolve(__dirname,'codex-review-p8b-tmp')+path.sep
response.sendFile=function(file,options,callback){
 const target=path.resolve(String(file)),relative=target.startsWith(root)?target.slice(root.length):''
 if(relative && !relative.startsWith('..') && path.isAbsolute(target))return original.call(this,file,{...(options&&typeof options==='object'?options:{}),dotfiles:'allow'},typeof options==='function'?options:callback)
 return original.call(this,file,options,callback)
}
console.log('REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged')
