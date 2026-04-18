param(
  [string]$BackendBaseUrl = 'https://nckh-backend-spring.onrender.com',
  [string]$FrontendUrl = 'https://nckh-frontend.onrender.com',
  [string]$LoginEmail = '',
  [string]$LoginPassword = '',
  [switch]$Strict
)

$ErrorActionPreference = 'Stop'

function Normalize-BaseUrl {
  param([string]$Value)
  return $Value.Trim().TrimEnd('/')
}

function Add-Result {
  param(
    [System.Collections.Generic.List[object]]$Results,
    [string]$Name,
    [string]$Status,
    [string]$Detail
  )
  $Results.Add([pscustomobject]@{
    Test = $Name
    Status = $Status
    Detail = $Detail
  }) | Out-Null
}

function Parse-Error {
  param([object]$Err)
  if ($Err.Exception.Response) {
    try {
      $reader = New-Object System.IO.StreamReader($Err.Exception.Response.GetResponseStream())
      $body = $reader.ReadToEnd()
      if ($body) { return $body }
    } catch {}
  }
  return $Err.Exception.Message
}

$backendBase = Normalize-BaseUrl -Value $BackendBaseUrl
$frontendBase = Normalize-BaseUrl -Value $FrontendUrl
$apiBase = "$backendBase/api"
$results = New-Object System.Collections.Generic.List[object]

# 1) Backend health
try {
  $health = Invoke-RestMethod -Method Get -Uri "$apiBase/health"
  $ok = ($health.success -eq $true) -and ($health.data.status -eq 'ok')
  if (-not $ok) {
    throw "Unexpected health payload: $($health | ConvertTo-Json -Depth 6)"
  }
  Add-Result -Results $results -Name 'Backend health' -Status 'PASS' -Detail "$apiBase/health"
} catch {
  Add-Result -Results $results -Name 'Backend health' -Status 'FAIL' -Detail (Parse-Error $_)
}

# 2) Backend root
try {
  $root = Invoke-RestMethod -Method Get -Uri "$apiBase/"
  $ok = ($root.success -eq $true) -and ($root.data.status -eq 'running')
  if (-not $ok) {
    throw "Unexpected root payload: $($root | ConvertTo-Json -Depth 6)"
  }
  Add-Result -Results $results -Name 'Backend root' -Status 'PASS' -Detail "$apiBase/"
} catch {
  Add-Result -Results $results -Name 'Backend root' -Status 'FAIL' -Detail (Parse-Error $_)
}

# 3) Frontend availability
try {
  $front = Invoke-WebRequest -Method Get -Uri $frontendBase -UseBasicParsing
  if ($front.StatusCode -lt 200 -or $front.StatusCode -ge 400) {
    throw "Unexpected status code: $($front.StatusCode)"
  }
  Add-Result -Results $results -Name 'Frontend availability' -Status 'PASS' -Detail "$frontendBase ($($front.StatusCode))"
} catch {
  Add-Result -Results $results -Name 'Frontend availability' -Status 'FAIL' -Detail (Parse-Error $_)
}

# 4) CORS preflight from frontend -> backend
try {
  $corsHeaders = @{
    Origin = $frontendBase
    'Access-Control-Request-Method' = 'POST'
    'Access-Control-Request-Headers' = 'content-type,authorization'
  }

  $corsResp = Invoke-WebRequest -Method Options -Uri "$apiBase/auth/login" -Headers $corsHeaders -UseBasicParsing
  $allowOrigin = $corsResp.Headers['Access-Control-Allow-Origin']
  if (-not $allowOrigin) {
    throw 'Missing Access-Control-Allow-Origin header.'
  }
  if ($allowOrigin -ne $frontendBase -and $allowOrigin -ne '*') {
    throw "CORS origin mismatch. Expected '$frontendBase' but got '$allowOrigin'"
  }
  Add-Result -Results $results -Name 'CORS preflight' -Status 'PASS' -Detail "allow-origin=$allowOrigin"
} catch {
  Add-Result -Results $results -Name 'CORS preflight' -Status 'FAIL' -Detail (Parse-Error $_)
}

# 5) Optional login smoke
try {
  if ([string]::IsNullOrWhiteSpace($LoginEmail) -or [string]::IsNullOrWhiteSpace($LoginPassword)) {
    if ($Strict) {
      throw 'Missing -LoginEmail or -LoginPassword in strict mode.'
    }
    Add-Result -Results $results -Name 'Login + /auth/me' -Status 'SKIP' -Detail 'Provide -LoginEmail and -LoginPassword to enable.'
  } else {
    $loginBody = @{ email = $LoginEmail; password = $LoginPassword } | ConvertTo-Json
    $loginResp = Invoke-RestMethod -Method Post -Uri "$apiBase/auth/login" -ContentType 'application/json' -Body $loginBody
    $token = $loginResp.data.accessToken
    if (-not $token) { throw 'Missing access token.' }

    $authHeaders = @{ Authorization = "Bearer $token" }
    $me = Invoke-RestMethod -Method Get -Uri "$apiBase/auth/me" -Headers $authHeaders
    if (-not $me.success) { throw 'Auth me endpoint returned unsuccessful response.' }
    Add-Result -Results $results -Name 'Login + /auth/me' -Status 'PASS' -Detail $LoginEmail
  }
} catch {
  Add-Result -Results $results -Name 'Login + /auth/me' -Status 'FAIL' -Detail (Parse-Error $_)
}

$results | Format-Table -AutoSize | Out-String | Write-Output

$passCount = @($results | Where-Object { $_.Status -eq 'PASS' }).Count
$failCount = @($results | Where-Object { $_.Status -eq 'FAIL' }).Count
$skipCount = @($results | Where-Object { $_.Status -eq 'SKIP' }).Count
Write-Output "Summary: PASS=$passCount FAIL=$failCount SKIP=$skipCount"

if ($failCount -gt 0) {
  exit 1
}
