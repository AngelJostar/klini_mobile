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
Tap-Control $ui 'header-menu'
$ui = Read-Ui
if ($ui.SelectSingleNode("//node[@resource-id='nav-agenda']")) { throw 'Agenda sigue en el lateral' }
Tap-Control $ui 'nav-wallet'
$ui = Read-Ui
if (-not $ui.SelectSingleNode("//node[@resource-id='wallet-sheet']")) { throw 'Billetera no abre' }
Capture 'android-wallet'
& adb -s $device shell input swipe 700 2480 700 1100 400
$ui = Read-Ui
Tap-Control $ui 'wallet-recharge'
$ui = Read-Ui
if (-not $ui.SelectSingleNode("//node[@text='Recarga de demostración guardada.']")) { throw 'Recarga no se guardó' }
Capture 'android-wallet-recharged'
& adb -s $device shell input keyevent 4
$ui = Read-Ui
Tap-Control $ui 'menu-agenda'
$ui = Read-Ui
Capture 'android-agenda-from-home'
if (-not $ui.SelectSingleNode("//node[@text='Mi agenda']")) { throw 'Agenda no abrió desde inicio' }
& adb -s $device shell input keyevent 4
$ui = Read-Ui
Tap-Control $ui 'header-menu'
$ui = Read-Ui
Tap-Control $ui 'nav-wallet'
$ui = Read-Ui
Capture 'android-wallet'
Write-Output 'PASS: Android wallet opens, recharge saves, Back closes, agenda opens from home; wallet left open.'
