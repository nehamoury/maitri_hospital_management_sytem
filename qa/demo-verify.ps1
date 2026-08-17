<#
.SYNOPSIS
  AHMS demo-data verification: logs in as every staff role and checks that
  each admin page's backing GET endpoint loads (2xx) for roles that hold the
  page's permission and is denied (403) for roles that do not.

.DESCRIPTION
  Mirrors the frontend nav (AdminLayout.tsx) and the backend permission map
  (internal/database/database.go). For every role:
    - allowed  page -> expect HTTP 2xx
    - forbidden page -> expect HTTP 403
  Results are printed as a table and written to qa/verify-results.json so a
  QA report can be generated from them.

  Run AFTER qa/demo-seed.ps1 (needs the demo accounts).

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\qa\demo-verify.ps1
#>
param(
  [string]$BaseUrl     = "http://localhost:8080/api/v1",
  [string]$AdminEmail  = "admin@ahms.local",
  [string]$AdminPassword = "ChangeMe123!",
  [string]$DemoPassword  = "Demo@12345",
  [int]   $LoginDelaySec = 7,
  [switch]$SkipLoginDelay
)
$ErrorActionPreference = "Stop"

function Write-Step($msg) { Write-Host ("`n=== " + $msg + " ===") -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host ("  [PASS]  " + $msg) -ForegroundColor Green }
function Write-Warn($msg) { Write-Host ("  [FAIL]  " + $msg) -ForegroundColor Red }

$script:LastLoginAt = [datetime]::MinValue
function Invoke-Login {
  param($Email, $Password)
  for ($attempt = 0; $attempt -lt 3; $attempt++) {
    if (-not $SkipLoginDelay) {
      $elapsed = ((Get-Date) - $script:LastLoginAt).TotalSeconds
      if ($script:LastLoginAt -ne [datetime]::MinValue -and $elapsed -lt $LoginDelaySec) {
        Start-Sleep -Seconds ([int]($LoginDelaySec - $elapsed) + 1)
      }
    }
    $body = @{ email = $Email; password = $Password } | ConvertTo-Json
    try {
      $resp = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body $body -ContentType "application/json"
      $script:LastLoginAt = Get-Date
      return $resp.data
    } catch {
      $script:LastLoginAt = Get-Date
      $status = 0
      if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
      if ($status -eq 429) {
        Write-Host "  (rate-limited on login, waiting 65s)" -ForegroundColor Yellow
        Start-Sleep -Seconds 65
        continue
      }
      return $null
    }
  }
  return $null
}

function Get-Status {
  param([string]$Path, [string]$Token)
  try {
    $headers = @{}
    if ($Token) { $headers["Authorization"] = "Bearer $Token" }
    $r = Invoke-WebRequest -Uri "$BaseUrl$Path" -Headers $headers -Method Get -TimeoutSec 60 -UseBasicParsing
    return [int]$r.StatusCode
  } catch {
    if ($_.Exception.Response) { return [int]$_.Exception.Response.StatusCode }
    return 0
  }
}

# Page -> backing GET endpoint. Keyed by the same label used in the nav.
$pages = @{
  "dashboard"     = "/dashboard"
  "patients"      = "/patients?limit=5"
  "appointments"  = "/appointments?limit=5"
  "encounters"    = "/encounters?limit=5"
  "referrals"     = "/referrals/incoming"
  "treatment"     = "/treatment-plans?limit=5"
  "sessions"      = "/treatment-sessions/today"
  "admissions"    = "/admissions?limit=5"
  "wards"         = "/wards"
  "lab"           = "/lab/orders?limit=5"
  "pharmacy"      = "/medicines?limit=5"
  "billing"       = "/bills?limit=5"
  "diet"          = "/diet/kitchen-sheet"
  "reports"       = "/reports/summary"
  "doctors"       = "/doctors?limit=5"
  "departments"   = "/departments"
  "users"         = "/users?limit=5"
  "roles"         = "/roles"
  "audit"         = "/audit-logs?limit=5"
  "profile"       = "/auth/me"
}

# Page -> required nav permission (mirrors AdminLayout.tsx)
$pagePerm = @{
  "dashboard"    = "dashboard.view"
  "patients"     = "patient.view"
  "appointments" = "appointment.view"
  "encounters"   = "encounter.view"
  "referrals"    = "referral.view"
  "treatment"    = "treatment.view"
  "sessions"     = "treatment.session"
  "admissions"   = "admission.view"
  "wards"        = "ward.view"
  "lab"          = "lab.view"
  "pharmacy"     = "pharmacy.view"
  "billing"      = "billing.view"
  "diet"         = "diet.serve"
  "reports"      = "reports.view"
  "doctors"      = "doctor.view"
  "departments"  = "department.view"
  "users"        = "user.view"
  "roles"        = "role.manage"
  "audit"        = "audit.view"
  "profile"      = ""   # no permission gate
}

# API-level GET gating can be looser than the frontend page gate.
# departments: GET is auth-only (reference data) -> 200 for every role.
# roles: GET requires user.view (PUT needs role.manage) -> 200 for roles with user.view.
$apiGateOverride = @{
  "departments" = @{ mode = "anyAuth" }   # 200 for all authenticated roles
  "doctors"     = @{ mode = "anyAuth" }   # GET is auth-only reference data
  "roles"       = @{ mode = "perm"; perm = "user.view" }  # 200 if role holds user.view
}

# Role -> set of permission names (derived from database.go rolePerms) for gate overrides.
$rolePermsOverride = @{
  "SUPER_ADMIN"        = @("user.view")
  "HOSPITAL_ADMIN"     = @("user.view")
  "RECEPTIONIST"       = @()
  "DOCTOR"             = @()
  "PANCHAKARMA_DOCTOR" = @()
  "NURSE"              = @()
  "THERAPIST"          = @()
  "PHARMACIST"         = @()
  "BILLING_ACCOUNTS"   = @()
  "WARD_STAFF"         = @()
  "DIET_KITCHEN"       = @()
  "LAB_STAFF"          = @()
}

# Role -> set of page keys that role may access (derived from database.go rolePerms).
$rolePages = @{
  "SUPER_ADMIN" = @("dashboard","patients","appointments","encounters","referrals","treatment","sessions","admissions","wards","lab","pharmacy","billing","diet","reports","doctors","departments","users","roles","audit","profile")
  "HOSPITAL_ADMIN" = @("dashboard","patients","appointments","encounters","referrals","treatment","sessions","admissions","wards","lab","pharmacy","billing","diet","reports","doctors","departments","users","audit","profile")
  "RECEPTIONIST" = @("dashboard","patients","appointments","encounters","treatment","billing","doctors","departments","profile")
  "DOCTOR" = @("dashboard","patients","appointments","encounters","referrals","treatment","sessions","admissions","wards","lab","pharmacy","billing","doctors","profile")
  "PANCHAKARMA_DOCTOR" = @("dashboard","patients","appointments","encounters","referrals","treatment","sessions","admissions","wards","lab","pharmacy","billing","doctors","profile")
  "NURSE" = @("dashboard","patients","encounters","treatment","admissions","wards","diet","doctors","profile")
  "THERAPIST" = @("dashboard","patients","encounters","treatment","sessions","doctors","profile")
  "PHARMACIST" = @("dashboard","patients","encounters","pharmacy","billing","doctors","profile")
  "BILLING_ACCOUNTS" = @("dashboard","patients","billing","profile")
  "WARD_STAFF" = @("dashboard","patients","encounters","treatment","doctors","profile")
  "DIET_KITCHEN" = @("dashboard","patients","encounters","treatment","diet","doctors","profile")
  "LAB_STAFF" = @("dashboard","patients","encounters","treatment","lab","doctors","profile")
}

# Role -> email to login with.
$roleCreds = @{
  "SUPER_ADMIN" = @{ email = $AdminEmail; password = $AdminPassword }
  "HOSPITAL_ADMIN" = @{ email = "demo.hadmin@ahms.local"; password = $DemoPassword }
  "RECEPTIONIST" = @{ email = "demo.receptionist@ahms.local"; password = $DemoPassword }
  "DOCTOR" = @{ email = "demo.doctor@ahms.local"; password = $DemoPassword }
  "PANCHAKARMA_DOCTOR" = @{ email = "demo.pkdoctor@ahms.local"; password = $DemoPassword }
  "NURSE" = @{ email = "demo.nurse@ahms.local"; password = $DemoPassword }
  "THERAPIST" = @{ email = "demo.therapist@ahms.local"; password = $DemoPassword }
  "PHARMACIST" = @{ email = "demo.pharmacist@ahms.local"; password = $DemoPassword }
  "BILLING_ACCOUNTS" = @{ email = "demo.billing@ahms.local"; password = $DemoPassword }
  "WARD_STAFF" = @{ email = "demo.wardstaff@ahms.local"; password = $DemoPassword }
  "DIET_KITCHEN" = @{ email = "demo.diet@ahms.local"; password = $DemoPassword }
  "LAB_STAFF" = @{ email = "demo.lab@ahms.local"; password = $DemoPassword }
}

$results = @()
$passCount = 0
$failCount = 0

foreach ($role in $roleCreds.Keys | Sort-Object) {
  $cred = $roleCreds[$role]
  Write-Step "Verifying role: $role ($($cred.email))"
  $login = Invoke-Login -Email $cred.email -Password $cred.password
  if (-not $login) {
    Write-Warn "login failed for $role - skipping"
    $results += [PSCustomObject]@{ Role = $role; Page = "(login)"; Expected = "2xx"; Actual = "LOGIN-FAIL"; Result = "FAIL" }
    $failCount++
    continue
  }
  $token = $login.access_token

  # 1) Allowed pages must return 2xx
  foreach ($page in $rolePages[$role]) {
    $path = $pages[$page]
    $status = Get-Status -Path $path -Token $token
    $ok = $status -ge 200 -and $status -lt 300
    if ($ok) {
      Write-Ok "$page ($status) -> $path"
      $passCount++
      $results += [PSCustomObject]@{ Role = $role; Page = $page; Expected = "2xx"; Actual = $status; Result = "PASS" }
    } else {
      Write-Warn "$page expected 2xx got $status -> $path"
      $failCount++
      $results += [PSCustomObject]@{ Role = $role; Page = $page; Expected = "2xx"; Actual = $status; Result = "FAIL" }
    }
  }

  # 2) Forbidden pages must return 403 (honoring API-level gate overrides)
  $forbidden = @($pagePerm.Keys) | Where-Object {
    $pagePerm[$_] -ne "" -and -not ($rolePages[$role] -contains $_)
  }
  foreach ($page in ($forbidden | Sort-Object)) {
    $path = $pages[$page]
    $status = Get-Status -Path $path -Token $token
    $override = $apiGateOverride[$page]
    $expectForbidden = $true
    if ($override -and $override.mode -eq "anyAuth") {
      $expectForbidden = $false
    } elseif ($override -and $override.mode -eq "perm") {
      if ($rolePermsOverride[$role] -contains $override.perm) { $expectForbidden = $false }
    }
    if (-not $expectForbidden) {
      if ($status -ge 200 -and $status -lt 300) {
        Write-Ok "$page accessible by design ($status)"
        $passCount++
        $results += [PSCustomObject]@{ Role = $role; Page = $page; Expected = "2xx(bydesign)"; Actual = $status; Result = "PASS" }
      } else {
        Write-Warn "$page expected 2xx by design but got $status"
        $failCount++
        $results += [PSCustomObject]@{ Role = $role; Page = $page; Expected = "2xx(bydesign)"; Actual = $status; Result = "FAIL" }
      }
      continue
    }
    if ($status -eq 403) {
      Write-Ok "$page correctly denied (403)"
      $passCount++
      $results += [PSCustomObject]@{ Role = $role; Page = $page; Expected = "403"; Actual = $status; Result = "PASS" }
    } elseif ($status -ge 200 -and $status -lt 300) {
      Write-Warn "$page should be 403 but got $status (RBAC leak!) -> $path"
      $failCount++
      $results += [PSCustomObject]@{ Role = $role; Page = $page; Expected = "403"; Actual = $status; Result = "FAIL" }
    } else {
      Write-Warn "$page expected 403 got $status (verify manually)"
      $failCount++
      $results += [PSCustomObject]@{ Role = $role; Page = $page; Expected = "403"; Actual = $status; Result = "FAIL" }
    }
  }
}

Write-Step "Verification summary"
Write-Host "  Pass: $passCount   Fail: $failCount" -ForegroundColor Green

$outDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$results | ConvertTo-Json -Depth 4 | Set-Content -Path (Join-Path $outDir "verify-results.json")
Write-Ok "Results written to $outDir\verify-results.json"
