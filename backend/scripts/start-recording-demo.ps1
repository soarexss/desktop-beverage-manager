param([switch]$Seed)
$ErrorActionPreference = 'Stop'
$recordingRoot = Split-Path $PSScriptRoot -Parent
Set-Location $recordingRoot
if (-not (Test-Path -LiteralPath '.env.recording')) { throw 'Crie .env.recording conforme docs/GRAVACAO_E_ANDROID.md. Nunca use credenciais de produção.' }
foreach ($recordingLine in [IO.File]::ReadAllLines((Join-Path $recordingRoot '.env.recording'))) {
    if ($recordingLine -match '^([A-Z][A-Z0-9_]*)=(.*)$') { [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process') }
}
if ($env:NODE_ENV -eq 'production' -or $env:ALLOW_DEMO_SEED -ne 'true' -or $env:DATABASE_URL -notmatch '^postgresql://[^@]+@(?:127\.0\.0\.1|localhost):\d+/erp_demo_[a-z0-9_]+(?:\?.*)?$') { throw 'Este launcher exige banco local erp_demo_* e modo de demonstração.' }
$env:HOST = '127.0.0.1'
if ($Seed) { node scripts/seed-recording-demo.cjs; exit $LASTEXITCODE }
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
if (-not (Test-Path -LiteralPath 'dist/src/main.js')) { npm run build; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }
node dist/src/main.js
