'use strict'
// The supplied worktree is never copied or removed. Only our private temporary test directory is used.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os')
const temporary=path.join(__dirname,'codex-review-round38-tmp')
fs.mkdirSync(temporary,{recursive:true});os.tmpdir=()=>temporary
