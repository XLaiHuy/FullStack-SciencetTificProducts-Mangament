param(
  [ValidateSet('relaxed', 'strict')]
  [string]$SmokeMode = 'relaxed'
)

$ErrorActionPreference = 'Stop'

$workspace = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$backDir = Join-Path $workspace 'src\back'
$frontDir = Join-Path $workspace 'src\front'
$smokeScript = Join-Path $workspace 'scripts\smoke\smoke_test_api.ps1'
$backendPidFile = Join-Path $backDir 'ops-health-backend.pid'
$backendOutLog = Join-Path $backDir 'ops-health-backend.out.log'
$backendErrLog = Join-Path $backDir 'ops-health-backend.err.log'

function Run-Step {
  param(
    [string]$Name,
    [scriptblock]$Action
  )

  Write-Output "`n=== $Name ==="
  & $Action
}

function Stop-BackendIfStarted {
  if (-not (Test-Path $backendPidFile)) { return }

  $pidValue = (Get-Content $backendPidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
  Remove-Item $backendPidFile -Force -ErrorAction SilentlyContinue
  if (-not $pidValue) { return }

  try {
    $proc = Get-Process -Id [int]$pidValue -ErrorAction Stop
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    Write-Output "Stopped backend PID $($proc.Id)."
  } catch {
    Write-Output "Backend PID $pidValue already stopped."
  }
}

try {
  Run-Step -Name 'Backend build' -Action {
    Set-Location $backDir
    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'Backend build failed.' }
  }

  Run-Step -Name 'Frontend quality gate' -Action {
    Set-Location $frontDir
    npm run quality:all
    if ($LASTEXITCODE -ne 0) { throw 'Frontend quality gate failed.' }
  }

  Run-Step -Name 'Backend seed' -Action {
    Set-Location $backDir
    npm run db:seed
    if ($LASTEXITCODE -ne 0) { throw 'Backend seed failed.' }
  }

  Run-Step -Name 'Start backend for smoke test' -Action {
    $listeners = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue |
      Select-Object -ExpandProperty OwningProcess -Unique
    if ($listeners) {
      foreach ($listenerPid in $listeners) {
        Stop-Process -Id $listenerPid -Force -ErrorAction SilentlyContinue
      }
      Write-Output "Stopped existing listeners on port 3000: $($listeners -join ',')."
    }

    $proc = Start-Process -FilePath cmd.exe -ArgumentList '/c', 'npm run dev' -WorkingDirectory $backDir -PassThru `
      -RedirectStandardOutput $backendOutLog -RedirectStandardError $backendErrLog
    $proc.Id | Set-Content $backendPidFile
    Write-Output "Started backend PID $($proc.Id)."

    $ready = $false
    for ($i = 1; $i -le 60; $i++) {
      $ok = Test-NetConnection -ComputerName 'localhost' -Port 3000 -InformationLevel Quiet -WarningAction SilentlyContinue
      if ($ok) {
        $ready = $true
        Write-Output "Backend ready after $i checks."
        break
      }
      Start-Sleep -Milliseconds 500
    }

    if (-not $ready) {
      Write-Output 'Backend stdout tail:'
      if (Test-Path $backendOutLog) { Get-Content $backendOutLog -Tail 80 }
      Write-Output 'Backend stderr tail:'
      if (Test-Path $backendErrLog) { Get-Content $backendErrLog -Tail 80 }
      throw 'Backend did not become ready on port 3000.'
    }
  }

  Run-Step -Name 'Smoke API test' -Action {
    Set-Location $workspace
    $env:SMOKE_MODE = $SmokeMode
    powershell -ExecutionPolicy Bypass -File $smokeScript
    Remove-Item Env:SMOKE_MODE -ErrorAction SilentlyContinue
    if ($LASTEXITCODE -ne 0) { throw 'Smoke API test failed.' }
  }

  Write-Output "`nOPS HEALTH CHECK: PASS"
} catch {
  Write-Error "OPS HEALTH CHECK: FAIL - $($_.Exception.Message)"
  exit 1
} finally {
  Stop-BackendIfStarted
}
