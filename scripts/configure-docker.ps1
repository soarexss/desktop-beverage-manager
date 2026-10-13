$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
if (Test-Path -LiteralPath '.env') {
    Write-Output 'A configuracao .env existente foi preservada. Consulte docs/DOCKER.md antes de alterar um banco existente.'
    exit 0
}
function New-LocalSecret {
    $bytes = New-Object byte[] 32
    $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generator.GetBytes($bytes) } finally { $generator.Dispose() }
    return -join ($bytes | ForEach-Object { $_.ToString('x2') })
}
$databasePassword = New-LocalSecret
$accessSecret = New-LocalSecret
$refreshSecret = New-LocalSecret
$dockerSettings = @(
    'POSTGRES_USER=distribev',
    "POSTGRES_PASSWORD=$databasePassword",
    'POSTGRES_DB=erp_demo_gravacao',
    "DOCKER_DATABASE_URL=postgresql://distribev:${databasePassword}@postgres:5432/erp_demo_gravacao",
    "JWT_SECRET=$accessSecret",
    "JWT_REFRESH_SECRET=$refreshSecret",
    'ERP_POSTGRES_VOLUME=distribev_postgres_data'
)
docker volume create distribev_postgres_data | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel criar o volume Docker. Inicie o Docker Desktop e tente novamente.' }
[IO.File]::WriteAllLines((Join-Path (Get-Location) '.env'), $dockerSettings, (New-Object Text.UTF8Encoding $false))
Write-Output 'Configuracao local criada. Execute docker compose up -d --build --wait. O banco novo inicia vazio; crie seu administrador conforme docs/DOCKER.md.'
