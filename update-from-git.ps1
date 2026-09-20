# Updates this server (OUTLOOK-HQ / 10.23.0.222) from git and restarts both services.
#
# Workflow: edit on your machine -> git push -> run this script here.
#
#   powershell -ExecutionPolicy Bypass -File C:\Users\Kareem.khamis\Documents\hr_system\update-from-git.ps1
#
# Secrets live only in api\.env and .env.production.local (both git-ignored) and are never touched.
# Database schema changes are NOT applied automatically: the script stops and tells you
# to run the consolidated migrator, exactly as docs/migrations/README.md requires.

$ErrorActionPreference = 'Stop'
$root = 'C:\Users\Kareem.khamis\Documents\hr_system'
$branch = 'payroll-2026-09-14'
$apiPort = 4000
$webPort = 3001   # 3000 is taken by the HasselPlus app already running on this server

# SQL Server here is a NATIVE Windows install (no Docker), and the default backup folder under
# Program Files is not readable by a non-admin account, so the migrator needs these:
$env:HR_SQL_BACKUP_DIR    = 'C:\SQLBackup'
$env:HR_FREEZE_BACKUP_DIR = 'C:\SQLBackup\freeze'
$env:HR_COMPANY_BACKUP    = 'C:\SQLBackup\hr_system_2019_20260917150253.bak'

Set-Location $root

function Stop-OnPort([int]$port, [string]$label) {
  $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  foreach ($c in $conns) {
    try {
      Stop-Process -Id $c.OwningProcess -Force -ErrorAction Stop
      Write-Host "stopped $label (pid $($c.OwningProcess))" -ForegroundColor DarkGray
    } catch { Write-Host "could not stop pid $($c.OwningProcess): $($_.Exception.Message)" -ForegroundColor Yellow }
  }
}

Write-Host '=== 1/6  Pulling latest code ===' -ForegroundColor Cyan
$dirty = git status --porcelain
if ($dirty) { Write-Host 'Local uncommitted changes present:'; $dirty; Write-Host 'Commit or stash them first.' -ForegroundColor Yellow; exit 1 }
git fetch origin
git checkout $branch
git pull --ff-only origin $branch
if ($LASTEXITCODE -ne 0) { throw 'git pull failed' }

Write-Host '=== 2/6  Installing dependencies ===' -ForegroundColor Cyan
npm ci
Set-Location "$root\api"
npm ci

Write-Host '=== 3/6  Checking for pending database migrations ===' -ForegroundColor Cyan
Set-Location $root
$plan = node api/scripts/db-migrate.cjs plan 2>&1 | Out-String
Write-Host $plan
if ($plan -notmatch 'pending:\s*0') {
  Write-Host 'Pending migrations found. Stop the API and apply them before continuing:' -ForegroundColor Yellow
  Write-Host '  node api/scripts/db-migrate.cjs apply --company' -ForegroundColor Yellow
  exit 1
}

Write-Host '=== 4/6  Building ===' -ForegroundColor Cyan
Set-Location "$root\api"; npm run build
Set-Location $root;       npm run build

Write-Host '=== 5/6  Restarting services ===' -ForegroundColor Cyan
Stop-OnPort $apiPort 'API'
Stop-OnPort $webPort 'web'
Start-Sleep -Seconds 2
Start-Process -FilePath 'node' -ArgumentList 'dist/main.js' -WorkingDirectory "$root\api" -WindowStyle Hidden
Start-Process -FilePath 'npx.cmd' -ArgumentList "next start -H 0.0.0.0 -p $webPort" -WorkingDirectory $root -WindowStyle Hidden

Write-Host '=== 6/6  Verifying ===' -ForegroundColor Cyan
$ok = $false
foreach ($i in 1..30) {
  Start-Sleep -Seconds 3
  try {
    $h = Invoke-RestMethod "http://127.0.0.1:$apiPort/api/health" -TimeoutSec 5
    $w = (Invoke-WebRequest "http://127.0.0.1:$webPort/login" -TimeoutSec 5 -UseBasicParsing).StatusCode
    if ($h.status -eq 'ok' -and $w -eq 200) { $ok = $true; break }
  } catch { }
}
if ($ok) {
  Write-Host ''
  Write-Host "OK  API : http://10.23.0.222:$apiPort/api  (db: up)" -ForegroundColor Green
  Write-Host "OK  Web : http://10.23.0.222:$webPort" -ForegroundColor Green
} else {
  Write-Host 'Services did not come up in time. Check the two hidden node windows / run them in the foreground.' -ForegroundColor Red
  exit 1
}
