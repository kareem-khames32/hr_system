'use strict'
require('./codex-review-p4b-transport-preload.cjs')
// Windows working tree has CRLF; match git's LF SQL bytes in memory only.
const fs=require('node:fs'),original=fs.readFileSync
fs.readFileSync=function(file,...args){let result=original.call(this,file,...args);if(typeof file==='string'&&/docs[\\/]migrations[\\/].+\.sql$/.test(file)){if(Buffer.isBuffer(result))result=Buffer.from(result.toString('utf8').replace(/\r\n/g,'\n'));else result=result.replace(/\r\n/g,'\n')}return result}
