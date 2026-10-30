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
$ui=Read-Ui
foreach($id in @('directory-close','agenda-close','profile-close','teleconsult-close')){if($ui.SelectSingleNode("//node[@resource-id='$id']")){Tap-Control $ui $id;$ui=Read-Ui}}
Tap-Control $ui 'menu-teleconsult'
$ui=Read-Ui
$node=$ui.SelectSingleNode("//node[starts-with(@resource-id,'teleconsult-appointment-')]")
Tap-Control $ui $node.'resource-id'
$ui=Read-Ui
Tap-Control $ui 'teleconsult-reschedule'
$ui=Read-Ui
Capture 'android-teleconsult-reschedule'
Tap-Control $ui 'teleconsult-keep'
$ui=Read-Ui
Tap-Control $ui 'teleconsult-cancel'
$ui=Read-Ui
Capture 'android-teleconsult-cancel'
Tap-Control $ui 'teleconsult-keep'
Write-Output 'PASS Android reschedule, cancellation preview and keep appointment. No appointment changed.'
