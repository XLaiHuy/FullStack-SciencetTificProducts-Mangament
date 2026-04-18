param(
  [string]$BackendBaseUrl = 'http://localhost:3000',
  [string]$ApiBaseUrl = ''
)

$ErrorActionPreference = 'Stop'

$normalizedBackend = $BackendBaseUrl.Trim().TrimEnd('/')
$base = if ($ApiBaseUrl -and $ApiBaseUrl.Trim()) {
  $ApiBaseUrl.Trim().TrimEnd('/')
} else {
  if ($normalizedBackend.ToLower().EndsWith('/api')) { $normalizedBackend } else { "$normalizedBackend/api" }
}
$results = New-Object System.Collections.Generic.List[object]
$workspaceRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$stamp = Get-Date -Format 'yyyyMMddHHmmss'

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
    } catch {
      # Keep fallback message.
    }
  }

  return $Err.Exception.Message
}

function New-TempTextFile {
  param(
    [string]$Prefix,
    [string]$Content
  )

  $path = Join-Path $env:TEMP "$Prefix-$stamp.txt"
  Set-Content -Path $path -Value $Content -Encoding UTF8
  return $path
}

function Login-Account {
  param(
    [string]$Email,
    [string]$Password = '123456'
  )

  $body = @{ email = $Email; password = $Password } | ConvertTo-Json
  $login = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType 'application/json' -Body $body
  $token = $login.data.accessToken
  if (-not $token) { throw "Missing access token for $Email" }

  return [pscustomobject]@{
    email   = $Email
    token   = $token
    headers = @{ Authorization = "Bearer $token" }
  }
}

function Invoke-MultipartJson {
  param(
    [string]$Url,
    [hashtable]$Headers,
    [hashtable]$Fields = @{},
    [string]$FileFieldName,
    [string]$FilePath,
    [string]$FileMimeType = 'application/octet-stream'
  )

  $args = @('-s', '-X', 'POST', $Url)
  foreach ($key in $Headers.Keys) {
    $args += @('-H', "${key}: $($Headers[$key])")
  }

  foreach ($key in $Fields.Keys) {
    $args += @('-F', "$key=$($Fields[$key])")
  }

  if ($FilePath) {
    $args += @('-F', "$FileFieldName=@$FilePath;type=$FileMimeType")
  }

  $raw = & curl.exe @args
  if (-not $raw) { throw "Empty response from $Url" }

  return $raw | ConvertFrom-Json
}

function Invoke-JsonGet {
  param(
    [string]$Url,
    [hashtable]$Headers
  )

  return Invoke-RestMethod -Uri $Url -Method Get -Headers $Headers
}

function Invoke-JsonPost {
  param(
    [string]$Url,
    [hashtable]$Headers,
    [object]$Body
  )

  return Invoke-RestMethod -Uri $Url -Method Post -Headers $Headers -ContentType 'application/json' -Body ($Body | ConvertTo-Json -Depth 8)
}

function Invoke-JsonPut {
  param(
    [string]$Url,
    [hashtable]$Headers,
    [object]$Body
  )

  return Invoke-RestMethod -Uri $Url -Method Put -Headers $Headers -ContentType 'application/json' -Body ($Body | ConvertTo-Json -Depth 8)
}

function Download-File {
  param(
    [string]$Url,
    [hashtable]$Headers,
    [string]$OutFile
  )

  Invoke-WebRequest -Uri $Url -Method Get -Headers $Headers -OutFile $OutFile -UseBasicParsing | Out-Null
  if (-not (Test-Path $OutFile)) { throw "Download failed: $Url" }
  $fileInfo = Get-Item $OutFile
  if ($fileInfo.Length -le 0) { throw "Downloaded file is empty: $Url" }
  return $fileInfo
}

function Ensure-ResultSuccess {
  param(
    [string]$Name,
    [bool]$Condition,
    [string]$Detail
  )

  if (-not $Condition) {
    throw "$Name failed: $Detail"
  }
}

$actorAccounts = @{}
$workflowProject = $null
$workflowContract = $null
$workflowCouncil = $null
$workflowSettlement = $null
$proposalFixture = $null
$memberFixture = $null
$contractPdfPath = $null
$accountingSettlementId = $null

try {
  $actorAccounts.staff = Login-Account -Email 'staff@nckh.edu.vn'
  Add-Result -Name 'Login research_staff' -Status 'PASS' -Detail 'Token issued.'
} catch {
  Add-Result -Name 'Login research_staff' -Status 'FAIL' -Detail (Parse-Error $_)
}

try {
  $actorAccounts.owner = Login-Account -Email 'owner@nckh.edu.vn'
  Add-Result -Name 'Login project_owner' -Status 'PASS' -Detail 'Token issued.'
} catch {
  Add-Result -Name 'Login project_owner' -Status 'FAIL' -Detail (Parse-Error $_)
}

try {
  $actorAccounts.accounting = Login-Account -Email 'accounting@nckh.edu.vn'
  Add-Result -Name 'Login accounting' -Status 'PASS' -Detail 'Token issued.'
} catch {
  Add-Result -Name 'Login accounting' -Status 'FAIL' -Detail (Parse-Error $_)
}

try {
  $actorAccounts.archive = Login-Account -Email 'archive@nckh.edu.vn'
  Add-Result -Name 'Login archive_staff' -Status 'PASS' -Detail 'Token issued.'
} catch {
  Add-Result -Name 'Login archive_staff' -Status 'FAIL' -Detail (Parse-Error $_)
}

try {
  $actorAccounts.chairman = Login-Account -Email 'chairman@demo.com'
  $actorAccounts.reviewer1 = Login-Account -Email 'reviewer@demo.com'
  $actorAccounts.reviewer2 = Login-Account -Email 'council@nckh.edu.vn'
  $actorAccounts.secretary = Login-Account -Email 'secretary@demo.com'
  $actorAccounts.member = Login-Account -Email 'member@demo.com'
  Add-Result -Name 'Login council members' -Status 'PASS' -Detail 'Chairman, reviewers, secretary, member token issued.'
} catch {
  Add-Result -Name 'Login council members' -Status 'FAIL' -Detail (Parse-Error $_)
}

try {
  $proposalFixture = New-TempTextFile -Prefix 'workflow-proposal' -Content @"
Ma de tai: WT-$stamp
Chu nhiem: PGS.TS. Nguyen Van A
Email: owner@nckh.edu.vn
Kinh phi: 650000000
Mo ta: Workflow smoke proposal file for parse endpoint
"@

  $parseProposal = Invoke-MultipartJson -Url "$base/contracts/proposals/parse" -Headers $actorAccounts.staff.headers -FileFieldName 'file' -FilePath $proposalFixture -FileMimeType 'text/plain'
  $proposalData = $parseProposal.data
  Ensure-ResultSuccess -Name 'Parse contract proposal' -Condition ([bool]$proposalData.projectCode -or [bool]$proposalData.ownerEmail -or [bool]$proposalData.suggestedBudget) -Detail 'No proposal data recognized.'
  Add-Result -Name 'Parse contract proposal' -Status 'PASS' -Detail "confidence=$($proposalData.confidence) projectCode=$($proposalData.projectCode) ownerEmail=$($proposalData.ownerEmail)"
} catch {
  Add-Result -Name 'Parse contract proposal' -Status 'FAIL' -Detail (Parse-Error $_)
}

try {
  $memberFixture = New-TempTextFile -Prefix 'workflow-members' -Content @"
Ho va ten: GS.TS. Hoang Van E, Vai tro: Chu tich, Don vi: Dai hoc A, Email: chairman@demo.com
Ho va ten: PGS.TS. Le Quang C, Vai tro: Phan bien 1, Don vi: Vien B, Email: reviewer@demo.com
Ho va ten: GS.TS. Nguyen Van C, Vai tro: Phan bien 2, Don vi: Vien C, Email: council@nckh.edu.vn
Ho va ten: TS. Pham Thi D, Vai tro: Thu ky, Don vi: Vien D, Email: secretary@demo.com
Ho va ten: ThS. Nguyen Minh E, Vai tro: Uy vien, Don vi: Vien E, Email: member@demo.com
"@

  $parseMembers = Invoke-MultipartJson -Url "$base/councils/parse-members" -Headers $actorAccounts.staff.headers -FileFieldName 'file' -FilePath $memberFixture -FileMimeType 'text/plain'
  $parsedMembers = @($parseMembers.data)
  Ensure-ResultSuccess -Name 'Parse council members' -Condition ($parsedMembers.Count -ge 5) -Detail 'Not enough members recognized.'

  $requiredRoles = @('chu_tich', 'phan_bien_1', 'phan_bien_2', 'thu_ky', 'uy_vien')
  foreach ($role in $requiredRoles) {
    Ensure-ResultSuccess -Name 'Parse council members' -Condition (@($parsedMembers | Where-Object { $_.role -eq $role }).Count -gt 0) -Detail "Missing role $role"
  }

  $memberDetail = ($parsedMembers | ForEach-Object { "$($_.role):$($_.email)" }) -join ' | '
  Add-Result -Name 'Parse council members' -Status 'PASS' -Detail $memberDetail
} catch {
  Add-Result -Name 'Parse council members' -Status 'FAIL' -Detail (Parse-Error $_)
}

try {
  $owners = Invoke-JsonGet -Url "$base/projects/owners" -Headers $actorAccounts.staff.headers
  $ownerData = @($owners.data)
  $owner = $ownerData | Where-Object { $_.email -eq 'owner@nckh.edu.vn' } | Select-Object -First 1
  if (-not $owner) {
    $owner = $ownerData | Select-Object -First 1
  }
  Ensure-ResultSuccess -Name 'Load project owners' -Condition ([bool]$owner.id) -Detail 'Owner not found.'

  $projectBody = @{
    title = "Workflow Smoke Project $stamp"
    ownerId = $owner.id
    ownerTitle = 'PGS.TS.'
    department = 'Workflow Department'
    field = 'Workflow Field'
    startDate = '2026-01-01T00:00:00.000Z'
    endDate = '2026-12-31T00:00:00.000Z'
    durationMonths = 12
    budget = 650000000
    advancedAmount = 0
  }

  $projectResponse = Invoke-JsonPost -Url "$base/projects" -Headers $actorAccounts.staff.headers -Body $projectBody
  $workflowProject = $projectResponse.data
  Ensure-ResultSuccess -Name 'Create project' -Condition ([bool]$workflowProject.id) -Detail 'Missing project id.'
  Add-Result -Name 'Create project' -Status 'PASS' -Detail "ProjectId=$($workflowProject.id) Code=$($workflowProject.code)"
} catch {
  Add-Result -Name 'Create project' -Status 'FAIL' -Detail (Parse-Error $_)
}

try {
  if (-not $workflowProject) { throw 'Project not created.' }

  $contractCreate = Invoke-JsonPost -Url "$base/contracts" -Headers $actorAccounts.staff.headers -Body @{
    projectId = $workflowProject.id
    budget = 650000000
    agencyName = 'Workflow Research Office'
    representative = 'Workflow Representative'
    notes = 'Workflow smoke contract'
  }

  $workflowContract = $contractCreate.data
  Ensure-ResultSuccess -Name 'Create contract' -Condition ([bool]$workflowContract.id) -Detail 'Missing contract id.'

  $contractPdfPath = Join-Path $env:TEMP "workflow-contract-$stamp.pdf"
  Download-File -Url "$base/contracts/$($workflowContract.id)/pdf" -Headers $actorAccounts.staff.headers -OutFile $contractPdfPath | Out-Null

  $uploadContract = Invoke-MultipartJson -Url "$base/contracts/$($workflowContract.id)/upload" -Headers $actorAccounts.staff.headers -FileFieldName 'file' -FilePath $contractPdfPath -FileMimeType 'application/pdf'
  Ensure-ResultSuccess -Name 'Upload contract pdf' -Condition ([bool]$uploadContract.data.pdfUrl) -Detail 'pdfUrl missing after upload.'

  Invoke-JsonPost -Url "$base/contracts/$($workflowContract.id)/sign" -Headers $actorAccounts.owner.headers -Body @{} | Out-Null
  $contractDetail = Invoke-JsonGet -Url "$base/contracts/$($workflowContract.id)" -Headers $actorAccounts.owner.headers
  Ensure-ResultSuccess -Name 'Sign contract' -Condition ([bool]$contractDetail.data.signedDate) -Detail 'signedDate missing.'

  $ownerContractDownload = Join-Path $env:TEMP "workflow-contract-owner-$stamp.pdf"
  Download-File -Url "$base/contracts/$($workflowContract.id)/pdf" -Headers $actorAccounts.owner.headers -OutFile $ownerContractDownload | Out-Null

  Add-Result -Name 'Contract flow' -Status 'PASS' -Detail "ContractId=$($workflowContract.id)"
} catch {
  Add-Result -Name 'Contract flow' -Status 'FAIL' -Detail (Parse-Error $_)
}

try {
  if (-not $workflowProject -or -not $contractPdfPath) { throw 'Missing project or file fixture for reports.' }

  $midtermUpload = Invoke-MultipartJson -Url "$base/projects/$($workflowProject.id)/midterm-report" -Headers $actorAccounts.owner.headers -Fields @{ content = 'Workflow smoke midterm report' } -FileFieldName 'file' -FilePath $contractPdfPath -FileMimeType 'application/pdf'
  Ensure-ResultSuccess -Name 'Upload midterm report' -Condition ([bool]$midtermUpload.data.id) -Detail 'Midterm report not created.'

  $finalUpload = Invoke-MultipartJson -Url "$base/projects/$($workflowProject.id)/final-submission" -Headers $actorAccounts.owner.headers -Fields @{ content = 'Workflow smoke final submission' } -FileFieldName 'file' -FilePath $contractPdfPath -FileMimeType 'application/pdf'
  Ensure-ResultSuccess -Name 'Upload final submission' -Condition ([bool]$finalUpload.data.id) -Detail 'Final report not created.'

  $projectAfterFinal = Invoke-JsonGet -Url "$base/projects/$($workflowProject.id)" -Headers $actorAccounts.owner.headers
  Ensure-ResultSuccess -Name 'Final submission moves project' -Condition ($projectAfterFinal.data.status -eq 'cho_nghiem_thu') -Detail "status=$($projectAfterFinal.data.status)"

  Add-Result -Name 'Execution reports' -Status 'PASS' -Detail "ProjectId=$($workflowProject.id)"
} catch {
  Add-Result -Name 'Execution reports' -Status 'FAIL' -Detail (Parse-Error $_)
}

try {
  if (-not $workflowProject) { throw 'Missing project for council creation.' }

  $councilCreateMembers = @(
    @{ name = 'GS.TS. Hoang Van E'; title = 'GS.TS.'; institution = 'Dai hoc A'; email = 'chairman@demo.com'; phone = '0900000001'; affiliation = 'Dai hoc A'; role = 'chu_tich' },
    @{ name = 'PGS.TS. Le Quang C'; title = 'PGS.TS.'; institution = 'Vien B'; email = 'reviewer@demo.com'; phone = '0900000002'; affiliation = 'Vien B'; role = 'phan_bien_1' },
    @{ name = 'GS.TS. Nguyen Van C'; title = 'GS.TS.'; institution = 'Vien C'; email = 'council@nckh.edu.vn'; phone = '0900000003'; affiliation = 'Vien C'; role = 'phan_bien_2' },
    @{ name = 'TS. Pham Thi D'; title = 'TS.'; institution = 'Vien D'; email = 'secretary@demo.com'; phone = '0900000004'; affiliation = 'Vien D'; role = 'thu_ky' },
    @{ name = 'ThS. Nguyen Minh E'; title = 'ThS.'; institution = 'Vien E'; email = 'member@demo.com'; phone = '0900000005'; affiliation = 'Vien E'; role = 'uy_vien' }
  )

  $councilCreate = Invoke-JsonPost -Url "$base/councils" -Headers $actorAccounts.staff.headers -Body @{
    projectId = $workflowProject.id
    members = $councilCreateMembers
  }

  $workflowCouncil = $councilCreate.data
  Ensure-ResultSuccess -Name 'Create council' -Condition ([bool]$workflowCouncil.id) -Detail 'Missing council id.'

  $decisionUpload = Invoke-MultipartJson -Url "$base/councils/$($workflowCouncil.id)/decision" -Headers $actorAccounts.staff.headers -FileFieldName 'file' -FilePath $contractPdfPath -FileMimeType 'application/pdf'
  Ensure-ResultSuccess -Name 'Upload council decision' -Condition ([bool]$decisionUpload.success) -Detail 'Decision upload failed.'

  $decisionDownload = Join-Path $env:TEMP "workflow-council-decision-$stamp.pdf"
  Download-File -Url "$base/councils/$($workflowCouncil.id)/decision-file" -Headers $actorAccounts.staff.headers -OutFile $decisionDownload | Out-Null

  Invoke-JsonPut -Url "$base/councils/$($workflowCouncil.id)/approve" -Headers $actorAccounts.staff.headers -Body @{} | Out-Null

  Invoke-JsonPost -Url "$base/councils/$($workflowCouncil.id)/score" -Headers $actorAccounts.chairman.headers -Body @{ score = 95; comments = 'Workflow chairman score' } | Out-Null
  Invoke-JsonPost -Url "$base/councils/$($workflowCouncil.id)/review" -Headers $actorAccounts.reviewer1.headers -Body @{ score = 92; comments = 'Workflow reviewer 1 review' } | Out-Null
  Invoke-JsonPost -Url "$base/councils/$($workflowCouncil.id)/review" -Headers $actorAccounts.reviewer2.headers -Body @{ score = 90; comments = 'Workflow reviewer 2 review' } | Out-Null
  Invoke-JsonPost -Url "$base/councils/$($workflowCouncil.id)/score" -Headers $actorAccounts.member.headers -Body @{ score = 88; comments = 'Workflow member score' } | Out-Null

  $minutesUpload = Invoke-MultipartJson -Url "$base/councils/$($workflowCouncil.id)/minutes" -Headers $actorAccounts.secretary.headers -Fields @{ content = 'Workflow smoke council minutes' } -FileFieldName 'file' -FilePath $contractPdfPath -FileMimeType 'application/pdf'
  Ensure-ResultSuccess -Name 'Upload council minutes' -Condition ([bool]$minutesUpload.success) -Detail 'Minutes upload failed.'

  $minutesDownload = Join-Path $env:TEMP "workflow-council-minutes-$stamp.pdf"
  Download-File -Url "$base/councils/$($workflowCouncil.id)/minutes-file" -Headers $actorAccounts.secretary.headers -OutFile $minutesDownload | Out-Null

  $summary = Invoke-JsonGet -Url "$base/councils/$($workflowCouncil.id)/score-summary" -Headers $actorAccounts.staff.headers
  Ensure-ResultSuccess -Name 'Council score summary' -Condition (($summary.data.totalMembers -eq 5) -and ($summary.data.submittedCount -ge 4)) -Detail "totalMembers=$($summary.data.totalMembers) submittedCount=$($summary.data.submittedCount)"

  Invoke-RestMethod -Uri "$base/councils/$($workflowCouncil.id)/complete" -Method Put -Headers $actorAccounts.staff.headers | Out-Null

  $projectAfterCouncil = Invoke-JsonGet -Url "$base/projects/$($workflowProject.id)" -Headers $actorAccounts.owner.headers
  Ensure-ResultSuccess -Name 'Council completion moves project' -Condition ($projectAfterCouncil.data.status -eq 'da_nghiem_thu') -Detail "status=$($projectAfterCouncil.data.status)"

  Add-Result -Name 'Council acceptance flow' -Status 'PASS' -Detail "CouncilId=$($workflowCouncil.id)"
} catch {
  Add-Result -Name 'Council acceptance flow' -Status 'FAIL' -Detail (Parse-Error $_)
}

try {
  if (-not $workflowProject -or -not $contractPdfPath) { throw 'Missing project or file fixture for settlement.' }

  $settlementCreate = Invoke-MultipartJson -Url "$base/settlements" -Headers $actorAccounts.owner.headers -Fields @{
    projectId = $workflowProject.id
    content = 'Workflow smoke settlement content'
    totalAmount = 650000000
    category = 'Workflow evidence'
  } -FileFieldName 'evidenceFile' -FilePath $contractPdfPath -FileMimeType 'application/pdf'

  $workflowSettlement = $settlementCreate.data
  Ensure-ResultSuccess -Name 'Create settlement' -Condition ([bool]$workflowSettlement.id) -Detail 'Settlement id missing.'

  $exportPath = Join-Path $env:TEMP "workflow-settlement-$stamp.xlsx"
  Download-File -Url "$base/settlements/$($workflowSettlement.id)/export?format=excel" -Headers $actorAccounts.owner.headers -OutFile $exportPath | Out-Null

  $archiveUpload = Invoke-MultipartJson -Url "$base/archive/repository/$($workflowProject.id)" -Headers $actorAccounts.archive.headers -Fields @{ notes = 'Workflow smoke archive note' } -FileFieldName 'files' -FilePath $contractPdfPath -FileMimeType 'application/pdf'
  Ensure-ResultSuccess -Name 'Archive repository upload' -Condition ([bool]$archiveUpload.data.projectId) -Detail 'Archive upload failed.'

  $supplementReasons = @('Thieu hoa don VAT', 'Can bo sung bien ban doi soat')
  $supplementResponse = Invoke-JsonPost -Url "$base/settlements/$($workflowSettlement.id)/supplement-request" -Headers $actorAccounts.staff.headers -Body @{ reasons = $supplementReasons }
  Ensure-ResultSuccess -Name 'Settlement supplement request' -Condition ($supplementResponse.data.status -eq 'cho_bo_sung') -Detail "status=$($supplementResponse.data.status)"

  $ownerNotificationsAfterSupplement = Invoke-JsonGet -Url "$base/notifications?page=1&limit=50" -Headers $actorAccounts.owner.headers
  $ownerSupplementRows = @($ownerNotificationsAfterSupplement.data)
  $supplementKeyword = "Ho so quyet toan $($workflowSettlement.code) can bo sung:"
  $supplementNotifs = @($ownerSupplementRows | Where-Object {
    $_.message -is [string] -and $_.message.Contains($supplementKeyword)
  })
  Ensure-ResultSuccess -Name 'Supplement notification dedupe' -Condition ($supplementNotifs.Count -eq 1) -Detail "Expected 1 supplement notification but got $($supplementNotifs.Count) for keyword '$supplementKeyword'"

  $verifySettlement = Invoke-JsonPut -Url "$base/accounting/documents/$($workflowSettlement.id)/verify" -Headers $actorAccounts.accounting.headers -Body @{ status = 'hop_le'; notes = 'Workflow smoke verify' }
  Ensure-ResultSuccess -Name 'Accounting verify settlement' -Condition ($verifySettlement.data.status -eq 'hop_le') -Detail "status=$($verifySettlement.data.status)"

  $confirmSettlement = Invoke-JsonPost -Url "$base/accounting/liquidation/$($workflowSettlement.id)/confirm" -Headers $actorAccounts.accounting.headers -Body @{}
  Ensure-ResultSuccess -Name 'Accounting confirm liquidation' -Condition ($confirmSettlement.data.status -eq 'da_xac_nhan') -Detail "status=$($confirmSettlement.data.status)"

  $projectAfterSettlement = Invoke-JsonGet -Url "$base/projects/$($workflowProject.id)" -Headers $actorAccounts.owner.headers
  Ensure-ResultSuccess -Name 'Settlement confirmation moves project' -Condition ($projectAfterSettlement.data.status -eq 'da_thanh_ly') -Detail "status=$($projectAfterSettlement.data.status)"

  $ownerNotifications = Invoke-JsonGet -Url "$base/notifications?page=1&limit=50" -Headers $actorAccounts.owner.headers
  $ownerNotificationRows = @($ownerNotifications.data)
  $dedupeKeyword = "Ho so quyet toan $($workflowSettlement.code) da duoc xac nhan."
  $settlementNotifs = @($ownerNotificationRows | Where-Object {
    $_.message -is [string] -and $_.message.Contains($dedupeKeyword)
  })
  Ensure-ResultSuccess -Name 'Settlement notification dedupe' -Condition ($settlementNotifs.Count -eq 1) -Detail "Expected 1 notification but got $($settlementNotifs.Count) for keyword '$dedupeKeyword'"

  Add-Result -Name 'Settlement and liquidation' -Status 'PASS' -Detail "SettlementId=$($workflowSettlement.id)"
} catch {
  Add-Result -Name 'Settlement and liquidation' -Status 'FAIL' -Detail (Parse-Error $_)
}

try {
  if (-not $workflowProject -or -not $contractPdfPath) { throw 'Missing project or file fixture for archive.' }

  $archiveList = Invoke-JsonGet -Url "$base/archive/repository" -Headers $actorAccounts.archive.headers
  $archiveRows = @($archiveList.data)
  Ensure-ResultSuccess -Name 'Archive repository list' -Condition (@($archiveRows | Where-Object { $_.projectId -eq $workflowProject.id }).Count -gt 0) -Detail 'Archived project not found in repository list.'

  $archiveDownload = Join-Path $env:TEMP "workflow-archive-$stamp.pdf"
  Download-File -Url "$base/archives/$($workflowProject.id)/download" -Headers $actorAccounts.owner.headers -OutFile $archiveDownload | Out-Null

  Add-Result -Name 'Archive flow' -Status 'PASS' -Detail "ProjectId=$($workflowProject.id)"
} catch {
  Add-Result -Name 'Archive flow' -Status 'FAIL' -Detail (Parse-Error $_)
}

$results | Format-Table -AutoSize | Out-String | Write-Output

$passCount = @($results | Where-Object { $_.Status -eq 'PASS' }).Count
$failCount = @($results | Where-Object { $_.Status -eq 'FAIL' }).Count
$skipCount = @($results | Where-Object { $_.Status -eq 'SKIP' }).Count
Write-Output "Summary: PASS=$passCount FAIL=$failCount SKIP=$skipCount"

if ($failCount -gt 0) {
  exit 1
}
