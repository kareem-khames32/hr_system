'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const source=path.join(__dirname,'codex-review-round35-downstream.integration.cjs'),target=path.join(__dirname,'codex-review-round36-boundaries.integration.cjs')
assert.ok(!fs.existsSync(target),'Do not overwrite review tests')
fs.writeFileSync(target,fs.readFileSync(source,'utf8').replaceAll('round35','round36').replaceAll('CR35','CR36').replaceAll('r35','r36'))
