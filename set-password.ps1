# Asks for the PostgreSQL password and writes it into .env (the password is not shown while typing).
$envFile = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path $envFile)) { Copy-Item (Join-Path $PSScriptRoot ".env.example") $envFile }

$user = Read-Host "PostgreSQL user (press Enter for postgres)"
if (-not $user) { $user = "postgres" }
$secure = Read-Host "PostgreSQL password" -AsSecureString
$plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
$encoded = [Uri]::EscapeDataString($plain)

$url = "DATABASE_URL=postgres://${user}:${encoded}@localhost:5432/agent_studio"
$lines = Get-Content $envFile | ForEach-Object { if ($_ -like "DATABASE_URL=*") { $url } else { $_ } }
[IO.File]::WriteAllLines($envFile, $lines)
Write-Host "Saved. Testing the connection..."

Set-Location $PSScriptRoot
npm run db:setup
if ($LASTEXITCODE -eq 0) { Write-Host "`nAll good. Use the Agent Studio shortcut on the Desktop." -ForegroundColor Green }
else { Write-Host "`nThe password was not accepted. Run this again." -ForegroundColor Red }
Read-Host "Press Enter to close"
