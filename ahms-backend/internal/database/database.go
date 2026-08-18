// Package database manages the PostgreSQL connection (via GORM), schema
// migrations, and baseline data seeding (system roles).
package database

import (
	"errors"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/ahms/backend/internal/config"
	"github.com/ahms/backend/internal/models"
	"github.com/ahms/backend/internal/utils"
	"github.com/google/uuid"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Connect opens a GORM connection to PostgreSQL using the given config,
// with sane connection-pool defaults and retry-on-startup behaviour
// (useful when the DB container is still booting under docker-compose).
func Connect(cfg *config.Config) (*gorm.DB, error) {
	gormLogLevel := logger.Warn
	if !cfg.IsProduction() {
		gormLogLevel = logger.Info
	}

	var db *gorm.DB
	var err error

	maxAttempts := 10
	for attempt := 1; attempt <= maxAttempts; attempt++ {
		db, err = gorm.Open(postgres.Open(cfg.DSN()), &gorm.Config{
			Logger: logger.Default.LogMode(gormLogLevel),
		})
		if err == nil {
			break
		}
		log.Printf("database: connection attempt %d/%d failed: %v", attempt, maxAttempts, err)
		time.Sleep(2 * time.Second)
	}
	if err != nil {
		return nil, fmt.Errorf("database: could not connect after %d attempts: %w", maxAttempts, err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("database: failed to get underlying sql.DB: %w", err)
	}
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)

	log.Println("database: connected successfully")
	return db, nil
}

// Migrate runs GORM auto-migration for every entity. Order matters:
// tables with foreign keys must be migrated after the tables they
// reference.
func Migrate(db *gorm.DB) error {
	log.Println("database: running migrations...")
	if err := db.AutoMigrate(
		&models.Permission{},
		&models.Role{},
		&models.User{},
		&models.Department{},
		&models.Doctor{},
		&models.Patient{},
		&models.PatientDocument{},
		&models.UHIDCounter{},
		&models.Appointment{},
		&models.AuditLog{},
		&models.Encounter{},
		&models.Consultation{},
		&models.Diagnosis{},
		&models.Prescription{},
		&models.PrescriptionItem{},
		&models.Referral{},
		&models.ReferralCounter{},
		&models.ReferralAttachment{},
		&models.Medicine{},
		&models.InventoryTransaction{},
		&models.Bill{},
		&models.BillItem{},
		&models.BillCounter{},
		&models.Payment{},
		&models.ProcedureType{},
		&models.TreatmentPlan{},
		&models.TreatmentSession{},
		&models.TreatmentPlanCounter{},

		// Investigation / Lab
		&models.InvestigationCategory{},
		&models.InvestigationTest{},
		&models.InvestigationOrder{},
		&models.InvestigationOrderItem{},
		&models.InvestigationSample{},
		&models.InvestigationOrderCounter{},

		// Diet / Kitchen
		&models.DietPlan{},
		&models.MealOrder{},
		&models.DietTemplate{},

		// IPD / Ward management
		&models.Ward{},
		&models.Bed{},
		&models.Admission{},
		&models.AdmissionBed{},
		&models.ProgressNote{},
		&models.AdmissionOrder{},
		&models.DietOrder{},
		&models.DischargeSummary{},
		&models.AdmissionCounter{},
	); err != nil {
		return fmt.Errorf("database: migration failed: %w", err)
	}

	// Diet: migrate legacy meal statuses to the new lifecycle. Historical
	// PREPARED rows mean "meal ready for serving" (the old flow had no
	// separate PREPARING step), so they map one-time to READY — never to
	// PREPARING. Idempotent: after the first run no PREPARED rows remain.
	if err := db.Model(&models.MealOrder{}).
		Where("status = ?", models.MealStatusPrepared).
		Update("status", models.MealStatusReady).Error; err != nil {
		return fmt.Errorf("database: failed to migrate legacy meal statuses: %w", err)
	}

	log.Println("database: migrations complete")
	return nil
}

// SeedRoles ensures the system roles exist. It is idempotent (safe to
// run on every startup) via FirstOrCreate.
func SeedRoles(db *gorm.DB) error {
	roles := []models.Role{
		{Name: models.RoleSuperAdmin, DisplayName: "Super Admin", Description: "Complete system control across all modules."},
		{Name: models.RoleHospitalAdmin, DisplayName: "Hospital Admin", Description: "Manages hospital operations: departments, doctors, staff, and reports."},
		{Name: models.RoleReceptionist, DisplayName: "Receptionist", Description: "Registers patients, books appointments, and creates OPD visits at the front desk."},
		{Name: models.RoleDoctor, DisplayName: "Doctor", Description: "Performs consultations, diagnoses, prescriptions, and referrals."},
		{Name: models.RoleNurse, DisplayName: "Nurse", Description: "Records IPD vitals and nursing care."},
		{Name: models.RolePanchakarmaDoctor, DisplayName: "Panchakarma Doctor", Description: "Plans and supervises Panchakarma treatment."},
		{Name: models.RoleTherapist, DisplayName: "Therapist", Description: "Delivers assigned treatment sessions."},
		{Name: models.RolePharmacist, DisplayName: "Pharmacist", Description: "Dispenses medicines and manages pharmacy stock."},
		{Name: models.RoleBillingAccounts, DisplayName: "Billing / Accounts", Description: "Creates invoices, records payments, and manages accounts."},
		{Name: models.RoleWardStaff, DisplayName: "Ward Staff", Description: "Manages IPD beds and ward operations."},
		{Name: models.RoleDietKitchen, DisplayName: "Diet / Kitchen Staff", Description: "Prepares and delivers prescribed diets."},
		{Name: models.RoleLabStaff, DisplayName: "Lab Staff", Description: "Processes investigations and records results."},
		{Name: models.RolePatient, DisplayName: "Patient", Description: "Accesses the patient portal."},
	}

	for _, role := range roles {
		var existing models.Role
		result := db.Where("name = ?", role.Name).FirstOrCreate(&existing, role)
		if result.Error != nil {
			return fmt.Errorf("database: failed to seed role %s: %w", role.Name, result.Error)
		}
	}
	log.Println("database: system roles seeded")
	return nil
}

// SeedPermissions creates the permission catalog and assigns permissions
// to each role. Idempotent: permission rows are created via FirstOrCreate
// and join-table rows via FirstOrCreate on the association.
func SeedPermissions(db *gorm.DB) error {
	permissions := []models.Permission{
		{Name: models.PermPatientView, Description: "View patient records."},
		{Name: models.PermPatientCreate, Description: "Register new patients."},
		{Name: models.PermPatientEdit, Description: "Edit patient master data."},
		{Name: models.PermAppointmentView, Description: "View appointments."},
		{Name: models.PermAppointmentUpdate, Description: "Update appointment status."},
		{Name: models.PermClinicalView, Description: "View clinical records."},
		{Name: models.PermConsultationCreate, Description: "Create consultation notes."},
		{Name: models.PermDiagnosisCreate, Description: "Record diagnoses."},
		{Name: models.PermEncounterCreate, Description: "Create OPD/IPD encounters."},
		{Name: models.PermEncounterUpdate, Description: "Update encounter status."},
		{Name: models.PermPrescriptionCreate, Description: "Write prescriptions."},
		{Name: models.PermPrescriptionView, Description: "View prescriptions."},
		{Name: models.PermReferralCreate, Description: "Create referrals."},
		{Name: models.PermReferralUpdate, Description: "Update referral status."},
		{Name: models.PermReferralView, Description: "View referrals and history."},
		{Name: models.PermPharmacyDispense, Description: "Dispense medicines."},
		{Name: models.PermInventoryManage, Description: "Manage medicine inventory."},
		{Name: models.PermBillingCreate, Description: "Create invoices and record payments."},
		{Name: models.PermBillingView, Description: "View invoices and payments."},
		{Name: models.PermDepartmentManage, Description: "Manage departments."},
		{Name: models.PermDoctorManage, Description: "Manage doctors."},
		{Name: models.PermUserManage, Description: "Manage staff users."},
		{Name: models.PermRoleManage, Description: "Manage roles and permissions."},
		{Name: models.PermAuditView, Description: "View audit logs."},
		{Name: models.PermDashboardView, Description: "View dashboards."},
		{Name: models.PermConfigManage, Description: "Manage system configuration."},

		// --- Phase-1 granular catalog (built modules) ---
		{Name: models.PermPatientUpdate, Description: "Update patient records."},
		{Name: models.PermPatientDelete, Description: "Delete (deactivate) patient records."},
		{Name: models.PermPatientExport, Description: "Export patient data."},
		{Name: models.PermAppointmentCreate, Description: "Create appointments."},
		{Name: models.PermAppointmentCancel, Description: "Cancel appointments."},
		{Name: models.PermAppointmentCheckin, Description: "Check in appointments."},
		{Name: models.PermEncounterView, Description: "View encounters."},
		{Name: models.PermEncounterClose, Description: "Close encounters."},
		{Name: models.PermConsultationView, Description: "View consultations."},
		{Name: models.PermConsultationUpdate, Description: "Update consultations."},
		{Name: models.PermConsultationPrint, Description: "Print consultations."},
		{Name: models.PermPrescriptionUpdate, Description: "Update prescriptions."},
		{Name: models.PermPrescriptionPrint, Description: "Print prescriptions."},
		{Name: models.PermReferralAccept, Description: "Accept referrals."},
		{Name: models.PermReferralClose, Description: "Close referrals."},
		{Name: models.PermPharmacyView, Description: "View pharmacy inventory."},
		{Name: models.PermPharmacyStock, Description: "Adjust pharmacy stock."},
		{Name: models.PermPharmacyPurchase, Description: "Record pharmacy purchases."},
		{Name: models.PermBillingPayment, Description: "Record billing payments."},
		{Name: models.PermBillingRefund, Description: "Process billing refunds."},
		{Name: models.PermBillPrint, Description: "Print bills."},
		{Name: models.PermReceiptPrint, Description: "Print payment receipts."},
		{Name: models.PermDoctorView, Description: "View doctors."},
		{Name: models.PermDoctorCreate, Description: "Create doctors."},
		{Name: models.PermDoctorUpdate, Description: "Update doctors."},
		{Name: models.PermDoctorDelete, Description: "Delete doctors."},
		{Name: models.PermDepartmentView, Description: "View departments."},
		{Name: models.PermDepartmentCreate, Description: "Create departments."},
		{Name: models.PermDepartmentUpdate, Description: "Update departments."},
		{Name: models.PermDepartmentDelete, Description: "Delete departments."},
		{Name: models.PermUserView, Description: "View staff users."},
		{Name: models.PermUserCreate, Description: "Create staff users."},
		{Name: models.PermUserUpdate, Description: "Update staff users."},
		{Name: models.PermUserDelete, Description: "Delete staff users."},
		{Name: models.PermReportsView, Description: "View reports."},
		{Name: models.PermReportsExport, Description: "Export reports."},

		// Treatment (generic procedure engine).
		{Name: models.PermTreatmentView, Description: "View treatment plans and sessions."},
		{Name: models.PermTreatmentCreate, Description: "Create treatment plans."},
		{Name: models.PermTreatmentUpdate, Description: "Update treatment plans."},
		{Name: models.PermTreatmentApprove, Description: "Approve treatment plans."},
		{Name: models.PermTreatmentSession, Description: "Execute treatment sessions (therapist)."},
		{Name: models.PermTreatmentComplete, Description: "Complete treatment plans with final assessment."},

		// Investigation / Lab
		{Name: models.PermLabView, Description: "View lab tests, orders and results."},
		{Name: models.PermLabOrder, Description: "Order investigations for patients."},
		{Name: models.PermLabCollect, Description: "Record sample collection."},
		{Name: models.PermLabResult, Description: "Enter test results."},
		{Name: models.PermLabVerify, Description: "Verify lab results."},
		{Name: models.PermLabReview, Description: "Review lab results (clinical remarks)."},
		{Name: models.PermLabManage, Description: "Manage investigation test master and categories."},

		// Diet / Kitchen
		{Name: models.PermDietOrder, Description: "Prescribe diet plan for IPD patients."},
		{Name: models.PermDietManage, Description: "Manage diet master configurations."},
		{Name: models.PermDietServe, Description: "Mark meal orders prepared/served."},

		// IPD (wards, beds, admissions, clinical notes/orders).
		{Name: models.PermWardView, Description: "View wards and beds."},
		{Name: models.PermWardManage, Description: "Manage wards and beds."},
		{Name: models.PermAdmissionView, Description: "View IPD admissions."},
		{Name: models.PermAdmissionCreate, Description: "Admit IPD patients."},
		{Name: models.PermAdmissionUpdate, Description: "Update IPD admissions and transfer beds."},
		{Name: models.PermAdmissionDischarge, Description: "Discharge IPD patients."},
		{Name: models.PermNoteCreate, Description: "Add progress notes and admission orders."},
		{Name: models.PermDietCreate, Description: "Add diet orders for IPD admissions."},
	}

	permByName := make(map[string]*models.Permission, len(permissions))
	for i := range permissions {
		perm := permissions[i]
		var existing models.Permission
		err := db.Where("name = ?", perm.Name).First(&existing).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				if err := db.Create(&perm).Error; err != nil {
					return fmt.Errorf("database: failed to seed permission %s: %w", perm.Name, err)
				}
				existing = perm
			} else {
				return fmt.Errorf("database: failed to query permission %s: %w", perm.Name, err)
			}
		} else {
			if existing.Description != perm.Description {
				existing.Description = perm.Description
				if err := db.Save(&existing).Error; err != nil {
					return fmt.Errorf("database: failed to update permission %s: %w", perm.Name, err)
				}
			}
		}
		permByName[perm.Name] = &existing
	}

	// Granular permission base group reused across clinical staff roles.
	viewClinical := []string{models.PermClinicalView, models.PermEncounterView, models.PermConsultationView}

	// Treatment plan/session permissions per role (Panchakarma engine).
	// Doctor & Panchakarma doctor own the plan lifecycle; therapists execute
	// sessions; front desk / clinical staff get read-only access.
	treatmentCreate := []string{
		models.PermTreatmentCreate, models.PermTreatmentUpdate,
		models.PermTreatmentApprove, models.PermTreatmentComplete,
		models.PermTreatmentSession, // Allow admins/doctors to see and execute sessions
	}
	treatmentView := []string{models.PermTreatmentView}

	// Map role name -> permission names assigned to that role.
	rolePerms := map[string][]string{
		models.RoleSuperAdmin: append([]string{
			models.PermPatientView, models.PermPatientCreate, models.PermPatientEdit,
			models.PermPatientUpdate, models.PermPatientDelete, models.PermPatientExport,
			models.PermAppointmentView, models.PermAppointmentCreate, models.PermAppointmentUpdate,
			models.PermAppointmentCancel, models.PermAppointmentCheckin,
			models.PermEncounterCreate, models.PermEncounterUpdate, models.PermEncounterClose,
			models.PermConsultationCreate, models.PermConsultationUpdate, models.PermConsultationPrint,
			models.PermPrescriptionView, models.PermPrescriptionCreate, models.PermPrescriptionUpdate, models.PermPrescriptionPrint,
			models.PermReferralView, models.PermReferralCreate, models.PermReferralUpdate, models.PermReferralAccept, models.PermReferralClose,
			models.PermPharmacyView, models.PermPharmacyDispense, models.PermPharmacyStock, models.PermPharmacyPurchase,
			models.PermInventoryManage,
			models.PermBillingView, models.PermBillingCreate, models.PermBillingPayment, models.PermBillingRefund,
			models.PermBillPrint, models.PermReceiptPrint,
			models.PermDoctorView, models.PermDoctorCreate, models.PermDoctorUpdate, models.PermDoctorDelete,
			models.PermDepartmentView, models.PermDepartmentCreate, models.PermDepartmentUpdate, models.PermDepartmentDelete,
			models.PermUserView, models.PermUserCreate, models.PermUserUpdate, models.PermUserDelete,
			models.PermRoleManage, models.PermConfigManage,
			models.PermAuditView, models.PermDashboardView, models.PermReportsView, models.PermReportsExport,
			models.PermLabView, models.PermLabOrder, models.PermLabCollect, models.PermLabResult,
			models.PermLabVerify, models.PermLabReview, models.PermLabManage,
			models.PermDietOrder, models.PermDietManage, models.PermDietServe,
			models.PermWardView, models.PermWardManage,
			models.PermAdmissionView, models.PermAdmissionCreate, models.PermAdmissionUpdate, models.PermAdmissionDischarge,
			models.PermNoteCreate, models.PermDietCreate,
		}, append(viewClinical, append(treatmentCreate, treatmentView...)...)...),
		models.RoleHospitalAdmin: append([]string{
			models.PermPatientView, models.PermPatientCreate, models.PermPatientEdit,
			models.PermPatientUpdate, models.PermPatientDelete, models.PermPatientExport,
			models.PermAppointmentView, models.PermAppointmentCreate, models.PermAppointmentUpdate,
			models.PermAppointmentCancel, models.PermAppointmentCheckin,
			models.PermEncounterCreate, models.PermEncounterUpdate, models.PermEncounterClose,
			models.PermConsultationCreate, models.PermConsultationUpdate, models.PermConsultationPrint,
			models.PermPrescriptionView, models.PermPrescriptionCreate, models.PermPrescriptionUpdate, models.PermPrescriptionPrint,
			models.PermReferralView, models.PermReferralCreate, models.PermReferralUpdate, models.PermReferralAccept, models.PermReferralClose,
			models.PermPharmacyView, models.PermPharmacyDispense, models.PermPharmacyStock, models.PermPharmacyPurchase,
			models.PermInventoryManage,
			models.PermBillingView, models.PermBillingCreate, models.PermBillingPayment, models.PermBillingRefund,
			models.PermBillPrint, models.PermReceiptPrint,
			models.PermDoctorView, models.PermDoctorCreate, models.PermDoctorUpdate,
			models.PermDepartmentView, models.PermDepartmentCreate, models.PermDepartmentUpdate,
			models.PermUserView, models.PermUserCreate, models.PermUserUpdate,
			models.PermAuditView, models.PermDashboardView, models.PermReportsView, models.PermReportsExport,
			models.PermLabView, models.PermLabOrder, models.PermLabCollect, models.PermLabResult,
			models.PermLabVerify, models.PermLabReview, models.PermLabManage,
			models.PermDietOrder, models.PermDietManage, models.PermDietServe,
			models.PermWardView, models.PermWardManage,
			models.PermAdmissionView, models.PermAdmissionCreate, models.PermAdmissionUpdate, models.PermAdmissionDischarge,
			models.PermNoteCreate, models.PermDietCreate,
		}, append(viewClinical, append(treatmentCreate, treatmentView...)...)...),
		models.RoleReceptionist: append([]string{
			models.PermPatientView, models.PermPatientCreate, models.PermPatientUpdate,
			models.PermAppointmentView, models.PermAppointmentCreate, models.PermAppointmentUpdate,
			models.PermAppointmentCancel, models.PermAppointmentCheckin,
			models.PermEncounterView, models.PermEncounterCreate, models.PermEncounterUpdate, models.PermEncounterClose,
			models.PermPrescriptionView,
			models.PermDoctorView,
			models.PermDepartmentView,
			models.PermBillingView, models.PermDashboardView,
		}, append(viewClinical, models.PermTreatmentView)...),
		models.RoleDoctor: append([]string{
			models.PermPatientView, models.PermPatientUpdate,
			models.PermAppointmentView,
			models.PermEncounterCreate, models.PermEncounterUpdate, models.PermEncounterClose,
			models.PermConsultationCreate, models.PermConsultationUpdate, models.PermConsultationPrint,
			models.PermPrescriptionCreate, models.PermPrescriptionView, models.PermPrescriptionUpdate, models.PermPrescriptionPrint,
			models.PermReferralCreate, models.PermReferralUpdate, models.PermReferralView, models.PermReferralAccept, models.PermReferralClose,
			models.PermDoctorView,
			models.PermPharmacyView,
			models.PermBillingView, models.PermDashboardView,
			models.PermLabView, models.PermLabOrder, models.PermLabReview,
			models.PermDietOrder,
			models.PermWardView, models.PermAdmissionView, models.PermAdmissionCreate, models.PermAdmissionUpdate,
			models.PermNoteCreate, models.PermDietCreate,
		}, append(viewClinical, append(treatmentCreate, treatmentView...)...)...),
		models.RolePanchakarmaDoctor: append([]string{
			models.PermPatientView, models.PermPatientUpdate,
			models.PermAppointmentView,
			models.PermEncounterCreate, models.PermEncounterUpdate, models.PermEncounterClose,
			models.PermConsultationCreate, models.PermConsultationUpdate, models.PermConsultationPrint,
			models.PermPrescriptionCreate, models.PermPrescriptionView, models.PermPrescriptionUpdate, models.PermPrescriptionPrint,
			models.PermReferralCreate, models.PermReferralUpdate, models.PermReferralView, models.PermReferralAccept, models.PermReferralClose,
			models.PermDoctorView,
			models.PermPharmacyView,
			models.PermBillingView, models.PermDashboardView,
			models.PermLabView, models.PermLabOrder, models.PermLabReview,
			models.PermDietOrder,
			models.PermWardView, models.PermAdmissionView, models.PermAdmissionCreate, models.PermAdmissionUpdate,
			models.PermNoteCreate, models.PermDietCreate,
		}, append(viewClinical, append(treatmentCreate, treatmentView...)...)...),
		models.RoleNurse: append([]string{
			models.PermPatientView,
			models.PermDashboardView, models.PermDoctorView,
			models.PermDietServe,
			models.PermWardView, models.PermAdmissionView, models.PermAdmissionUpdate,
			models.PermNoteCreate, models.PermDietCreate,
		}, append(viewClinical, treatmentView...)...),
		models.RoleTherapist: append([]string{
			models.PermPatientView,
			models.PermDashboardView, models.PermDoctorView,
			models.PermTreatmentView, models.PermTreatmentSession,
		}, viewClinical...),
		models.RolePharmacist: append([]string{
			models.PermPatientView,
			models.PermPrescriptionView, models.PermPrescriptionPrint,
			models.PermPharmacyView, models.PermPharmacyDispense, models.PermPharmacyStock,
			models.PermInventoryManage,
			models.PermDoctorView,
			models.PermBillingView, models.PermDashboardView,
		}, models.PermClinicalView, models.PermEncounterView),
		models.RoleBillingAccounts: {
			models.PermPatientView,
			models.PermBillingView, models.PermBillingCreate, models.PermBillingPayment,
			models.PermBillPrint, models.PermReceiptPrint,
			models.PermDashboardView,
		},
		models.RoleWardStaff: append([]string{
			models.PermPatientView, models.PermDoctorView, models.PermDashboardView,
		}, append(viewClinical, treatmentView...)...),
		models.RoleDietKitchen: append([]string{
			models.PermPatientView, models.PermDoctorView, models.PermDashboardView,
			models.PermDietServe, models.PermDietManage,
		}, append(viewClinical, treatmentView...)...),
		models.RoleLabStaff: append([]string{
			models.PermPatientView, models.PermDoctorView, models.PermDashboardView,
			models.PermLabView, models.PermLabCollect, models.PermLabResult, models.PermLabVerify,
		}, append(viewClinical, treatmentView...)...),
		models.RolePatient: {
			models.PermPatientView, models.PermPrescriptionView, models.PermBillingView, models.PermEncounterView,
		},
	}

	for roleName, permNames := range rolePerms {
		var role models.Role
		if err := db.Where("name = ?", roleName).First(&role).Error; err != nil {
			return fmt.Errorf("database: role %s not found during permission seeding: %w", roleName, err)
		}
		// Rebuild the role's permission set from the seed definition so that
		// removed/renamed permissions are revoked on restart (idempotent seed).
		if err := db.Model(&role).Association("Permissions").Replace(permByNameFilter(permNames, permByName)); err != nil {
			return fmt.Errorf("database: failed to rebuild permissions for role %s: %w", roleName, err)
		}
	}
	log.Println("database: permissions seeded")
	return nil
}

// permByNameFilter resolves a list of permission names to the persisted
// Permission rows, skipping any names that are not yet seeded.
func permByNameFilter(names []string, permByName map[string]*models.Permission) []*models.Permission {
	out := make([]*models.Permission, 0, len(names))
	for _, n := range names {
		if p := permByName[n]; p != nil {
			out = append(out, p)
		}
	}
	return out
}

// SeedSuperAdmin creates the first Super Admin account if no user with
// that email already exists. This is the one bootstrap step an operator
// needs so they can log in for the very first time; every other account
// is created afterwards through the (separately built) users module.
// It is idempotent and safe to run on every startup.
func SeedSuperAdmin(db *gorm.DB, fullName, email, mobile, password string) error {
	if email == "" || password == "" {
		log.Println("database: SEED_SUPER_ADMIN_EMAIL/PASSWORD not set, skipping super admin bootstrap")
		return nil
	}

	var existing models.User
	err := db.Where("email = ?", email).First(&existing).Error
	if err == nil {
		return nil // already seeded
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("database: failed checking for existing super admin: %w", err)
	}

	var superAdminRole models.Role
	if err := db.Where("name = ?", models.RoleSuperAdmin).First(&superAdminRole).Error; err != nil {
		return fmt.Errorf("database: super admin role not found, run SeedRoles first: %w", err)
	}

	hash, err := utils.HashPassword(password)
	if err != nil {
		return fmt.Errorf("database: failed to hash super admin password: %w", err)
	}

	admin := models.User{
		FullName:     fullName,
		Email:        email,
		Mobile:       mobile,
		PasswordHash: hash,
		IsActive:     true,
		RoleID:       superAdminRole.ID,
	}
	if err := db.Create(&admin).Error; err != nil {
		return fmt.Errorf("database: failed to create super admin: %w", err)
	}

	log.Printf("database: bootstrap super admin created (%s)", email)
	return nil
}

// departmentMaster is the canonical Department Master: Code, Name, Type,
// Description and Default Fee, with legacy name aliases so the sync can
// match pre-master rows (e.g. "Kaya chikitsa" -> KAYA / "Kayachikitsa").
type departmentMaster struct {
	Code        string
	Name        string
	Type        string
	Description string
	Fee         float64
	LegacyCodes []string // previous seed codes, migrated once to Code
	LegacyNames []string
}

var departmentMasterRows = []departmentMaster{
	{Code: "KAYA", Name: "Kayachikitsa", Type: models.DepartmentTypeOPD, Description: "Internal medicine and general disorders.", Fee: 500,
		LegacyNames: []string{"Kaya chikitsa", "General Ayurveda Consultation"}},
	{Code: "PANCH", Name: "Panchakarma", Type: models.DepartmentTypeProcedure, Description: "Detoxification and rejuvenation therapies.", Fee: 800, LegacyCodes: []string{"PANCHA"}},
	{Code: "SALYA", Name: "Shalya Tantra", Type: models.DepartmentTypeOPD, Description: "Ayurvedic surgical and para-surgical procedures.", Fee: 700, LegacyCodes: []string{"SHALYA"}},
	{Code: "SHALAKYA", Name: "Shalakya Tantra", Type: models.DepartmentTypeOPD, Description: "Specialised therapies for the eye, ear, nose and throat.", Fee: 600},
	{Code: "PRASUTI", Name: "Prasuti Tantra Evam Stri Roga", Type: models.DepartmentTypeOPD, Description: "Holistic women's health, obstetrics and gynaecology.", Fee: 700},
	{Code: "KAUMAR", Name: "Kaumarbhritya (Bal Roga)", Type: models.DepartmentTypeOPD, Description: "Child-focused Ayurveda from newborn care to adolescent wellness.", Fee: 500},
	{Code: "SWASTHA", Name: "Swasthavritta & Yoga", Type: models.DepartmentTypeWellness, Description: "Preventive medicine, seasonal regimen and yoga-based lifestyle care.", Fee: 400},
	{Code: "AGAD", Name: "Agad Tantra Evam Vidhi Vaidyaka", Type: models.DepartmentTypeClinical, Description: "Toxicology, poisons, venoms and medico-legal care.", Fee: 600},
	{Code: "RASA", Name: "Rasashastra & Bhaishajya Kalpana", Type: models.DepartmentTypePharmacy, Description: "Classical pharmacy, drug preparation and medicine dispensing.", Fee: 300},
	{Code: "CAS", Name: "Casualty", Type: models.DepartmentTypeEmergency, Description: "24x7 emergency and casualty services for acute conditions.", Fee: 1000},
}

func normalizeDeptName(s string) string {
	return strings.ToLower(strings.Join(strings.Fields(s), " "))
}

// SyncDepartmentMaster aligns the departments table with the canonical
// Department Master. It is idempotent and safe to run on every startup:
//   - a row already carrying the canonical master Code is left untouched, so
//     admin-edited name/type/description/fee/active flags survive restarts,
//   - legacy rows (matched by name/alias or a previous seed code such as
//     PANCHA/SHALYA) have their Code migrated to the SOW canonical code,
//   - missing master rows are created with the master defaults,
//   - the merged "General Ayurveda Consultation" doctors move to KAYA and
//     the obsolete row is deactivated, and
//   - any other non-master row (e.g. "Nadi Pariksha") is deactivated so the
//     public site only surfaces the curated departments.
func SyncDepartmentMaster(db *gorm.DB) error {
	var existing []models.Department
	if err := db.Find(&existing).Error; err != nil {
		return fmt.Errorf("database: failed to load departments: %w", err)
	}
	byName := make(map[string]*models.Department, len(existing))
	for i := range existing {
		byName[normalizeDeptName(existing[i].Name)] = &existing[i]
	}

	consumed := make(map[string]bool, len(existing))
	var kayID *models.Department

	for _, m := range departmentMasterRows {
		var target *models.Department
		for i := range existing {
			if existing[i].Code != "" && existing[i].Code == m.Code {
				target = &existing[i]
				break
			}
		}
		if target == nil {
			if d, ok := byName[normalizeDeptName(m.Name)]; ok {
				target = d
			}
		}
		if target == nil {
			for _, legacy := range m.LegacyNames {
				if d, ok := byName[normalizeDeptName(legacy)]; ok {
					target = d
					break
				}
			}
		}
		if target == nil {
			for _, legacy := range m.LegacyCodes {
				for i := range existing {
					if existing[i].Code == legacy {
						target = &existing[i]
						break
					}
				}
				if target != nil {
					break
				}
			}
		}
		if target == nil {
			target = &models.Department{
				BaseModel:   models.BaseModel{ID: uuid.New()},
				Code:        m.Code,
				Name:        m.Name,
				Type:        m.Type,
				Description: m.Description,
				DefaultFee:  m.Fee,
				IsActive:    true,
			}
			if err := db.Create(target).Error; err != nil {
				return fmt.Errorf("database: failed to create department %s (%s): %w", m.Code, m.Name, err)
			}
		} else if target.Code != m.Code {
			// Code migration only (e.g. PANCHA -> PANCH, SHALYA -> SALYA):
			// existing columns are never overwritten at startup.
			if err := db.Model(&models.Department{}).Where("id = ?", target.ID).Update("code", m.Code).Error; err != nil {
				return fmt.Errorf("database: failed to migrate department code to %s: %w", m.Code, err)
			}
		}
		consumed[target.ID.String()] = true
		if m.Code == "KAYA" {
			kayID = target
		}
	}

	// Merge: doctors assigned to "General Ayurveda Consultation" move to KAYA,
	// then the obsolete row is deactivated.
	if legacy, ok := byName[normalizeDeptName("General Ayurveda Consultation")]; ok && legacy.ID != kayID.ID {
		if err := db.Model(&models.Doctor{}).Where("department_id = ?", legacy.ID).Update("department_id", kayID.ID).Error; err != nil {
			return fmt.Errorf("database: failed to remap doctors to KAYA: %w", err)
		}
		if err := db.Model(&models.Department{}).Where("id = ? AND is_active = true", legacy.ID).Update("is_active", false).Error; err != nil {
			return fmt.Errorf("database: failed to deactivate General Ayurveda Consultation: %w", err)
		}
		consumed[legacy.ID.String()] = true
	}

	// Any remaining row that is not part of the master (e.g. "Nadi Pariksha")
	// is deactivated so it stops appearing on the public site. Only is_active
	// is touched — full saves would write an empty code and collide on the
	// unique index.
	for i := range existing {
		d := &existing[i]
		if !consumed[d.ID.String()] && d.IsActive {
			if err := db.Model(&models.Department{}).Where("id = ? AND is_active = true", d.ID).Update("is_active", false).Error; err != nil {
				return fmt.Errorf("database: failed to deactivate legacy department %s: %w", d.Name, err)
			}
		}
	}

	log.Println("database: department master synced")
	return nil
}

// SeedProcedureTypes inserts the baseline Panchakarma procedure types if the
// table is empty. The treatment engine is category-generic, so future
// categories (physiotherapy, yoga, ...) just add rows.
func SeedProcedureTypes(db *gorm.DB) error {
	var count int64
	if err := db.Model(&models.ProcedureType{}).Count(&count).Error; err != nil {
		return fmt.Errorf("database: failed to count procedure types: %w", err)
	}
	if count > 0 {
		return nil
	}

	types := []models.ProcedureType{
		{Name: "Abhyanga", Category: models.ProcedureCategoryPanchakarma, Description: "Full-body herbal oil massage.", IsActive: true},
		{Name: "Shirodhara", Category: models.ProcedureCategoryPanchakarma, Description: "Warm oil stream poured over the forehead.", IsActive: true},
		{Name: "Basti", Category: models.ProcedureCategoryPanchakarma, Description: "Medicated enema therapy.", IsActive: true},
		{Name: "Vamana", Category: models.ProcedureCategoryPanchakarma, Description: "Therapeutic emesis for kapha disorders.", IsActive: true},
		{Name: "Virechana", Category: models.ProcedureCategoryPanchakarma, Description: "Therapeutic purgation for pitta disorders.", IsActive: true},
		{Name: "Nasya", Category: models.ProcedureCategoryPanchakarma, Description: "Medicated nasal instillation.", IsActive: true},
		{Name: "Raktamokshana", Category: models.ProcedureCategoryPanchakarma, Description: "Blood-letting therapy.", IsActive: true},
		{Name: "Udvartana", Category: models.ProcedureCategoryPanchakarma, Description: "Herbal powder massage for kapha/pitta.", IsActive: true},
		{Name: "Swedana", Category: models.ProcedureCategoryPanchakarma, Description: "Herbal steam / fomentation therapy.", IsActive: true},
		{Name: "Pizhichil", Category: models.ProcedureCategoryPanchakarma, Description: "Warm oil massage over the whole body.", IsActive: true},
	}

	if err := db.Create(&types).Error; err != nil {
		return fmt.Errorf("database: failed to seed procedure types: %w", err)
	}
	log.Println("database: procedure types seeded")
	return nil
}

// seedWardRows is the baseline ward master. DepartmentCode resolves the
// ward's default department from the department master (nil-safe).
type seedWardRows struct {
	Code           string
	Name           string
	Location       string
	DepartmentCode string
	Beds           []string
}

var defaultWards = []seedWardRows{
	{Code: "GENMED", Name: "General Medicine Ward", Location: "Block A · Floor 1", DepartmentCode: "KAYA", Beds: []string{"G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8"}},
	{Code: "PANCHIPD", Name: "Panchakarma IPD", Location: "Block A · Floor 2", DepartmentCode: "PANCH", Beds: []string{"P1", "P2", "P3", "P4", "P5", "P6"}},
	{Code: "PRIV", Name: "Private Rooms", Location: "Block B · Floor 1", DepartmentCode: "KAYA", Beds: []string{"PR1", "PR2", "PR3", "PR4"}},
	{Code: "ICU", Name: "ICU / Critical Care", Location: "Block B · Floor 2", DepartmentCode: "CAS", Beds: []string{"ICU1", "ICU2", "ICU3", "ICU4"}},
}

// SeedWards creates the baseline ward/bed layout if no wards exist yet.
func SeedWards(db *gorm.DB) error {
	var count int64
	if err := db.Model(&models.Ward{}).Count(&count).Error; err != nil {
		return fmt.Errorf("database: failed to count wards: %w", err)
	}
	if count > 0 {
		return nil
	}

	deptByCode := make(map[string]uuid.UUID)
	var depts []models.Department
	if err := db.Select("id", "code").Find(&depts).Error; err != nil {
		return fmt.Errorf("database: failed to load departments for ward seed: %w", err)
	}
	for _, d := range depts {
		deptByCode[d.Code] = d.ID
	}

	for _, w := range defaultWards {
		ward := models.Ward{
			BaseModel: models.BaseModel{ID: uuid.New()},
			Code:      w.Code,
			Name:      w.Name,
			Location:  w.Location,
			IsActive:  true,
		}
		if did, ok := deptByCode[w.DepartmentCode]; ok {
			ward.DepartmentID = &did
		}
		if err := db.Create(&ward).Error; err != nil {
			return fmt.Errorf("database: failed to seed ward %s: %w", w.Code, err)
		}
		for _, bn := range w.Beds {
			bedType := models.BedTypeGeneral
			if w.Code == "PRIV" {
				bedType = models.BedTypePrivate
			}
			if w.Code == "ICU" {
				bedType = models.BedTypeICU
			}
			if err := db.Create(&models.Bed{
				BaseModel: models.BaseModel{ID: uuid.New()},
				WardID:    ward.ID,
				BedNo:     bn,
				BedType:   bedType,
				Status:    models.BedAvailable,
				IsActive:  true,
			}).Error; err != nil {
				return fmt.Errorf("database: failed to seed bed %s/%s: %w", w.Code, bn, err)
			}
		}
	}
	log.Println("database: wards & beds seeded")
	return nil
}

// SeedLabTests inserts baseline investigation categories and tests if empty.
func SeedLabTests(db *gorm.DB) error {
	var count int64
	if err := db.Model(&models.InvestigationCategory{}).Count(&count).Error; err != nil {
		return fmt.Errorf("database: failed to count lab categories: %w", err)
	}
	if count > 0 {
		return nil
	}

	categories := []models.InvestigationCategory{
		{
			BaseModel:   models.BaseModel{ID: uuid.New()},
			Name:        "Haematology",
			Code:        "HAEM",
			Description: "Blood count, coagulation and grouping studies",
			IsActive:    true,
		},
		{
			BaseModel:   models.BaseModel{ID: uuid.New()},
			Name:        "Biochemistry",
			Code:        "BIOC",
			Description: "Liver, kidney, lipid profiles and metabolic studies",
			IsActive:    true,
		},
		{
			BaseModel:   models.BaseModel{ID: uuid.New()},
			Name:        "Urine Analysis",
			Code:        "URIN",
			Description: "Urine chemical, physical and microscopic examinations",
			IsActive:    true,
		},
	}

	for i := range categories {
		if err := db.Create(&categories[i]).Error; err != nil {
			return fmt.Errorf("database: failed to seed category %s: %w", categories[i].Name, err)
		}
	}

	tests := []models.InvestigationTest{
		{
			BaseModel:            models.BaseModel{ID: uuid.New()},
			CategoryID:           categories[0].ID,
			Name:                 "Complete Blood Count (CBC)",
			Code:                 "CBC",
			SampleType:           "Whole Blood (EDTA)",
			Method:               "Automated Cell Counter",
			Unit:                 "g/dL",
			ReferenceRangeMale:   "13.5 - 17.5",
			ReferenceRangeFemale: "12.0 - 15.5",
			ReferenceRangeChild:  "11.0 - 14.5",
			TurnaroundHours:      12,
			Cost:                 350,
			IsActive:             true,
		},
		{
			BaseModel:            models.BaseModel{ID: uuid.New()},
			CategoryID:           categories[0].ID,
			Name:                 "Blood Grouping & Rh Typing",
			Code:                 "BGRP",
			SampleType:           "Whole Blood",
			Method:               "Slide Agglutination",
			Unit:                 "N/A",
			ReferenceRangeMale:   "Standard ABO/Rh",
			ReferenceRangeFemale: "Standard ABO/Rh",
			ReferenceRangeChild:  "Standard ABO/Rh",
			TurnaroundHours:      2,
			Cost:                 150,
			IsActive:             true,
		},
		{
			BaseModel:            models.BaseModel{ID: uuid.New()},
			CategoryID:           categories[1].ID,
			Name:                 "Liver Function Test (LFT)",
			Code:                 "LFT",
			SampleType:           "Serum",
			Method:               "Spectrophotometry",
			Unit:                 "mg/dL",
			ReferenceRangeMale:   "Bilirubin: 0.2 - 1.2, SGOT: <40, SGPT: <45",
			ReferenceRangeFemale: "Bilirubin: 0.2 - 1.2, SGOT: <35, SGPT: <35",
			ReferenceRangeChild:  "Bilirubin: 0.2 - 1.0, SGOT: <50, SGPT: <45",
			TurnaroundHours:      24,
			Cost:                 650,
			IsActive:             true,
		},
		{
			BaseModel:            models.BaseModel{ID: uuid.New()},
			CategoryID:           categories[1].ID,
			Name:                 "Kidney Function Test (KFT)",
			Code:                 "KFT",
			SampleType:           "Serum",
			Method:               "Enzymatic / Colorimetric",
			Unit:                 "mg/dL",
			ReferenceRangeMale:   "Urea: 15-45, Creatinine: 0.6-1.2",
			ReferenceRangeFemale: "Urea: 15-40, Creatinine: 0.5-1.1",
			ReferenceRangeChild:  "Urea: 10-35, Creatinine: 0.3-0.7",
			TurnaroundHours:      24,
			Cost:                 550,
			IsActive:             true,
		},
		{
			BaseModel:            models.BaseModel{ID: uuid.New()},
			CategoryID:           categories[2].ID,
			Name:                 "Urine Routine & Microscopic",
			Code:                 "URM",
			SampleType:           "Mid-stream Urine",
			Method:               "Chemical Test Strip & Microscopy",
			Unit:                 "N/A",
			ReferenceRangeMale:   "Normal physical & microscopic findings",
			ReferenceRangeFemale: "Normal physical & microscopic findings",
			ReferenceRangeChild:  "Normal physical & microscopic findings",
			TurnaroundHours:      4,
			Cost:                 120,
			IsActive:             true,
		},
	}

	for i := range tests {
		if err := db.Create(&tests[i]).Error; err != nil {
			return fmt.Errorf("database: failed to seed test %s: %w", tests[i].Name, err)
		}
	}

	log.Println("database: lab investigation categories and tests seeded")
	return nil
}

// dietTemplateRows is the baseline Ayurvedic diet template master. Templates
// are read-only presets — administrators can add/edit them via the API, and
// existing rows are never overwritten at startup (FirstOrCreate by name).
type dietTemplateRow struct {
	Name                string
	Pathya              string
	Apathya             string
	SpecialInstructions string
}

var dietTemplateRows = []dietTemplateRow{
	{
		Name:                "Laghu Ahar",
		Pathya:              "Warm moong dal khichdi, steamed vegetables, rice gruel, warm water",
		Apathya:             "Cold food, fried & oily items, heavy grains, raw salads",
		SpecialInstructions: "Serve warm; small frequent portions.",
	},
	{
		Name:                "Peyadi",
		Pathya:              "Rice peya (thin gruel), mung peya, diluted buttermilk with cumin",
		Apathya:             "Solids, heavy preparations, legumes other than moong",
		SpecialInstructions: "Liquid consistency; do not thicken.",
	},
	{
		Name:                "Yushadi",
		Pathya:              "Moong dal soup, vegetable soups, shatavari ksheera if tolerated",
		Apathya:             "Fried items, spicy curries, heavy breads",
		SpecialInstructions: "Soups only; no solid mains.",
	},
	{
		Name:                "Sarvanga Ahar (Panchakarma)",
		Pathya:              "Warm sattvic meals, khichdi, boiled vegetables, ghee in moderation",
		Apathya:             "Cold, stale, spicy, sour & fermented foods; non-vegetarian items",
		SpecialInstructions: "Ideal during Panchakarma therapies; keep meals warm and light.",
	},
	{
		Name:                "Santarpana Ahar",
		Pathya:              "Milk, ghee, sweet preparations, rice with jaggery, nourishing kheer",
		Apathya:             "Rough, dry, bitter and astringent foods; fasting",
		SpecialInstructions: "Nourishing regimen; monitor weight and digestion.",
	},
	{
		Name:                "Apatarpana Ahar",
		Pathya:              "Light soups, rice water, boiled leafy greens in small quantity",
		Apathya:             "Rich, heavy, sweet and oily preparations",
		SpecialInstructions: "Reduction diet; small frequent light meals.",
	},
	{
		Name:                "Vata-Pacifying Diet",
		Pathya:              "Warm oily foods, cooked grains, root vegetables, ghee, buttermilk",
		Apathya:             "Cold & dry foods, raw vegetables, excessive bitter/astringent items",
		SpecialInstructions: "Serve warm; include ghee/oil in moderation.",
	},
	{
		Name:                "Pitta-Pacifying Diet",
		Pathya:              "Cooling foods, sweet fruits, ghee, milk, cucumber, leafy greens",
		Apathya:             "Spicy, sour, salty, fried and fermented items",
		SpecialInstructions: "Avoid hot spices; keep meals bland and cooling.",
	},
	{
		Name:                "Kapha-Pacifying Diet",
		Pathya:              "Warm light food, barley, honey in moderation, bitter greens, dry cooking",
		Apathya:             "Heavy, sweet, oily, cold and dairy-heavy items",
		SpecialInstructions: "Minimal oil; prefer dry heat preparations.",
	},
	{
		Name:                "Hridaya & Vrana Diet",
		Pathya:              "Light digestible foods, soft khichdi, saindhava salt, warm water",
		Apathya:             "Heavy, hard, stale, spicy and salty foods; cold items",
		SpecialInstructions: "Soft consistency; easy to digest.",
	},
}

// SeedDietTemplates inserts the baseline Ayurvedic diet templates if the
// table is empty. Each template is attributed to the bootstrap super admin
// (or the first active admin user) so the created_by_user_id FK is valid.
// It is idempotent and safe to run on every startup.
func SeedDietTemplates(db *gorm.DB) error {
	var count int64
	if err := db.Model(&models.DietTemplate{}).Count(&count).Error; err != nil {
		return fmt.Errorf("database: failed to count diet templates: %w", err)
	}
	if count > 0 {
		return nil
	}

	// Resolve an attributing user: bootstrap super admin → any super
	// admin/hospital admin → any active user. Skip seeding if none exists.
	var seedUserID *uuid.UUID
	var byEmail models.User
	if err := db.Where("email = ?", os.Getenv("SEED_SUPER_ADMIN_EMAIL")).First(&byEmail).Error; err == nil {
		seedUserID = &byEmail.ID
	}
	if seedUserID == nil {
		var admin models.User
		err := db.Joins("JOIN roles ON roles.id = users.role_id").
			Where("users.is_active = ? AND roles.name IN ?", true, []string{models.RoleSuperAdmin, models.RoleHospitalAdmin}).
			First(&admin).Error
		if err == nil {
			seedUserID = &admin.ID
		}
	}
	if seedUserID == nil {
		var anyUser models.User
		if err := db.Where("is_active = ?", true).First(&anyUser).Error; err == nil {
			seedUserID = &anyUser.ID
		}
	}
	if seedUserID == nil {
		log.Println("database: no user found to attribute diet templates; skipping seed")
		return nil
	}

	for _, t := range dietTemplateRows {
		template := models.DietTemplate{
			BaseModel:           models.BaseModel{ID: uuid.New()},
			Name:                t.Name,
			Pathya:              t.Pathya,
			Apathya:             t.Apathya,
			SpecialInstructions: t.SpecialInstructions,
			IsActive:            true,
			CreatedByUserID:     *seedUserID,
		}
		var existing models.DietTemplate
		err := db.Where("name = ?", t.Name).First(&existing).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				if err := db.Create(&template).Error; err != nil {
					return fmt.Errorf("database: failed to seed diet template %s: %w", t.Name, err)
				}
			} else {
				return fmt.Errorf("database: failed to query diet template %s: %w", t.Name, err)
			}
		}
	}
	log.Println("database: diet templates seeded")
	return nil
}

