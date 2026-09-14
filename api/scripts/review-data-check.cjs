'use strict'
// Read-only acceptance inventory on the retained review copy. No payroll tables or personal values are exported.
const { fs, path, pool, reviewGuard, artifactPath } = require('./migrations-lib.cjs')
const manifest = JSON.parse(fs.readFileSync(artifactPath('review-database.json'), 'utf8'))
reviewGuard(manifest.database)
async function main() {
  const connection = await pool(manifest.database)
  try {
    const checks = [
      ['activeEmployees', `SELECT COUNT(*) n FROM employees WHERE isActive=1 AND status='active'`],
      ['activeEmployeesWithoutJobTitle', `SELECT COUNT(*) n FROM employees WHERE isActive=1 AND status='active' AND NULLIF(LTRIM(RTRIM(jobTitle)),'') IS NULL`],
      ['activeEmployeesWithoutJoinDate', `SELECT COUNT(*) n FROM employees WHERE isActive=1 AND status='active' AND joinDate IS NULL`],
      ['employeesWithMissingBranch', `SELECT COUNT(*) n FROM employees e LEFT JOIN branches b ON b.id=e.branchId WHERE e.branchId IS NOT NULL AND b.id IS NULL`],
      ['usersWithMissingEmployee', `SELECT COUNT(*) n FROM users u LEFT JOIN employees e ON e.id=u.employeeId WHERE u.employeeId IS NOT NULL AND e.id IS NULL`],
      ['requestsWithMissingEmployee', `SELECT COUNT(*) n FROM requests r LEFT JOIN employees e ON e.id=r.requesterId WHERE e.id IS NULL`],
      ['activeTypesWithoutApprovalChain', `SELECT COUNT(*) n FROM request_types t LEFT JOIN approval_chains c ON c.id=t.approvalChainId WHERE t.isActive=1 AND c.id IS NULL`],
      ['activeLetterTypesWithoutPublishedTemplate', `SELECT COUNT(*) n FROM request_types t LEFT JOIN letter_template_bindings b ON b.requestTypeCode=t.code LEFT JOIN letter_templates p ON p.id=b.templateId WHERE t.isActive=1 AND t.destinationHandler='letter_pdf_generator' AND (p.id IS NULL OR p.isActive=0 OR p.publishedRevisionId IS NULL)`],
      ['companyNameConfigured', `SELECT COUNT(*) n FROM requests_config WHERE [key]='company.name' AND NULLIF(LTRIM(RTRIM(value)),'') IS NOT NULL`],
      ['storedFiles', `SELECT COUNT(*) n FROM stored_files`],
    ]
    const counts = {}
    for (const [name, query] of checks) counts[name] = (await connection.request().query(query)).recordset[0].n
    const runtime = JSON.parse(fs.readFileSync(artifactPath('review-server-state.json'), 'utf8'))
    reviewGuard(runtime.database)
    if (runtime.database !== manifest.database) throw new Error('Review storage identity mismatch')
    const rows = (await connection.request().query('SELECT storedName FROM stored_files')).recordset
    let missingFiles = 0, invalidStoragePaths = 0
    const root = path.resolve(runtime.uploads)
    for (const row of rows) {
      const file = path.resolve(root, row.storedName)
      if (!file.startsWith(root + path.sep)) { invalidStoragePaths++; continue }
      if (!fs.existsSync(file)) missingFiles++
    }
    const result = { checkedAt: new Date().toISOString(), database: manifest.database, readOnly: true, counts,
      storage: { missingFiles, invalidStoragePaths },
      interpretation: 'Aggregate setup/data checks, not fabricated corrections. Missing employee fields need the owner’s real values; missing files need their original upload/backup. Type approval policies remain an owner setting.' }
    fs.writeFileSync(artifactPath('review-data-check.json'), JSON.stringify(result, null, 2))
    console.log(JSON.stringify(result, null, 2))
  } finally { await connection.close() }
}
main().catch(error => { console.error(error.name + ': ' + error.message); process.exitCode = 1 })
