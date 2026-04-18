param(
  [string]$NodeBaseUrl = 'http://localhost:3000',
  [string]$SpringBaseUrl = 'http://localhost:8080',
  [string]$ReportDir = 'docs/deploy/reports'
)

$ErrorActionPreference = 'Stop'
$workspaceRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$backDir = Join-Path $workspaceRoot 'src/back'
$regressionScript = Join-Path $workspaceRoot 'scripts/smoke/run_dual_parity_regression.ps1'

function Run-Step {
  param(
    [string]$Label,
    [scriptblock]$Action
  )
  Write-Output "==== $Label ===="
  & $Action
  if ($LASTEXITCODE -ne 0) {
    throw "Step failed: $Label"
  }
}

Run-Step -Label 'Mode clean-reset: reset business data' -Action {
  & powershell -Command "Set-Location -LiteralPath '$backDir'; npm run db:reset:business"
}

Run-Step -Label 'Mode clean-reset: dual-run regression' -Action {
  & powershell -ExecutionPolicy Bypass -File $regressionScript -NodeBaseUrl $NodeBaseUrl -SpringBaseUrl $SpringBaseUrl -OutDir $ReportDir -ModeLabel 'clean-reset'
}

Run-Step -Label 'Mode seeded-business: seed data' -Action {
  & powershell -Command "Set-Location -LiteralPath '$backDir'; npm run db:seed"
}

Run-Step -Label 'Mode seeded-business: dual-run regression' -Action {
  & powershell -ExecutionPolicy Bypass -File $regressionScript -NodeBaseUrl $NodeBaseUrl -SpringBaseUrl $SpringBaseUrl -OutDir $ReportDir -ModeLabel 'seeded-business'
}

Write-Output 'Parity DB mode regression completed.'
