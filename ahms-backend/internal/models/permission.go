package models

// Permission name constants. Permissions are stored as rows in the
// `permissions` table and assigned to roles via the role_permissions
// join table. Route guards use these names via RequirePermission.
// Names follow the module.action convention (e.g. patient.view) so the
// permission catalog stays uniform and new modules only add rows.
const (
	// Dashboard.
	PermDashboardView = "dashboard.view"

	// Patient.
	PermPatientView    = "patient.view"
	PermPatientCreate  = "patient.create"
	PermPatientEdit    = "patient.edit" // legacy alias (Phase 1 routes)
	PermPatientUpdate  = "patient.update"
	PermPatientDelete  = "patient.delete"
	PermPatientExport  = "patient.export"

	// Appointment.
	PermAppointmentView    = "appointment.view"
	PermAppointmentCreate  = "appointment.create"
	PermAppointmentUpdate  = "appointment.update"
	PermAppointmentCancel  = "appointment.cancel"
	PermAppointmentCheckin = "appointment.checkin"

	// Clinical read (shared across encounters/consultations).
	PermClinicalView = "clinical.view"

	// Encounter.
	PermEncounterView    = "encounter.view"
	PermEncounterCreate  = "encounter.create"
	PermEncounterUpdate  = "encounter.update"
	PermEncounterClose   = "encounter.close"

	// Consultation.
	PermConsultationView    = "consultation.view"
	PermConsultationCreate  = "consultation.create"
	PermConsultationUpdate  = "consultation.update"
	PermConsultationPrint   = "consultation.print"

	// Diagnosis.
	PermDiagnosisCreate = "diagnosis.create"

	// Prescription.
	PermPrescriptionView    = "prescription.view"
	PermPrescriptionCreate  = "prescription.create"
	PermPrescriptionUpdate  = "prescription.update"
	PermPrescriptionPrint   = "prescription.print"

	// Referral.
	PermReferralView    = "referral.view"
	PermReferralCreate  = "referral.create"
	PermReferralUpdate  = "referral.update"
	PermReferralAccept  = "referral.accept"
	PermReferralClose   = "referral.close"

	// Pharmacy.
	PermPharmacyView     = "pharmacy.view"
	PermPharmacyDispense = "pharmacy.dispense"
	PermPharmacyStock    = "pharmacy.stock"
	PermPharmacyPurchase = "pharmacy.purchase"
	PermInventoryManage  = "inventory.manage"

	// Billing.
	PermBillingView    = "billing.view"
	PermBillingCreate  = "billing.create"
	PermBillingPayment = "billing.payment"
	PermBillingRefund  = "billing.refund"
	PermBillPrint      = "bill.print"
	PermReceiptPrint   = "receipt.print"

	// Doctor.
	PermDoctorView    = "doctor.view"
	PermDoctorCreate  = "doctor.create"
	PermDoctorUpdate  = "doctor.update"
	PermDoctorDelete  = "doctor.delete"
	PermDoctorManage  = "doctor.manage" // legacy alias

	// Department.
	PermDepartmentView    = "department.view"
	PermDepartmentCreate  = "department.create"
	PermDepartmentUpdate  = "department.update"
	PermDepartmentDelete  = "department.delete"
	PermDepartmentManage  = "department.manage" // legacy alias

	// Users / roles.
	PermUserView    = "user.view"
	PermUserCreate  = "user.create"
	PermUserUpdate  = "user.update"
	PermUserDelete  = "user.delete"
	PermUserManage  = "user.manage" // legacy alias
	PermRoleManage  = "role.manage"
	PermConfigManage = "config.manage"

	// Audit & reports.
	PermAuditView    = "audit.view"
	PermReportsView  = "reports.view"
	PermReportsExport = "reports.export"

	// Treatment (generic procedure engine — Panchakarma is the first category).
	PermTreatmentView    = "treatment.view"
	PermTreatmentCreate  = "treatment.create"
	PermTreatmentUpdate  = "treatment.update"
	PermTreatmentApprove = "treatment.approve"
	PermTreatmentSession = "treatment.session" // therapist executes sessions
	PermTreatmentComplete = "treatment.complete"

	// IPD (wards, beds, admissions).
	PermWardView    = "ward.view"
	PermWardManage  = "ward.manage"
	PermAdmissionView     = "admission.view"
	PermAdmissionCreate   = "admission.create"
	PermAdmissionUpdate   = "admission.update"
	PermAdmissionDischarge = "admission.discharge"
	PermNoteCreate        = "note.create"
	PermDietCreate        = "diet.create"

	// Investigation / Lab.
	PermLabView    = "lab.view"    // View tests, orders, results
	PermLabOrder   = "lab.order"   // Doctor/staff orders investigation
	PermLabCollect = "lab.collect" // Lab staff collects sample
	PermLabResult  = "lab.result"  // Lab staff enters results
	PermLabVerify  = "lab.verify"  // Lab supervisor verifies result
	PermLabReview  = "lab.review"  // Doctor reviews result
	PermLabManage  = "lab.manage"  // Admin manages test master / categories

	// Diet / Kitchen.
	PermDietOrder  = "diet.order"  // Prescribe diet plan
	PermDietManage = "diet.manage" // Manage diet masters & configurations
	PermDietServe  = "diet.serve"  // Mark meals prepared/served
)

// Permission represents a single fine-grained capability (e.g.
// "patients:create", "appointments:cancel"). Roles are associated with
// permissions via a many-to-many join table. Phase 1 relies primarily on
// role-name checks in middleware, but the table exists from day one so
// permission-level checks can be introduced later without a schema change.
type Permission struct {
	BaseModel
	Name        string `gorm:"type:varchar(100);uniqueIndex;not null" json:"name"`
	Description string `gorm:"type:text" json:"description"`

	Roles []Role `gorm:"many2many:role_permissions;" json:"-"`
}

func (Permission) TableName() string {
	return "permissions"
}
