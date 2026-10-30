$ErrorActionPreference = 'Stop'
$appDirectory = Split-Path $PSScriptRoot -Parent
$secretPath = Join-Path $appDirectory '.local/vision-key.dpapi'
if (!(Test-Path -LiteralPath $secretPath)) { throw 'Ejecuta primero scripts/configure-ocr.ps1.' }
$secureKey = (Get-Content -LiteralPath $secretPath -Raw).Trim() | ConvertTo-SecureString
$keyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
try {
  $env:GOOGLE_VISION_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyPointer)
  Push-Location $appDirectory
  try { & node --import tsx scripts/ocr-server.ts }
  finally { Pop-Location }
} finally {
  Remove-Item Env:GOOGLE_VISION_API_KEY -ErrorAction SilentlyContinue
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyPointer)
  $secureKey.Dispose()
}
