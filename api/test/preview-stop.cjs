const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict')
const stateFile = path.join(__dirname, '.preview-state.json')
if (!fs.existsSync(stateFile)) { console.log('No managed preview is running.'); process.exit(0) }
const state = JSON.parse(fs.readFileSync(stateFile))
assert.match(state.database, /^hr_preview_test_[a-f0-9]{16}$/)
assert.equal(path.dirname(path.resolve(state.uploads)), require('node:os').tmpdir())
assert.match(path.basename(state.uploads), /^hr-preview-files-/)
fs.writeFileSync(path.join(state.uploads, 'stop'), '')
console.log('Requested graceful preview shutdown and cleanup.')
