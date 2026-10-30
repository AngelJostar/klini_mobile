$ErrorActionPreference = 'Stop'
$appDirectory = Split-Path $PSScriptRoot -Parent
$secretDirectory = Join-Path $appDirectory '.local'
$secretPath = Join-Path $secretDirectory 'vision-key.dpapi'
Write-Host 'Pega la clave de Cloud Vision. No se mostrara en pantalla.'
$secureKey = Read-Host 'Clave de API' -AsSecureString
if ($secureKey.Length -lt 20) { throw 'La clave parece incompleta. Ejecuta nuevamente este script.' }
New-Item -ItemType Directory -Path $secretDirectory -Force | Out-Null
# Windows DPAPI: only this Windows user can decrypt the saved value.
$secureKey | ConvertFrom-SecureString | Set-Content -LiteralPath $secretPath
$secureKey.Dispose()
Write-Host 'Credencial guardada cifrada para tu usuario de Windows. Puedes volver a Codex y decir: Guardada.'
