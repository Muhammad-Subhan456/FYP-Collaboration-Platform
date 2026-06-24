# Backup all FOASIS microservice databases before Phase 5 cutover.
# Edit $Databases if your local DB names differ.

param(
  [string]$Host = "localhost",
  [string]$Port = "5432",
  [string]$User = "postgres",
  [string]$BackupDir = ".\db-backups"
)

$Databases = @(
  "fyp_auth",
  "fyp_users",
  "fyp_teams",
  "fyp_proposals",
  "fyp_notifications",
  "fyp_progress",
  "foasis_db"
)

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outDir = Join-Path $BackupDir $timestamp
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

Write-Host "Backing up to $outDir"

foreach ($db in $Databases) {
  $outFile = Join-Path $outDir "$db.dump"
  Write-Host "  $db -> $outFile"
  pg_dump -h $Host -p $Port -U $User -Fc -f $outFile $db
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "pg_dump failed for $db (database may not exist)"
  }
}

Write-Host "Done."
