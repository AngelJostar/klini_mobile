[CmdletBinding()]
param(
  [string]$Device = 'emulator-5560',
  [string]$AdbPath = 'C:\Users\Guillermo\AppData\Local\Android\Sdk\platform-tools\adb.exe',
  [ValidateRange(1, 5)][int]$Cycles = 3,
  [ValidateRange(5, 30)][int]$TimeoutSeconds = 15,
  [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\test-results\native-question-keyboard')
)

# Run only while Klini's home screen is already open in Expo Go. This script
# never starts/stops apps, changes settings, types a query or sends a key event.
# Only observed controls are tapped. In particular, it does NOT send Android
# Back: the IME's observed down button hides the keyboard between cycles.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$AppPackage = 'host.exp.exponent'
$RemoteXml = '/sdcard/klini-question-keyboard-check.xml'
$RemotePng = '/sdcard/klini-question-keyboard-check.png'
$RunId = Get-Date -Format 'yyyyMMdd-HHmmss'

if (-not (Test-Path -LiteralPath $AdbPath -PathType Leaf)) { throw 'No se encontró adb.exe en la ruta indicada.' }
$OutputDirectory = [IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null

function Invoke-KliniAdb([string[]]$AdbArguments) {
  $result = & $AdbPath -s $Device @AdbArguments 2>&1
  if ($LASTEXITCODE -ne 0) { throw "Falló ADB al ejecutar $($AdbArguments[0])." }
  return ($result -join "`n")
}

function Read-KliniUi {
  Invoke-KliniAdb @('shell', 'uiautomator', 'dump', '--windows', $RemoteXml) | Out-Null
  $raw = Invoke-KliniAdb @('shell', 'cat', $RemoteXml)
  try { return [xml]$raw } catch { throw 'ADB no devolvió una jerarquía XML válida.' }
}

function Get-NodeBounds([System.Xml.XmlNode]$Node) {
  if (-not $Node) { throw 'No se encontró el control requerido.' }
  $bounds = $Node.GetAttribute('bounds')
  $match = [regex]::Match($bounds, '^\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]$')
  if (-not $match.Success) { throw 'El control no tiene límites de pantalla válidos.' }
  $left = [int]$match.Groups[1].Value; $top = [int]$match.Groups[2].Value
  $right = [int]$match.Groups[3].Value; $bottom = [int]$match.Groups[4].Value
  return [pscustomobject]@{ Left = $left; Top = $top; Right = $right; Bottom = $bottom; Width = $right - $left; Height = $bottom - $top }
}

function Get-QuestionInput([xml]$Ui) {
  $node = $Ui.SelectSingleNode("//window[@type='TYPE_APPLICATION' and @focused='true']//node[@package='$AppPackage' and @resource-id='home-search']")
  if (-not $node) { throw 'Klini no está en primer plano con el buscador visible. Abre su inicio y vuelve a ejecutar.' }
  if ($Ui.SelectSingleNode("//node[@package='$AppPackage' and @resource-id='klini-ai-conversation']")) { throw 'Cierra la conversación antes de verificar el buscador del inicio.' }
  return $node
}

function Get-KeyboardSnapshot([xml]$Ui) {
  $inputNode = Get-QuestionInput $Ui
  $ime = $null; $imeBounds = $null
  foreach ($candidate in @($Ui.SelectNodes("//window[@type='TYPE_INPUT_METHOD']"))) {
    $candidateBounds = Get-NodeBounds $candidate
    if ($candidateBounds.Height -gt 200 -and $candidateBounds.Width -gt 200) { $ime = $candidate; $imeBounds = $candidateBounds; break }
  }
  $imeState = Invoke-KliniAdb @('shell', 'dumpsys', 'input_method')
  $shownMatch = [regex]::Match($imeState, '\bmInputShown=(true|false)\b')
  $inputShown = if ($shownMatch.Success) { $shownMatch.Groups[1].Value -eq 'true' } else { $null }
  return [pscustomobject]@{
    Ui = $Ui
    InputNode = $inputNode
    InputBounds = (Get-NodeBounds $inputNode)
    InputFocused = $inputNode.GetAttribute('focused') -eq 'true'
    ImeWindow = $ime
    ImeBounds = $imeBounds
    InputShown = $inputShown
  }
}

function Wait-Keyboard([bool]$Visible) {
  $watch = [Diagnostics.Stopwatch]::StartNew()
  $last = $null
  do {
    $last = Get-KeyboardSnapshot (Read-KliniUi)
    if ($Visible) {
      # A focused caret or mInputShown alone never counts as a keyboard.
      if ($last.ImeWindow -and $last.InputShown -eq $true -and $last.InputFocused -and $last.InputBounds.Height -gt 0 -and $last.InputBounds.Bottom -le $last.ImeBounds.Top) {
        if ($last.Ui.SelectSingleNode("//node[@package='$AppPackage' and @resource-id='header-panel']")) { throw 'Apareció un panel de sugerencias al enfocar el buscador.' }
        return $last
      }
    } elseif (-not $last.ImeWindow -and $last.InputShown -eq $false) { return $last }
    Start-Sleep -Milliseconds 250
  } while ($watch.Elapsed.TotalSeconds -lt $TimeoutSeconds)
  $height = if ($last -and $last.ImeBounds) { $last.ImeBounds.Height } else { 0 }
  throw "No se alcanzó el estado de teclado esperado. Visible=$Visible; alto real IME=$height."
}

function Tap-ObservedNode([System.Xml.XmlNode]$Node) {
  $bounds = Get-NodeBounds $Node
  if ($bounds.Width -le 0 -or $bounds.Height -le 0 -or $bounds.Left -lt 0 -or $bounds.Top -lt 0) { throw 'El control no es pulsable dentro de la pantalla.' }
  $tapX = [int](($bounds.Left + $bounds.Right) / 2)
  $tapY = [int](($bounds.Top + $bounds.Bottom) / 2)
  Invoke-KliniAdb @('shell', 'input', 'tap', [string]$tapX, [string]$tapY) | Out-Null
}

function Hide-ObservedKeyboard($Snapshot) {
  # Observed on this emulator inside TYPE_INPUT_METHOD, bounds are read afresh.
  # Its content description is "Back", but this taps the IME's down control;
  # it never dispatches a Back key to the app's navigation stack.
  $down = $Snapshot.Ui.SelectSingleNode("//window[@type='TYPE_INPUT_METHOD']//node[@resource-id='android:id/input_method_nav_back']")
  if (-not $down) { throw 'El teclado no expone su botón observado para ocultarlo; se dejó Klini abierto sin enviar Atrás.' }
  Tap-ObservedNode $down
  return (Wait-Keyboard $false)
}

function Save-KeyboardEvidence($Snapshot, [int]$Cycle) {
  $prefix = Join-Path $OutputDirectory "$RunId-cycle-$Cycle"
  # Keep local UI evidence without writing the current question text to XML.
  $redacted = [xml]$Snapshot.Ui.OuterXml
  foreach ($node in @($redacted.SelectNodes("//node[@resource-id='home-search']"))) { $node.SetAttribute('text', '[redactado]') }
  $redacted.Save("$prefix.xml")
  Invoke-KliniAdb @('shell', 'screencap', '-p', $RemotePng) | Out-Null
  Invoke-KliniAdb @('pull', $RemotePng, "$prefix.png") | Out-Null
  return [pscustomobject]@{
    cycle = $Cycle
    imeWindowType = 'TYPE_INPUT_METHOD'
    imeHeight = $Snapshot.ImeBounds.Height
    imeTop = $Snapshot.ImeBounds.Top
    inputBottom = $Snapshot.InputBounds.Bottom
    inputFocused = $Snapshot.InputFocused
    inputShown = $Snapshot.InputShown
    inputAboveIme = $Snapshot.InputBounds.Bottom -le $Snapshot.ImeBounds.Top
    suggestionsAbsent = $true
    screenshot = "$prefix.png"
    ui = "$prefix.xml"
  }
}

if ((Invoke-KliniAdb @('get-state')).Trim() -ne 'device') { throw 'El emulador indicado no está disponible.' }
$initial = Get-KeyboardSnapshot (Read-KliniUi)
if ($initial.Ui.SelectSingleNode("//node[@package='$AppPackage' and @resource-id='header-panel']")) { throw 'Cierra el menú de Klini antes de iniciar esta comprobación.' }
$originalQuestion = $initial.InputNode.GetAttribute('text')
if ($initial.ImeWindow) { Hide-ObservedKeyboard $initial | Out-Null }
$results = @()
for ($cycle = 1; $cycle -le $Cycles; $cycle++) {
  $before = Read-KliniUi
  $questionInput = Get-QuestionInput $before
  if ($questionInput.GetAttribute('text') -ne $originalQuestion) { throw 'Cambió el texto del buscador durante la comprobación; no se modificó ni se envió desde el script.' }
  Tap-ObservedNode $questionInput
  $visible = Wait-Keyboard $true
  if ($visible.InputNode.GetAttribute('text') -ne $originalQuestion) { throw 'El buscador no conservó el texto original.' }
  $results += Save-KeyboardEvidence $visible $cycle
  if ($cycle -lt $Cycles) {
    $hidden = Hide-ObservedKeyboard $visible
    $results[-1] | Add-Member -NotePropertyName focusedAfterImeDismiss -NotePropertyValue $hidden.InputFocused
  }
}
$report = [pscustomobject]@{ result = 'PASS'; device = $Device; cycles = $results; queriesSent = 0; settingsChanged = $false; appLeftOpen = $true; keyboardLeftVisible = $true }
$report | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $OutputDirectory "$RunId-result.json") -Encoding utf8
$report | ConvertTo-Json -Depth 6
