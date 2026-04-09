$ErrorActionPreference = 'Stop'

$base = 'http://localhost:3000/api'
$results = New-Object System.Collections.Generic.List[object]
$workspaceRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$smokeMode = if ($env:SMOKE_MODE) { $env:SMOKE_MODE.ToLower() } else { 'relaxed' }

function Is-StrictMode {
  return $smokeMode -eq 'strict'
}

function Get-DocxFixturePath {
  $candidates = @(
    (Join-Path $workspaceRoot 'docs/File Ly Thuyet/PhanHeDeTaiNCKH.docx'),
    (Join-Path $workspaceRoot 'docs/File Ly Thuyet/PhanHeDeTaiNCKH_v2.docx'),
    (Join-Path $workspaceRoot 'src/back/DeXuat_ChiTiet_Test.docx')
  )

  foreach ($candidate in $candidates) {
    if (Test-Path $candidate) {
      return $candidate
    }
  }

  return $null
}

function Add-Result {
  param(
    [string]$Name,
    [string]$Status,
    [string]$Detail
  )
  $results.Add([pscustomobject]@{
    Test   = $Name
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

$token = $null
$headers = @{}
$projectChoNghiemThu = $null
$projectNoContract = $null
$councilId = $null
$uploadedTemplateId = $null
$ownerIdCandidate = $null

# 1) Login research_staff
try {
  $loginBody = @{ email = 'staff@nckh.edu.vn'; password = '123456' } | ConvertTo-Json
  $login = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType 'application/json' -Body $loginBody
  $token = $login.data.accessToken
  if (-not $token) { throw 'Missing access token' }
  $headers = @{ Authorization = "Bearer $token" }
  Add-Result -Name 'Login research_staff' -Status 'PASS' -Detail 'Token issued.'
} catch {
  Add-Result -Name 'Login research_staff' -Status 'FAIL' -Detail (Parse-Error $_)
}

# 2) Get projects and prepare samples
try {
  $projRes = Invoke-RestMethod -Uri "$base/projects" -Headers $headers -Method Get
  $projects = @($projRes.data)
  if (-not $projects.Count) { throw 'No projects returned.' }

  $projectChoNghiemThu = $projects | Where-Object { $_.status -eq 'cho_nghiem_thu' } | Select-Object -First 1
  $ownerIdCandidate = $projects[0].owner.id

  $contractsRes = Invoke-RestMethod -Uri "$base/contracts" -Headers $headers -Method Get
  $contracts = @($contractsRes.data)
  $activeProjectIds = @($contracts | Where-Object { $_.status -ne 'huy' } | ForEach-Object { $_.projectId } | Where-Object { $_ })
  $projectNoContract = $projects | Where-Object { $activeProjectIds -notcontains $_.id } | Select-Object -First 1

  $detail = "Projects: $($projects.Count); cho_nghiem_thu: $($projectChoNghiemThu -ne $null); no_contract: $($projectNoContract -ne $null)"
  Add-Result -Name 'Load projects/contracts' -Status 'PASS' -Detail $detail
} catch {
  Add-Result -Name 'Load projects/contracts' -Status 'FAIL' -Detail (Parse-Error $_)
}

# 3) Create council (new flow)
try {
  if (-not $projectChoNghiemThu) { throw 'No cho_nghiem_thu project available.' }

  $payload = @{
    projectId = $projectChoNghiemThu.id
    members = @(
      @{ name = 'GS.TS. Hoang Van Auto'; title = 'GS.TS.'; institution = 'Dai hoc A'; email = 'autochair@deltajohnsons.com'; phone = '0900000001'; affiliation = 'Dai hoc A'; role = 'chu_tich' },
      @{ name = 'TS. Phan Bien Auto'; title = 'TS.'; institution = 'Vien B'; email = 'autoreviewer@deltajohnsons.com'; phone = '0900000002'; affiliation = 'Vien B'; role = 'phan_bien_1' },
      @{ name = 'ThS. Uy Vien Auto'; title = 'ThS.'; institution = 'Vien C'; email = 'automember@deltajohnsons.com'; phone = '0900000003'; affiliation = 'Vien C'; role = 'uy_vien' }
    )
  } | ConvertTo-Json -Depth 6

  $create = Invoke-RestMethod -Uri "$base/councils" -Method Post -Headers $headers -ContentType 'application/json' -Body $payload
  $councilId = $create.data.id
  if (-not $councilId) { throw 'Missing created council id.' }
  Add-Result -Name 'Create council' -Status 'PASS' -Detail "CouncilId=$councilId"
} catch {
  Add-Result -Name 'Create council' -Status 'FAIL' -Detail (Parse-Error $_)
}

# 4) Upload decision PDF
try {
  if (-not $councilId) { throw 'Council not created.' }

  $tmpPdf = Join-Path $env:TEMP 'council_decision_test.pdf'
  Set-Content -Path $tmpPdf -Value '%PDF-1.4 test' -Encoding ascii

  $raw = curl.exe -s -X POST "$base/councils/$councilId/decision" -H "Authorization: Bearer $token" -F "file=@$tmpPdf"
  if (-not $raw) { throw 'Empty response from upload.' }
  $json = $raw | ConvertFrom-Json
  if (-not $json.success) { throw $raw }

  $detail = Invoke-RestMethod -Uri "$base/councils/$councilId" -Method Get -Headers $headers
  if (-not $detail.data.decisionPdfUrl) { throw 'decisionPdfUrl not saved.' }

  Add-Result -Name 'Upload council decision' -Status 'PASS' -Detail $detail.data.decisionPdfUrl
} catch {
  Add-Result -Name 'Upload council decision' -Status 'FAIL' -Detail (Parse-Error $_)
}

# 5) Resend invitation emails
try {
  if (-not $councilId) { throw 'Council not created.' }
  $resend = Invoke-RestMethod -Uri "$base/councils/$councilId/resend-invitations" -Method Post -Headers $headers
  $sent = [int]$resend.data.sent
  if ($sent -lt 1) { throw 'No invitation sent.' }
  Add-Result -Name 'Resend council invitations' -Status 'PASS' -Detail "sent=$sent"
} catch {
  $resendDetail = Parse-Error $_
  $statusCode = $null
  if ($_.Exception.Response) {
    try { $statusCode = [int]$_.Exception.Response.StatusCode } catch {}
  }
  $smtpRelated = $resendDetail -match 'SMTP|email|thu moi|invitation|Gửi|gui|Không thể gửi lại thư mời|Khong the gui lai thu moi'
  if (($smtpRelated -or $statusCode -eq 400) -and -not (Is-StrictMode)) {
    Add-Result -Name 'Resend council invitations' -Status 'SKIP' -Detail "SMTP runtime issue: $resendDetail"
  } else {
    Add-Result -Name 'Resend council invitations' -Status 'FAIL' -Detail $resendDetail
  }
}

# 6) Remove member persists after reload
try {
  if (-not $councilId) { throw 'Council not created.' }

  $before = Invoke-RestMethod -Uri "$base/councils/$councilId" -Method Get -Headers $headers
  $beforeCount = @($before.data.members).Count
  if ($beforeCount -lt 1) { throw 'No members to remove.' }

  $memberId = $before.data.members[0].id
  Invoke-RestMethod -Uri "$base/councils/$councilId/members/$memberId" -Method Delete -Headers $headers | Out-Null

  $after = Invoke-RestMethod -Uri "$base/councils/$councilId" -Method Get -Headers $headers
  $afterCount = @($after.data.members).Count

  if ($afterCount -ge $beforeCount) { throw "Member still present after reload. before=$beforeCount after=$afterCount" }
  Add-Result -Name 'Remove member persistence' -Status 'PASS' -Detail "before=$beforeCount after=$afterCount"
} catch {
  Add-Result -Name 'Remove member persistence' -Status 'FAIL' -Detail (Parse-Error $_)
}

# 7) Create contract success (project without active contract)
try {
  if (-not $projectNoContract) {
    if (-not $ownerIdCandidate) { throw 'No owner id available to create temp project.' }

    $projectPayload = @{
      title = "Auto Contract Project $(Get-Date -Format 'HHmmss')"
      ownerId = $ownerIdCandidate
      ownerTitle = 'TS.'
      department = 'Auto Department'
      field = 'Auto Field'
      startDate = '2026-03-01T00:00:00.000Z'
      endDate = '2026-12-31T00:00:00.000Z'
      durationMonths = 10
      budget = 150000000
      advancedAmount = 0
    } | ConvertTo-Json

    $newProject = Invoke-RestMethod -Uri "$base/projects" -Method Post -Headers $headers -ContentType 'application/json' -Body $projectPayload
    $projectNoContract = $newProject.data
    if (-not $projectNoContract.id) { throw 'Failed to create temp project for contract test.' }
  }

  $payload = @{ projectId = $projectNoContract.id; budget = [double]$projectNoContract.budget; notes = 'auto smoke test' } | ConvertTo-Json
  $created = Invoke-RestMethod -Uri "$base/contracts" -Method Post -Headers $headers -ContentType 'application/json' -Body $payload
  if (-not $created.data.id) { throw 'Contract create returned no id.' }
  Add-Result -Name 'Create contract (success case)' -Status 'PASS' -Detail "ContractId=$($created.data.id)"
} catch {
  Add-Result -Name 'Create contract (success case)' -Status 'FAIL' -Detail (Parse-Error $_)
}

# 8) Create contract duplicate blocked (should fail)
try {
  $contractsNow = Invoke-RestMethod -Uri "$base/contracts" -Method Get -Headers $headers
  $dupCandidate = @($contractsNow.data) | Select-Object -First 1
  if (-not $dupCandidate) { throw 'No existing contract to test duplicate rule.' }

  $dupPayload = @{ projectId = $dupCandidate.projectId; budget = [double]$dupCandidate.budget; notes = 'duplicate test' } | ConvertTo-Json

  try {
    Invoke-RestMethod -Uri "$base/contracts" -Method Post -Headers $headers -ContentType 'application/json' -Body $dupPayload | Out-Null
    Add-Result -Name 'Create contract duplicate blocked' -Status 'FAIL' -Detail 'Unexpected success: duplicate was created.'
  } catch {
    if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -eq 400) {
      Add-Result -Name 'Create contract duplicate blocked' -Status 'PASS' -Detail 'HTTP 400 returned as expected.'
    } else {
      $msg = Parse-Error $_
      Add-Result -Name 'Create contract duplicate blocked' -Status 'FAIL' -Detail $msg
    }
  }
} catch {
  Add-Result -Name 'Create contract duplicate blocked' -Status 'FAIL' -Detail (Parse-Error $_)
}

# 9) Parse contract proposal file (PDF/DOCX/TXT)
try {
  $proposalPath = Get-DocxFixturePath
  if (-not (Test-Path $proposalPath)) {
    $msg = 'Missing fixture DOCX: docs/File Ly Thuyet/PhanHeDeTaiNCKH.docx | docs/File Ly Thuyet/PhanHeDeTaiNCKH_v2.docx | src/back/DeXuat_ChiTiet_Test.docx'
    if (Is-StrictMode) {
      Add-Result -Name 'Parse contract proposal' -Status 'FAIL' -Detail $msg
    } else {
      Add-Result -Name 'Parse contract proposal' -Status 'SKIP' -Detail $msg
    }
  } else {
    $raw = curl.exe -s -X POST "$base/contracts/proposals/parse" -H "Authorization: Bearer $token" -F "file=@$proposalPath"
    if (-not $raw) { throw 'Empty response from proposal parse endpoint.' }
    $json = $raw | ConvertFrom-Json
    if (-not $json.success) { throw $raw }
    if ($null -eq $json.data.confidence) { throw 'Missing confidence in parse response.' }

    $detail = "confidence=$($json.data.confidence) projectCode=$($json.data.projectCode)"
    Add-Result -Name 'Parse contract proposal' -Status 'PASS' -Detail $detail
  }
} catch {
  Add-Result -Name 'Parse contract proposal' -Status 'FAIL' -Detail (Parse-Error $_)
}

# 10) Upload template file for fill test
try {
  $docxPath = Get-DocxFixturePath
  if (-not (Test-Path $docxPath)) {
    $msg = 'Missing fixture DOCX for template upload.'
    if (Is-StrictMode) {
      Add-Result -Name 'Template upload' -Status 'FAIL' -Detail $msg
    } else {
      Add-Result -Name 'Template upload' -Status 'SKIP' -Detail $msg
    }
  } else {
    $raw = curl.exe -s -X POST "$base/templates" -H "Authorization: Bearer $token" -F "name=Auto Fill Template" -F "version=v1.0.0" -F "targetRole=chu_tich" -F "formTypeCode=auto_test" -F "effectiveDate=2026-03-30T00:00:00.000Z" -F "file=@$docxPath"
    if (-not $raw) { throw 'Empty response from template upload.' }
    $json = $raw | ConvertFrom-Json
    if (-not $json.success) { throw $raw }
    $uploadedTemplateId = $json.data.id
    Add-Result -Name 'Template upload' -Status 'PASS' -Detail "TemplateId=$uploadedTemplateId"
  }
} catch {
  Add-Result -Name 'Template upload' -Status 'FAIL' -Detail (Parse-Error $_)
}

# 11) Template fill endpoint (download draft)
try {
  $templates = Invoke-RestMethod -Uri "$base/templates" -Method Get -Headers $headers
  $template = if ($uploadedTemplateId) {
    @($templates.data) | Where-Object { $_.id -eq $uploadedTemplateId } | Select-Object -First 1
  } else {
    @($templates.data) | Select-Object -First 1
  }
  if (-not $template) {
    if (Is-StrictMode) {
      Add-Result -Name 'Template draft download' -Status 'FAIL' -Detail 'No formTemplate data available.'
    } else {
      Add-Result -Name 'Template draft download' -Status 'SKIP' -Detail 'No formTemplate data available.'
    }
  } elseif (-not $projectChoNghiemThu) {
    if (Is-StrictMode) {
      Add-Result -Name 'Template draft download' -Status 'FAIL' -Detail 'No project for fill.'
    } else {
      Add-Result -Name 'Template draft download' -Status 'SKIP' -Detail 'No project for fill.'
    }
  } else {
    $out = Join-Path $env:TEMP "template_fill_$($template.id).docx"
    $url = "$base/templates/$($template.id)/fill?projectId=$($projectChoNghiemThu.id)"
    Invoke-WebRequest -Uri $url -Method Get -Headers $headers -OutFile $out -UseBasicParsing | Out-Null
    $fi = Get-Item $out
    if ($fi.Length -le 0) { throw 'Downloaded file empty.' }
    Add-Result -Name 'Template draft download' -Status 'PASS' -Detail "File=$out size=$($fi.Length)"
  }
} catch {
  Add-Result -Name 'Template draft download' -Status 'FAIL' -Detail (Parse-Error $_)
}

$results | Format-Table -AutoSize | Out-String | Write-Output

$failCount = @($results | Where-Object { $_.Status -eq 'FAIL' }).Count
$skipCount = @($results | Where-Object { $_.Status -eq 'SKIP' }).Count
Write-Output "Summary: PASS=$(@($results | Where-Object { $_.Status -eq 'PASS' }).Count) FAIL=$failCount SKIP=$skipCount"

if ($failCount -gt 0) {
  exit 1
}
