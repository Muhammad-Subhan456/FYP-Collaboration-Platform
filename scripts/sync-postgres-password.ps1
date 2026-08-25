# Sync Docker Postgres role password to root .env POSTGRES_PASSWORD.
# Important: 127.0.0.1 uses pg_hba "trust" — always ALTER, then verify via Docker DNS.
# Usage: powershell -File scripts/sync-postgres-password.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root '.env'
if (-not (Test-Path $envFile)) { throw ".env not found at $envFile" }

$raw = Get-Content $envFile -Raw
$pgPass = $null
if ($raw -match '(?m)^POSTGRES_PASSWORD=(.+)$') {
  $pgPass = $Matches[1].Trim().Trim('"').Trim("'")
}
if (-not $pgPass) { throw 'POSTGRES_PASSWORD missing in .env' }

Write-Host 'Resetting role password via peer auth to match .env POSTGRES_PASSWORD...'
$sqlPass = $pgPass.Replace("'", "''")
$sql = "ALTER USER foasis WITH PASSWORD '$sqlPass';"
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($sql))

docker exec foasis-postgres sh -c "echo $b64 | base64 -d > /tmp/alter_foasis_pw.sql"
if ($LASTEXITCODE -ne 0) { throw 'Failed to write SQL file in container' }

docker exec foasis-postgres psql -U foasis -d postgres -v ON_ERROR_STOP=1 -f /tmp/alter_foasis_pw.sql
if ($LASTEXITCODE -ne 0) { throw 'ALTER USER failed' }

docker exec foasis-postgres rm -f /tmp/alter_foasis_pw.sql
Write-Host 'ALTER USER succeeded. Recreate backend to confirm: docker compose -f docker-compose.prod.yml --env-file .env up -d --force-recreate backend'
