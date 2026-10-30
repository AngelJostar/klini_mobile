param([string]$device = 'emulator-5554')
$ErrorActionPreference = 'Stop'
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
if ($ui.SelectSingleNode("//node[@resource-id='record-type-close']")) { Tap-Control $ui 'record-type-close'; $ui = Read-Ui }
if ($ui.SelectSingleNode("//node[@resource-id='profile-close']")) { Tap-Control $ui 'profile-close'; $ui = Read-Ui }
if ($ui.SelectSingleNode("//node[@resource-id='quick-register']")) { Tap-Control $ui 'quick-register'; $ui = Read-Ui }
if (-not $ui.SelectSingleNode("//node[@resource-id='record-categories']")) { throw 'Registro no abrió las categorías' }
Tap-Control $ui 'record-category-Consulta'
$ui = Read-Ui
foreach ($id in @('record-type-photo', 'record-type-text', 'record-type-file')) {
  if (-not $ui.SelectSingleNode("//node[@resource-id='$id']")) { throw "Opción no encontrada: $id" }
}
Capture 'android-register-type-popup'
& adb -s $device shell input keyevent 4
$ui = Read-Ui
if ($ui.SelectSingleNode("//node[@resource-id='record-type-popup']")) { throw 'Atrás no cerró el selector' }
if (-not $ui.SelectSingleNode("//node[@resource-id='record-categories']")) { throw 'Atrás salió de Registro' }
Tap-Control $ui 'record-category-Vacuna'
$ui = Read-Ui
Tap-Control $ui 'record-type-text'
$ui = Read-Ui
if (-not $ui.SelectSingleNode("//node[@resource-id='record-title']")) { throw 'Texto no abrió el formulario' }
& adb -s $device shell input keyevent 4
$ui = Read-Ui
if (-not $ui.SelectSingleNode("//node[@resource-id='record-categories']")) { throw 'No volvió a las categorías' }
Capture 'android-register-categories'
Write-Output 'PASS Android: categoría abre selector, tres opciones, Texto abre formulario y Atrás vuelve sin guardar datos.'
