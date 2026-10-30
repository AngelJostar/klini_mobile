param([ValidateSet('server', 'mobile')][string]$Service = 'server')
$ErrorActionPreference = 'Stop'
$runtime = Join-Path $PSScriptRoot '.runtime-temp'
New-Item -ItemType Directory -Force $runtime | Out-Null
$env:TEMP = $runtime
$env:TMP = $runtime
if ($Service -eq 'server') {
    Set-Location (Join-Path $PSScriptRoot 'social-server')
    php artisan serve --host=127.0.0.1 --port=8010 --no-reload
} else {
    Set-Location (Join-Path $PSScriptRoot 'mobile')
    npx expo start --go --port 8082 --localhost
}
