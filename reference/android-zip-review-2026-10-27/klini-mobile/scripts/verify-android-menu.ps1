$ErrorActionPreference = 'Stop'
$device = 'emulator-5554'
$output = Join-Path (Get-Location) 'test-results'
New-Item -ItemType Directory -Path $output -Force | Out-Null
function Read-Ui {
  & adb -s $device shell uiautomator dump /sdcard/klini-menu-check.xml | Out-Null
  & adb -s $device pull /sdcard/klini-menu-check.xml "$output/android-ui.xml" 2>$null | Out-Null
  return [xml](Get-Content "$output/android-ui.xml" -Raw)
}
function Tap-Control([xml]$ui, [string]$id) {
  $node = $ui.SelectSingleNode("//node[@resource-id='$id']")
  if (-not $node) { throw "Control no encontrado: $id" }
  $coords = [regex]::Matches($node.bounds, '\d+') | ForEach-Object { [int]$_.Value }
  $x = [int](($coords[0] + $coords[2]) / 2)
  $y = [int](($coords[1] + $coords[3]) / 2)
  & adb -s $device shell input tap $x $y
}
function Capture([string]$name) {
  & adb -s $device shell screencap -p /sdcard/klini-menu-check.png
  & adb -s $device pull /sdcard/klini-menu-check.png "$output/$name.png" 2>$null | Out-Null
}
$ui = Read-Ui
$toggle = $ui.SelectSingleNode("//node[@resource-id='header-menu']")
if ($toggle.'content-desc' -eq 'Cerrar menú') { Tap-Control $ui 'header-menu'; $ui = Read-Ui }
Capture 'android-home-search'
Tap-Control $ui 'header-menu'
$ui = Read-Ui
if (-not $ui.SelectSingleNode("//node[@resource-id='nav-wallet']")) { throw 'El menú no abrió' }
if ($ui.SelectSingleNode("//node[@resource-id='nav-profile']")) { throw 'Perfil duplicado en el menú izquierdo' }
Capture 'android-side-menu'
& adb -s $device shell input keyevent 4
$ui = Read-Ui
if ($ui.SelectSingleNode("//node[@resource-id='header-panel']")) { throw 'Atrás no cerró el menú' }
Tap-Control $ui 'header-profile'
$ui = Read-Ui
if (-not $ui.SelectSingleNode("//node[@text='Mi perfil']")) { throw 'El botón derecho no abrió el perfil' }
Capture 'android-profile'
& adb -s $device shell input keyevent 4
$ui = Read-Ui
Tap-Control $ui 'header-menu'
$ui = Read-Ui
Capture 'android-side-menu'
Write-Output 'PASS: Android menu opens; Back closes it; profile is only in the right header button; profile route opens and returns.'
