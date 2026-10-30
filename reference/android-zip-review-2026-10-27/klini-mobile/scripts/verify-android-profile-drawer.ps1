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
foreach($id in @('directory-close','agenda-close','profile-close')) {if($ui.SelectSingleNode("//node[@resource-id='$id']")){Tap-Control $ui $id;$ui=Read-Ui}}
Tap-Control $ui 'header-profile'
$ui=Read-Ui
if(-not $ui.SelectSingleNode("//node[@resource-id='profile-drawer']")){throw 'No se abrió el panel de perfil'}
Capture 'android-profile-drawer'
Write-Output 'PASS Android profile drawer visible.'
