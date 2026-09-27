'use strict'
// Disposable fixture files stay under this review's test directory, never the application's uploads.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'codex-review-round13-tmp')
assert.equal(path.dirname(root),path.resolve(__dirname))
fs.mkdirSync(root,{recursive:true})
os.tmpdir=()=>root
