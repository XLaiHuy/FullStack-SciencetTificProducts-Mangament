param(
  [string]$NodeBaseUrl = 'http://localhost:3000',
  [string]$SpringBaseUrl = 'http://localhost:8080',
  [string]$OutDir = 'docs/deploy/reports',
  [string]$ModeLabel = 'seeded-business',
  [string]$SmokeMode = 'strict'
)

$ErrorActionPreference = 'Stop'
$workspaceRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$outPath = Join-Path $workspaceRoot $OutDir
if (-not (Test-Path $outPath)) {
  New-Item -Path $outPath -ItemType Directory -Force | Out-Null
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$nodeApiOut = Join-Path $outPath "node-api-$ModeLabel-$stamp.log"
$nodeFlowOut = Join-Path $outPath "node-workflow-$ModeLabel-$stamp.log"
$springApiOut = Join-Path $outPath "spring-api-$ModeLabel-$stamp.log"
$springFlowOut = Join-Path $outPath "spring-workflow-$ModeLabel-$stamp.log"
$summaryOut = Join-Path $outPath "regression-summary-$ModeLabel-$stamp.md"

function Run-Smoke {
  param(
    [string]$BackendBaseUrl,
    [string]$ApiOut,
    [string]$FlowOut
  )

  $env:SMOKE_MODE = $SmokeMode
  & powershell -ExecutionPolicy Bypass -File (Join-Path $workspaceRoot 'scripts/smoke/smoke_test_api.ps1') -BackendBaseUrl $BackendBaseUrl *> $ApiOut
  $apiExit = $LASTEXITCODE
  & powershell -ExecutionPolicy Bypass -File (Join-Path $workspaceRoot 'scripts/smoke/smoke_test_workflow.ps1') -BackendBaseUrl $BackendBaseUrl *> $FlowOut
  $flowExit = $LASTEXITCODE
  return @{
    ApiExit = $apiExit
    FlowExit = $flowExit
  }
}

function Get-Result {
  param([int]$ApiExit, [int]$FlowExit)
  if ($ApiExit -eq 0 -and $FlowExit -eq 0) { return 'PASS' }
  return 'FAIL'
}

$nodeResult = Run-Smoke -BackendBaseUrl $NodeBaseUrl -ApiOut $nodeApiOut -FlowOut $nodeFlowOut
$springResult = Run-Smoke -BackendBaseUrl $SpringBaseUrl -ApiOut $springApiOut -FlowOut $springFlowOut

$nodeStatus = Get-Result -ApiExit $nodeResult.ApiExit -FlowExit $nodeResult.FlowExit
$springStatus = Get-Result -ApiExit $springResult.ApiExit -FlowExit $springResult.FlowExit

$summary = @"
# Dual-run Regression Summary ($ModeLabel)

- Timestamp: $stamp
- Node Base URL: $NodeBaseUrl
- Spring Base URL: $SpringBaseUrl
- Smoke mode: $SmokeMode

## Result

| Backend | API Smoke | Workflow Smoke | Overall |
|---|---:|---:|---|
| Node | $($nodeResult.ApiExit) | $($nodeResult.FlowExit) | $nodeStatus |
| Spring | $($springResult.ApiExit) | $($springResult.FlowExit) | $springStatus |

## Logs

- Node API: $nodeApiOut
- Node Workflow: $nodeFlowOut
- Spring API: $springApiOut
- Spring Workflow: $springFlowOut
"@

Set-Content -Path $summaryOut -Value $summary -Encoding UTF8
Write-Output "Summary written: $summaryOut"

if ($springStatus -ne 'PASS') {
  exit 1
}
