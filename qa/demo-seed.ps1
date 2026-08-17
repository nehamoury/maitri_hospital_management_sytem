<#
.SYNOPSIS
  AHMS demo-data seed for manual QA of every admin panel / role.

.DESCRIPTION
  Creates:
    - Demo login accounts for every staff role (SUPER_ADMIN already exists,
      HOSPITAL_ADMIN, RECEPTIONIST, DOCTOR, PANCHAKARMA_DOCTOR, NURSE,
      THERAPIST, PHARMACIST, BILLING_ACCOUNTS, WARD_STAFF, DIET_KITCHEN,
      LAB_STAFF) plus a PATIENT for the portal.
    - Demo clinical/business data so every admin page shows real content:
      patients, appointments, encounters, consultations, prescriptions,
      medicines + stock, bills + payments, referrals, treatment plans +
      sessions, lab orders, IPD admission + notes/orders, diet plan + meals.

  Idempotent: safe to re-run. Existing demo records are skipped.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\qa\demo-seed.ps1
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
function Write-Ok($msg)   { Write-Host ("  [OK]   " + $msg) -ForegroundColor Green }
function Write-Warn($msg) { Write-Host ("  [SKIP] " + $msg) -ForegroundColor Yellow }

# --- HTTP helpers -------------------------------------------------------------
$script:LastLoginAt = [datetime]::MinValue

function Invoke-Login {
  param($Email, $Password)
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
    return $null
  }
}

function Invoke-Api {
  param(
    [string]$Method,
    [string]$Path,
    $Token,
    $Body
  )
  $headers = @{}
  if ($Token) { $headers["Authorization"] = "Bearer $Token" }
  $uri = "$BaseUrl$Path"
  try {
    $params = @{ Uri = $uri; Method = $Method; Headers = $headers; ContentType = "application/json"; TimeoutSec = 60 }
    if ($null -ne $Body) { $params.Body = ($Body | ConvertTo-Json -Depth 15) }
    $resp = Invoke-RestMethod @params
    return @{ Success = $true; Status = 200; Data = $resp.data; Raw = $resp }
  } catch {
    $status = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
    $msg = $_.ErrorDetails.Message
    if (-not $msg -and $_.Exception.Message) { $msg = $_.Exception.Message }
    return @{ Success = $false; Status = $status; Raw = $msg }
  }
}

function Ensure-User {
  param($FullName, $Email, $Mobile, $RoleId)
  $list = Invoke-Api -Method GET -Path "/users" -Token $script:AdminToken
  $existing = @($list.Data) | Where-Object { $_.email -eq $Email } | Select-Object -First 1
  if ($existing) {
    Write-Warn "user already exists: $Email"
    return $existing.id
  }
  $r = Invoke-Api -Method POST -Path "/users" -Token $script:AdminToken -Body @{
    full_name = $FullName
    email     = $Email
    mobile    = $Mobile
    password  = $DemoPassword
    role_id   = $RoleId
  }
  if ($r.Success) {
    Write-Ok "created $Email ($FullName)"
    return $r.Data.id
  }
  if ($r.Status -eq 409) {
    Write-Warn "user exists (duplicate) $Email"
    $list = Invoke-Api -Method GET -Path "/users" -Token $script:AdminToken
    $u = @($list.Data) | Where-Object { $_.email -eq $Email } | Select-Object -First 1
    return $u.id
  }
  throw "Failed to create user $Email`n$($r.Raw)"
}

# --- 1. Login as admin ----------------------------------------------------------
Write-Step "Login as Super Admin"
$admin = Invoke-Login -Email $AdminEmail -Password $AdminPassword
$script:AdminToken = $admin.access_token
if (-not $script:AdminToken) { throw "Admin login failed" }
Write-Ok "Logged in as $AdminEmail (role $($admin.user.role_name))"

# --- 2. Roles map ---------------------------------------------------------------
Write-Step "Fetch roles"
$rolesResp = Invoke-Api -Method GET -Path "/roles" -Token $script:AdminToken
if (-not $rolesResp.Success) { throw "Failed to fetch roles: $($rolesResp.Raw)" }
$roles = @{}
foreach ($role in $rolesResp.Data) { $roles[$role.name] = $role.id }
Write-Ok "Roles loaded: $($roles.Keys -join ', ')"

# --- 3. Departments map ---------------------------------------------------------
Write-Step "Fetch departments"
$deptResp = Invoke-Api -Method GET -Path "/departments" -Token $script:AdminToken
if (-not $deptResp.Success) { throw "Failed to fetch departments: $($deptResp.Raw)" }
$depts = @{}
foreach ($d in $deptResp.Data) { $depts[$d.code] = @{ id = $d.id; name = $d.name } }
Write-Ok "Departments loaded: $($depts.Keys -join ', ')"

# --- 4. Demo staff users ---------------------------------------------------------
Write-Step "Create demo staff users (password: $DemoPassword)"
$users = @{}

$users["hadmin"]    = Ensure-User -FullName "Demo Hospital Admin"     -Email "demo.hadmin@ahms.local"    -Mobile "9100000001" -RoleId $roles["HOSPITAL_ADMIN"]
$users["reception"] = Ensure-User -FullName "Demo Receptionist"       -Email "demo.receptionist@ahms.local" -Mobile "9100000002" -RoleId $roles["RECEPTIONIST"]
$users["nurse"]     = Ensure-User -FullName "Demo Nurse"              -Email "demo.nurse@ahms.local"     -Mobile "9100000003" -RoleId $roles["NURSE"]
$users["pkdoctor"]  = Ensure-User -FullName "Demo Panchakarma Doctor" -Email "demo.pkdoctor@ahms.local"  -Mobile "9100000004" -RoleId $roles["PANCHAKARMA_DOCTOR"]
$users["therapist"] = Ensure-User -FullName "Demo Therapist"          -Email "demo.therapist@ahms.local" -Mobile "9100000005" -RoleId $roles["THERAPIST"]
$users["pharmacist"]= Ensure-User -FullName "Demo Pharmacist"         -Email "demo.pharmacist@ahms.local" -Mobile "9100000006" -RoleId $roles["PHARMACIST"]
$users["billing"]   = Ensure-User -FullName "Demo Billing Clerk"      -Email "demo.billing@ahms.local"   -Mobile "9100000007" -RoleId $roles["BILLING_ACCOUNTS"]
$users["ward"]      = Ensure-User -FullName "Demo Ward Staff"         -Email "demo.wardstaff@ahms.local" -Mobile "9100000008" -RoleId $roles["WARD_STAFF"]
$users["diet"]      = Ensure-User -FullName "Demo Diet Staff"         -Email "demo.diet@ahms.local"      -Mobile "9100000009" -RoleId $roles["DIET_KITCHEN"]
$users["lab"]       = Ensure-User -FullName "Demo Lab Staff"          -Email "demo.lab@ahms.local"       -Mobile "9100000010" -RoleId $roles["LAB_STAFF"]

# --- 5. Demo doctors (provision DOCTOR login via /doctors) ----------------------
Write-Step "Create demo doctors"
$doctorResp = Invoke-Api -Method GET -Path "/doctors" -Token $script:AdminToken
$existingDoctors = @{}
foreach ($d in $doctorResp.Data) { $existingDoctors[$d.email.ToLower()] = $d }

function Ensure-Doctor {
  param($FullName, $Email, $Mobile, $DeptCode, $Specialization, $Qualification, $Years, $Fee)
  if ($existingDoctors.ContainsKey($Email.ToLower())) {
    Write-Warn "doctor already exists: $Email"
    return $existingDoctors[$Email.ToLower()].id
  }
  $r = Invoke-Api -Method POST -Path "/doctors" -Token $script:AdminToken -Body @{
    full_name         = $FullName
    email             = $Email
    mobile            = $Mobile
    password          = $DemoPassword
    department_id     = $depts[$DeptCode].id
    specialization    = $Specialization
    qualification     = $Qualification
    experience_years  = $Years
    consultation_fee  = $Fee
  }
  if ($r.Success) {
    Write-Ok "created doctor $Email"
    return $r.Data.id
  }
  throw "Failed to create doctor $Email`n$($r.Raw)"
}

$doctors = @{}
$doctors["demo"]   = Ensure-Doctor -FullName "Demo Ayurvedic Doctor"  -Email "demo.doctor@ahms.local"  -Mobile "9100000011" -DeptCode "KAYA" -Specialization "Kayachikitsa (General Medicine)" -Qualification "BAMS, MD (Kaya)" -Years 10 -Fee 500
$doctors["panc"]   = Ensure-Doctor -FullName "Demo Panchakarma Specialist" -Email "demo.panch@ahms.local" -Mobile "9100000012" -DeptCode "PANCH" -Specialization "Panchakarma Therapy" -Qualification "BAMS, MD (Panchakarma)" -Years 8 -Fee 800
$users["doctor"]   = $doctors["demo"]

# --- 6. Demo patients ------------------------------------------------------------
Write-Step "Create demo patients"
$patientDefs = @(
  @{ full_name = "Demo Patient Aarav Sharma"; gender = "MALE";   age = 42; mobile = "9200000001"; blood_group = "O+"; city = "Nagpur"; state = "Maharashtra"; address = "12, Shastri Nagar"; occupation = "Engineer"; registration_type = "WALK_IN"; chronic_diseases = "Hypertension"; allergies = "None" },
  @{ full_name = "Demo Patient Meera Iyer";  gender = "FEMALE"; age = 35; mobile = "9200000002"; blood_group = "B+"; city = "Pune"; state = "Maharashtra"; address = "45, FC Road"; occupation = "Teacher"; registration_type = "ONLINE"; current_medication = "Thyroxine" },
  @{ full_name = "Demo Patient Rohan Gupta"; gender = "MALE";   age = 58; mobile = "9200000003"; blood_group = "A+"; city = "Mumbai"; state = "Maharashtra"; address = "8, Linking Road"; occupation = "Business"; registration_type = "REFERRAL"; chronic_diseases = "Diabetes Type 2"; allergies = "Penicillin" },
  @{ full_name = "Demo Patient Kavita Joshi"; gender = "FEMALE"; age = 29; mobile = "9200000004"; blood_group = "AB+"; city = "Nagpur"; state = "Maharashtra"; address = "77, Bajaj Nagar"; occupation = "Designer"; registration_type = "WALK_IN" }
)
$patients = @()
foreach ($def in $patientDefs) {
  $search = Invoke-Api -Method GET -Path ("/patients?search=" + $def.mobile) -Token $script:AdminToken
  if (-not $search.Success) { throw "Patient search failed (backend bug?): $($search.Raw)" }
  $existing = @($search.Data | Where-Object { $_.mobile -eq $def.mobile })
  if ($existing.Count -gt 0) {
    Write-Warn "patient already exists: $($def.full_name) ($($def.mobile))"
    $patients += $existing[0]
    continue
  }
  $body = @{
    full_name        = $def.full_name
    gender           = $def.gender
    age              = $def.age
    mobile           = $def.mobile
    blood_group      = $def.blood_group
    address          = $def.address
    city             = $def.city
    state            = $def.state
    occupation       = $def.occupation
    registration_type = $def.registration_type
  }
  if ($def.chronic_diseases) { $body.chronic_diseases = $def.chronic_diseases }
  if ($def.allergies) { $body.allergies = $def.allergies }
  if ($def.current_medication) { $body.current_medication = $def.current_medication }
  $r = Invoke-Api -Method POST -Path "/patients" -Token $script:AdminToken -Body $body
  if ($r.Success) {
    Write-Ok "registered $($def.full_name) -> $($r.Data.uhid)"
    $patients += $r.Data
  } elseif ($r.Status -eq 409) {
    Write-Warn "duplicate patient (409) $($def.full_name); using existing"
    $dup = @($r.Data.existing_patients) | Select-Object -First 1
    if (-not $dup) {
      $res = Invoke-Api -Method GET -Path ("/patients?search=" + $def.mobile) -Token $script:AdminToken
      $dup = @($res.Data | Where-Object { $_.mobile -eq $def.mobile }) | Select-Object -First 1
    }
    $patients += $dup
  } else {
    throw "Failed to create patient $($def.full_name)`n$($r.Raw)"
  }
}
$patientA = $patients[0]
$patientB = $patients[1]

# --- 7. Pharmacy: medicines + stock ---------------------------------------------
Write-Step "Seed pharmacy master (only if empty)"
$medResp = Invoke-Api -Method GET -Path "/medicines" -Token $script:AdminToken
$medicines = @{}
if (@($medResp.Data).Count -eq 0) {
  $medDefs = @(
    @{ name = "Triphala Churna";    formulation = "Churna";   unit = "gm";  stock = 5000; low = 1000; expiry = (Get-Date).AddYears(1).ToString("yyyy-MM-dd") },
    @{ name = "Ashwagandha Capsule"; formulation = "Capsule";  unit = "cap"; stock = 800;  low = 200;  expiry = (Get-Date).AddYears(2).ToString("yyyy-MM-dd") },
    @{ name = "Chyawanprash";        formulation = "Avaleha";  unit = "gm";  stock = 120;  low = 150;  expiry = (Get-Date).AddMonths(8).ToString("yyyy-MM-dd") },
    @{ name = "Shirodhara Oil (Ksheerabala)"; formulation = "Taila"; unit = "ml"; stock = 45; low = 100; expiry = (Get-Date).AddMonths(2).ToString("yyyy-MM-dd") },
    @{ name = "Mahatiktaka Ghrita";  formulation = "Ghrita";   unit = "ml";  stock = 600;  low = 100;  expiry = (Get-Date).AddYears(1).ToString("yyyy-MM-dd") }
  )
  foreach ($m in $medDefs) {
    $r = Invoke-Api -Method POST -Path "/medicines" -Token $script:AdminToken -Body @{
      name = $m.name; formulation = $m.formulation; unit = $m.unit; batch_number = "BAT-$(Get-Random -Minimum 1000 -Maximum 9999)"
      expiry_date = $m.expiry; stock_qty = $m.stock; low_stock_threshold = $m.low
    }
    if ($r.Success) { $medicines[$r.Data.name] = $r.Data.id; Write-Ok "medicine: $($m.name)" }
    else { Write-Warn "medicine create failed: $($r.Raw)" }
  }
  Write-Ok "Seeded 5 medicines (2 are low-stock to show alerts)"
} else {
  Write-Warn "medicines already present ($(@($medResp.Data).Count) items) - skipping medicine seed"
  foreach ($m in $medResp.Data) { $medicines[$m.name] = $m.id }
}

# --- 8. Login tokens needed for clinical flows ------------------------------------
$doctorLogin = $null
$pharmaLogin = $null
$billingLogin = $null
$pkLogin = $null
$therapistLogin = $null
$labLogin = $null
$dietLogin = $null
$nurseLogin = $null

if ($users["doctor"]) {
  $doctorLogin = Invoke-Login -Email "demo.doctor@ahms.local" -Password $DemoPassword
}
if ($users["pharmacist"]) {
  $pharmaLogin = Invoke-Login -Email "demo.pharmacist@ahms.local" -Password $DemoPassword
}
if ($users["billing"]) {
  $billingLogin = Invoke-Login -Email "demo.billing@ahms.local" -Password $DemoPassword
}
if ($users["pkdoctor"]) {
  $pkLogin = Invoke-Login -Email "demo.pkdoctor@ahms.local" -Password $DemoPassword
}
if ($users["therapist"]) {
  $therapistLogin = Invoke-Login -Email "demo.therapist@ahms.local" -Password $DemoPassword
}
if ($users["lab"]) {
  $labLogin = Invoke-Login -Email "demo.lab@ahms.local" -Password $DemoPassword
}
if ($users["diet"]) {
  $dietLogin = Invoke-Login -Email "demo.diet@ahms.local" -Password $DemoPassword
}
if ($users["nurse"]) {
  $nurseLogin = Invoke-Login -Email "demo.nurse@ahms.local" -Password $DemoPassword
}
Write-Ok "Clinical-flow logins acquired"

# --- 9. Appointments --------------------------------------------------------------
Write-Step "Book demo appointments"
$today = (Get-Date).ToString("yyyy-MM-dd")
$tomorrow = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")

$apptCheck = Invoke-Api -Method GET -Path ("/appointments?patient_id=" + $patientA.id) -Token $script:AdminToken
if (@($apptCheck.Data).Count -eq 0) {
  $apptDefs = @(
    @{ patient_id = $patientA.id; doctor_id = $doctors["demo"]; appointment_date = $today;    time_slot = "09:00 AM"; reason = "DEMO: Joint pain and fatigue" },
    @{ patient_id = $patientA.id; doctor_id = $doctors["demo"]; appointment_date = $tomorrow; time_slot = "11:30 AM"; reason = "DEMO: Follow-up review" },
    @{ patient_id = $patientB.id; doctor_id = $doctors["panc"]; appointment_date = $today;    time_slot = "10:00 AM"; reason = "DEMO: Panchakarma consultation" },
    @{ patient_id = $patients[2].id; doctor_id = $doctors["demo"]; appointment_date = $tomorrow; time_slot = "02:00 PM"; reason = "DEMO: Diabetes review" }
  )
  foreach ($a in $apptDefs) {
    $r = Invoke-Api -Method POST -Path "/appointments" -Token $script:AdminToken -Body $a
    if ($r.Success) { Write-Ok ("appointment booked for " + $r.Data.patient_name + " token " + $r.Data.token_number) }
    else { Write-Warn ("appointment create failed: " + $r.Raw) }
  }
} else {
  Write-Warn "demo patient already has appointments - skipping booking"
}

# --- 10. Encounters + consultation + prescription ---------------------------------
Write-Step "Seed encounters / consultation / prescription for demo doctor"
$encList = Invoke-Api -Method GET -Path ("/encounters?patient_id=" + $patientA.id) -Token $script:AdminToken
$encounters = @()
if (@($encList.Data).Count -eq 0) {
  # Encounter 1 (today, completed) - so token board + completed flows have data
  $enc1 = Invoke-Api -Method POST -Path "/encounters" -Token $script:AdminToken -Body @{
    patient_id = $patientA.id; department_id = $depts["KAYA"].id; doctor_id = $doctors["demo"]
    encounter_type = "OPD"; visit_type = "NEW"; visit_date = $today; consultation_fee = 500
  }
  if ($enc1.Success) {
    Write-Ok ("encounter created: " + $enc1.Data.id)
    $encounters += $enc1.Data
    Invoke-Api -Method PATCH -Path ("/encounters/" + $enc1.Data.id + "/status") -Token $script:AdminToken -Body @{ status = "WAITING" } | Out-Null
    Invoke-Api -Method PATCH -Path ("/encounters/" + $enc1.Data.id + "/status") -Token $script:AdminToken -Body @{ status = "IN_CONSULTATION" } | Out-Null
    Invoke-Api -Method PATCH -Path ("/encounters/" + $enc1.Data.id + "/status") -Token $script:AdminToken -Body @{ status = "COMPLETED" } | Out-Null
    Write-Ok "encounter 1 status advanced to COMPLETED"

    # Consultation by the demo doctor
    if ($doctorLogin) {
      $cons = Invoke-Api -Method POST -Path ("/encounters/" + $enc1.Data.id + "/consultation") -Token $doctorLogin.access_token -Body @{
        chief_complaints = "Joint pain, fatigue, poor digestion"
        history = "3 months of knee pain, aggravated by cold weather"
        examination = "BP 130/85, mild tenderness both knees"
        clinical_notes = "Vata-pitta vitiation"
        treatment_plan = "Panchakarma + herbal support"
        diet_pathya = "Warm, easily digestible foods"
        diet_apathya = "Cold, oily, processed foods"
        prakriti = "Vata-Pitta"; dosha = "Vata"; agni = "Mandagni"; nadi = "Vata-Pitta"
        diagnoses = @(
          @{ diagnosis = "Sandhigata Vata (Osteoarthritis)"; diagnosis_type = "PRIMARY"; notes = "Bilateral knee" }
        )
        follow_up_date = $tomorrow
      }
      if ($cons.Success) { Write-Ok "consultation saved" } else { Write-Warn ("consultation failed: " + $cons.Raw) }

      # Prescription by the demo doctor
      $rx = Invoke-Api -Method POST -Path ("/encounters/" + $enc1.Data.id + "/prescriptions") -Token $doctorLogin.access_token -Body @{
        notes = "Take with warm water after meals"
        items = @(
          @{ medicine = "Triphala Churna"; formulation = "Churna"; dose = "5 gm"; frequency = "BD"; duration = "14 days"; quantity = 140; anupana = "Warm water"; route = "Oral" },
          @{ medicine = "Ashwagandha Capsule"; formulation = "Capsule"; dose = "1 cap"; frequency = "HS"; duration = "30 days"; quantity = 30; anupana = "Milk"; route = "Oral" }
        )
      }
      if ($rx.Success) {
        Write-Ok ("prescription created: " + $rx.Data.id)
        $script:DispenseRxId = $rx.Data.id
        $script:DispenseItem = $rx.Data.items[0]
      } else { Write-Warn ("prescription failed: " + $rx.Raw) }
    }
  } else {
    Write-Warn ("encounter create failed: " + $enc1.Raw)
  }

  # Encounter 2 (today, waiting) - so token board shows a live queue
  $enc2 = Invoke-Api -Method POST -Path "/encounters" -Token $script:AdminToken -Body @{
    patient_id = $patientB.id; department_id = $depts["PANCH"].id; doctor_id = $doctors["panc"]
    encounter_type = "OPD"; visit_type = "NEW"; visit_date = $today; consultation_fee = 800
  }
  if ($enc2.Success) {
    Write-Ok ("encounter created (waiting): " + $enc2.Data.id)
    $encounters += $enc2.Data
  }
} else {
  Write-Warn "demo patient already has encounters - skipping"
  $encounters = @($encList.Data)
}

# --- 11. Dispense prescription (pharmacist) ---------------------------------------
if ($script:DispenseRxId -and $pharmaLogin) {
  Write-Step "Dispense prescription (pharmacist)"
  $disp = Invoke-Api -Method POST -Path ("/prescriptions/" + $script:DispenseRxId + "/dispense") -Token $pharmaLogin.access_token -Body @{
    items = @(@{ prescription_item_id = $script:DispenseItem.id; quantity = 140 })
  }
  if ($disp.Success) { Write-Ok "prescription dispensed -> $($disp.Data.status)" } else { Write-Warn ("dispense failed: " + $disp.Raw) }
}

# --- 12. Bills + payments (billing clerk) ------------------------------------------
Write-Step "Create demo bills"
$billCheck = Invoke-Api -Method GET -Path ("/bills?patient_id=" + $patientA.id) -Token $script:AdminToken
if (@($billCheck.Data).Count -eq 0) {
  if ($billingLogin) {
    $bill1 = Invoke-Api -Method POST -Path "/bills" -Token $billingLogin.access_token -Body @{
      patient_id = $patientA.id; discount = 0
      items = @(
        @{ description = "Consultation - Kayachikitsa"; quantity = 1; rate = 500; service_type = "CONSULTATION" },
        @{ description = "Triphala Churna 140gm"; quantity = 1; rate = 180; service_type = "MEDICINE" }
      )
    }
    if ($bill1.Success) {
      Write-Ok ("bill created: " + $bill1.Data.bill_no + " net " + $bill1.Data.net_amount)
      # Full payment
      $pay = Invoke-Api -Method POST -Path ("/bills/" + $bill1.Data.id + "/payments") -Token $billingLogin.access_token -Body @{ amount = $bill1.Data.net_amount; method = "UPI"; reference = "DEMO-PAY-1" }
      if ($pay.Success) { Write-Ok "payment recorded -> $($pay.Data.payment_status)" } else { Write-Warn ("payment failed: " + $pay.Raw) }
    } else { Write-Warn ("bill1 failed: " + $bill1.Raw) }

    $bill2 = Invoke-Api -Method POST -Path "/bills" -Token $billingLogin.access_token -Body @{
      patient_id = $patientB.id; discount = 50
      items = @(
        @{ description = "Panchakarma Consultation"; quantity = 1; rate = 800; service_type = "CONSULTATION" },
        @{ description = "Ashwagandha Capsule 30"; quantity = 1; rate = 250; service_type = "MEDICINE" }
      )
    }
    if ($bill2.Success) {
      Write-Ok ("bill created: " + $bill2.Data.bill_no + " net " + $bill2.Data.net_amount)
      # Partial payment -> stays PARTIAL (shows due amount badge)
      $partial = [Math]::Round($bill2.Data.net_amount / 2, 2)
      $pay2 = Invoke-Api -Method POST -Path ("/bills/" + $bill2.Data.id + "/payments") -Token $billingLogin.access_token -Body @{ amount = $partial; method = "CASH"; reference = "DEMO-PAY-2" }
      if ($pay2.Success) { Write-Ok "partial payment recorded -> $($pay2.Data.payment_status)" } else { Write-Warn ("partial payment failed: " + $pay2.Raw) }
    } else { Write-Warn ("bill2 failed: " + $bill2.Raw) }
  } else {
    Write-Warn "no billing login - skip bills"
  }
} else {
  Write-Warn "demo patient already has bills - skipping"
}

# --- 13. Referral -------------------------------------------------------------------
Write-Step "Create demo referral"
if ($encounters.Count -gt 0 -and $doctorLogin) {
  $refCheck = Invoke-Api -Method GET -Path "/referrals/incoming" -Token $script:AdminToken
  $existingRef = @($refCheck.Data) | Where-Object { $_.patient_id -eq $patientA.id } | Select-Object -First 1
  if (-not $existingRef) {
    $ref = Invoke-Api -Method POST -Path "/referrals" -Token $doctorLogin.access_token -Body @{
      patient_id = $patientA.id
      source_encounter_id = $encounters[0].id
      to_department_id = $depts["PANCH"].id
      reason = "Requires Panchakarma evaluation for chronic joint pain"
      priority = "ROUTINE"
      clinical_notes = "Refractory to oral medication"
      diagnosis = "Sandhigata Vata"
    }
    if ($ref.Success) {
      Write-Ok ("referral created: " + $ref.Data.referral_no)
      # Receive by the panchakarma doctor to move workflow
      if ($pkLogin) {
        $r2 = Invoke-Api -Method PATCH -Path ("/referrals/" + $ref.Data.id + "/status") -Token $pkLogin.access_token -Body @{ status = "RECEIVED" }
        if ($r2.Success) { Write-Ok "referral status -> RECEIVED" } else { Write-Warn ("referral receive failed: " + $r2.Raw) }
      }
    } else { Write-Warn ("referral create failed: " + $ref.Raw) }
  } else {
    Write-Warn "demo referral already exists - skipping"
  }
} else {
  Write-Warn "no encounter for referral - skipping"
}

# --- 14. Treatment plan + sessions ---------------------------------------------------
Write-Step "Create demo treatment plan (Panchakarma)"
$procResp = Invoke-Api -Method GET -Path "/procedure-types" -Token $script:AdminToken
$procTypes = @{}
foreach ($p in $procResp.Data) { $procTypes[$p.name] = $p.id }
$abhyanga = $procTypes["Abhyanga"]; if (-not $abhyanga) { $abhyanga = $procResp.Data[0].id }

$planCheck = Invoke-Api -Method GET -Path "/treatment-plans" -Token $script:AdminToken
$existingPlan = @($planCheck.Data) | Where-Object { $_.patient_id -eq $patientA.id } | Select-Object -First 1
if (-not $existingPlan) {
  if ($doctorLogin -and $users["therapist"]) {
    $plan = Invoke-Api -Method POST -Path "/treatment-plans" -Token $doctorLogin.access_token -Body @{
      patient_id = $patientA.id
      procedure_type_id = $abhyanga
      indication = "Chronic vata disorders - joint pain"
      planned_sessions = 7
      frequency = "DAILY"
      start_date = $today
      assigned_therapist_user_id = $users["therapist"]
      notes = "DEMO plan - full lifecycle"
    }
    if ($plan.Success) {
      Write-Ok ("treatment plan created: " + $plan.Data.plan_no + " (" + $plan.Data.planned_sessions + " sessions)")
      # Approve by Panchakarma doctor
      if ($pkLogin) {
        $appr = Invoke-Api -Method POST -Path ("/treatment-plans/" + $plan.Data.id + "/approve") -Token $pkLogin.access_token
        if ($appr.Success) { Write-Ok "plan approved by Panchakarma Doctor" } else { Write-Warn ("plan approve failed: " + $appr.Raw) }
      }
    } else { Write-Warn ("plan create failed: " + $plan.Raw) }
  } else {
    Write-Warn "missing doctor/therapist login - skip plan"
  }
} else {
  Write-Warn "demo treatment plan already exists - skipping"
}

# --- 15. Lab order (doctor -> collect -> result by lab staff) --------------------------
Write-Step "Create demo lab order"
$labCheck = Invoke-Api -Method GET -Path ("/lab/orders?patient_id=" + $patientA.id) -Token $script:AdminToken
$labData = @($labCheck.Data.data)
if (@($labData).Count -eq 0) {
  if ($doctorLogin) {
    $testsResp = Invoke-Api -Method GET -Path "/lab/tests" -Token $script:AdminToken
    $tests = @($testsResp.Data)
    if ($tests.Count -gt 0) {
      $order = Invoke-Api -Method POST -Path "/lab/orders" -Token $doctorLogin.access_token -Body @{
        patient_id = $patientA.id
        department_id = $depts["KAYA"].id
        priority = "ROUTINE"
        clinical_notes = "Baseline workup for joint pain"
        items = @($tests | Select-Object -First 2 | ForEach-Object { @{ test_id = $_.id } })
      }
      if ($order.Success) {
        Write-Ok ("lab order created: " + $order.Data.order_no)
        # Collect + process + result by lab staff
        if ($labLogin) {
          $collect = Invoke-Api -Method PUT -Path ("/lab/orders/" + $order.Data.id + "/collect") -Token $labLogin.access_token -Body @{ sample_type = "BLOOD"; collection_method = "VENIPUNCTURE"; is_adequate = $true }
          if ($collect.Success) { Write-Ok "sample collected" } else { Write-Warn ("collect failed: " + $collect.Raw) }
          Invoke-Api -Method PUT -Path ("/lab/orders/" + $order.Data.id + "/process") -Token $labLogin.access_token | Out-Null
          $results = @($order.Data.items | ForEach-Object { @{ item_id = $_.id; result_value = "NORMAL"; result_flag = "NORMAL"; remarks = "Within reference range" } })
          $enter = Invoke-Api -Method PUT -Path ("/lab/orders/" + $order.Data.id + "/result") -Token $labLogin.access_token -Body @{ results = $results }
          if ($enter.Success) { Write-Ok "results entered" } else { Write-Warn ("result entry failed: " + $enter.Raw) }
        }
      } else { Write-Warn ("lab order create failed: " + $order.Raw) }
    } else {
      Write-Warn "no lab tests seeded - skip lab order"
    }
  }
} else {
  Write-Warn "demo lab orders already exist - skipping"
}

# --- 16. IPD admission + notes + orders + diet ---------------------------------------
Write-Step "Create demo IPD admission"
$admCheck = Invoke-Api -Method GET -Path "/admissions" -Token $script:AdminToken
$existingAdm = @($admCheck.Data) | Where-Object { $_.patient_id -eq $patientA.id } | Select-Object -First 1
$admId = $null
if (-not $existingAdm) {
  $wardResp = Invoke-Api -Method GET -Path "/wards" -Token $script:AdminToken
  $ward = @($wardResp.Data) | Where-Object { $_.available_beds -gt 0 } | Select-Object -First 1
  $bedId = $null
  if ($ward -and $ward.beds) {
    $bed = @($ward.beds) | Where-Object { $_.status -eq "AVAILABLE" } | Select-Object -First 1
    if ($bed) { $bedId = $bed.id }
  }
  $adm = Invoke-Api -Method POST -Path "/admissions" -Token $script:AdminToken -Body @{
    patient_id = $patientA.id
    department_id = $depts["KAYA"].id
    doctor_id = $doctors["demo"]
    bed_id = $bedId
    admission_type = "PLANNED"
    admission_date = $today
    reason = "IPD Panchakarma therapy course"
    diagnosis = "Sandhigata Vata"
    expected_discharge_date = (Get-Date).AddDays(7).ToString("yyyy-MM-dd")
  }
  if ($adm.Success) {
    Write-Ok ("admission created: " + $adm.Data.admission_no + " bed " + $adm.Data.bed_no)
    $admId = $adm.Data.id
  } else {
    Write-Warn ("admission create failed: " + $adm.Raw)
  }
} else {
  Write-Warn "demo admission already exists - using it"
  $admId = $existingAdm.id
}

if ($admId) {
  $admDetail = (Invoke-Api -Method GET -Path ("/admissions/" + $admId) -Token $script:AdminToken).Data
  $hasNote = @($admDetail.progress_notes).Count -gt 0
  $hasOrder = @($admDetail.orders).Count -gt 0
  $hasDietOrder = @($admDetail.diet_orders).Count -gt 0

  # Nursing note (nurse) - if missing
  if (-not $hasNote -and $nurseLogin) {
    $note = Invoke-Api -Method POST -Path ("/admissions/" + $admId + "/notes") -Token $nurseLogin.access_token -Body @{ note_type = "NURSE_NOTE"; notes = "DEMO: Admission assessment completed"; shift = "MORNING"; vitals = @{ bp = "130/85"; pulse = "78"; temp = "98.6" } }
    if ($note.Success) { Write-Ok "nursing note added" } else { Write-Warn ("nursing note failed: " + $note.Raw) }
  } elseif ($hasNote) { Write-Warn "nursing note already exists" }

  # Clinical order (doctor) - if missing
  if (-not $hasOrder -and $doctorLogin) {
    $order = Invoke-Api -Method POST -Path ("/admissions/" + $admId + "/orders") -Token $doctorLogin.access_token -Body @{ order_type = "MEDICINE"; description = "Triphala Churna 5gm BD"; frequency = "BD"; quantity = "14 days" }
    if ($order.Success) { Write-Ok "clinical order added" } else { Write-Warn ("order failed: " + $order.Raw) }
  } elseif ($hasOrder) { Write-Warn "clinical order already exists" }

  # Diet plan (doctor) - if missing
  $dietForAdm = (Invoke-Api -Method GET -Path ("/diet/plans?admission_id=" + $admId) -Token $script:AdminToken).Data
  if (@($dietForAdm).Count -eq 0 -and $doctorLogin) {
    $dietPlan = Invoke-Api -Method POST -Path "/diet/plans" -Token $doctorLogin.access_token -Body @{
      admission_id = $admId
      patient_id = $patientA.id
      diet_type = "Laghu Ahar"
      pathya = "Warm kitchari, moong dal soup"
      apathya = "Cold drinks, fried food, curd at night"
      special_instructions = "No heavy grains after sunset"
      start_date = $today
      end_date = (Get-Date).AddDays(7).ToString("yyyy-MM-dd")
    }
    if ($dietPlan.Success) { Write-Ok ("diet plan prescribed: " + $dietPlan.Data.id) } else { Write-Warn ("diet plan failed: " + $dietPlan.Raw) }
  } elseif (@($dietForAdm).Count -gt 0) { Write-Warn "diet plan already exists for this admission" }

  # Kitchen sheet + generate meals (diet.manage permission -> admin token)
  $ks = Invoke-Api -Method GET -Path "/diet/kitchen-sheet?date=$today" -Token $script:AdminToken
  $mealCount = @($ks.Data).Count
  if ($mealCount -eq 0) {
    $gen = Invoke-Api -Method POST -Path "/diet/generate-meals" -Token $script:AdminToken -Body @{ date = $today }
    if ($gen.Success) { Write-Ok ("meal orders generated: " + $gen.Data.count) } else { Write-Warn ("generate meals failed: " + $gen.Raw) }
  } else {
    Write-Warn ("kitchen sheet already has " + $mealCount + " meal rows for today")
  }
} else {
  Write-Warn "no admission available - skipping IPD notes/orders/diet"
}

# --- 17. Patient portal demo account -----------------------------------------------
Write-Step "Patient portal demo"
Write-Ok "Portal login uses UHID + mobile. First demo patient:"
Write-Ok ("  UHID  : " + $patientA.uhid)
Write-Ok ("  Mobile: " + $patientA.mobile)

# --- 18. Summary ---------------------------------------------------------------------
Write-Step "Demo seed complete"
Write-Host "`nDemo credentials (password: $DemoPassword):" -ForegroundColor Green
$table = @()
$table += [PSCustomObject]@{ Role = "SUPER_ADMIN";          Email = $AdminEmail }
$table += [PSCustomObject]@{ Role = "HOSPITAL_ADMIN";       Email = "demo.hadmin@ahms.local" }
$table += [PSCustomObject]@{ Role = "RECEPTIONIST";         Email = "demo.receptionist@ahms.local" }
$table += [PSCustomObject]@{ Role = "DOCTOR";               Email = "demo.doctor@ahms.local" }
$table += [PSCustomObject]@{ Role = "PANCHAKARMA_DOCTOR";   Email = "demo.pkdoctor@ahms.local" }
$table += [PSCustomObject]@{ Role = "NURSE";                Email = "demo.nurse@ahms.local" }
$table += [PSCustomObject]@{ Role = "THERAPIST";            Email = "demo.therapist@ahms.local" }
$table += [PSCustomObject]@{ Role = "PHARMACIST";           Email = "demo.pharmacist@ahms.local" }
$table += [PSCustomObject]@{ Role = "BILLING_ACCOUNTS";     Email = "demo.billing@ahms.local" }
$table += [PSCustomObject]@{ Role = "WARD_STAFF";           Email = "demo.wardstaff@ahms.local" }
$table += [PSCustomObject]@{ Role = "DIET_KITCHEN";         Email = "demo.diet@ahms.local" }
$table += [PSCustomObject]@{ Role = "LAB_STAFF";            Email = "demo.lab@ahms.local" }
$table += [PSCustomObject]@{ Role = "PATIENT (portal)";     Email = "$($patientA.uhid) / $($patientA.mobile)" }
$table | Format-Table -AutoSize | Out-String | Write-Host
