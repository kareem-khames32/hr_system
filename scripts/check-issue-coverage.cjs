'use strict'
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const issueRow = /^\|\s*((?:SEC-SET|SEC-REQ|SEC-EMP|SEC-ATT|SEC-LEV|SEC|SET|EMP|ATT|LEV|REQ|DSH|NAM)-\d+)\s*\|/gm
// Compare original issue rows, excluding narrative references and sample request numbers.
const original = new Set([...fs.readFileSync(path.join(root, 'OUR_TECH_DEFECTS.md'), 'utf8').matchAll(issueRow)].map(match => match[1]))
const files = ['docs/RELEASE_ISSUE_MATRIX_W12.md', 'docs/WAVE3_VERIFICATION_MATRIX.md', 'docs/W45_FINAL_MATRIX.md']
const rows = []
const detail = files.map(file => {
  const selected = fs.readFileSync(path.join(root, file), 'utf8').split(/\r?\n/).filter(line => line.startsWith('|') && !line.startsWith('|---'))
    .map(line => {
      const cells = line.split('|').slice(1, 4).map(cell => cell.trim())
      const index = cells.findIndex(cell => /^(?:(?:SEC-)?(?:SET|REQ|EMP|ATT|LEV)|SEC|DSH|NAM)-\d+$/.test(cell))
      return index < 0 ? null : { id: cells[index], status: cells[index + 1] }
    }).filter(Boolean)
  rows.push(...selected)
  return { path: file, count: selected.length, statuses: selected.reduce((counts, row) => ({ ...counts, [row.status]: (counts[row.status] || 0) + 1 }), {}) }
})
const unique = new Set(rows.map(row => row.id))
const result = { checkedAt: new Date().toISOString(), original: original.size, matrix: rows.length, unique: unique.size, files: detail,
  missing: [...original].filter(value => !unique.has(value)), extra: [...unique].filter(value => !original.has(value)),
  duplicates: [...unique].filter(value => rows.filter(row => row.id === value).length > 1) }
fs.writeFileSync(path.join(root, 'output/issue-coverage.json'), JSON.stringify(result, null, 2))
console.log(JSON.stringify(result, null, 2))
if (result.missing.length || result.extra.length || result.duplicates.length) process.exitCode = 1
