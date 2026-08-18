// Command api is the AHMS backend entrypoint.
//
// @title           AHMS Backend API
// @version         1.0
// @description     Ayurvedic Hospital Management System — Phase 1 API (Auth, Roles, Departments, Patients, Doctors, Appointments, Dashboard).
// @host            localhost:8080
// @BasePath        /api/v1
// @securityDefinitions.apikey  BearerAuth
// @in                          header
// @name                        Authorization
// @description                 Type "Bearer" followed by a space and the JWT access token.
package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/ahms/backend/internal/appointments"
	"github.com/ahms/backend/internal/audit"
	"github.com/ahms/backend/internal/auth"
	"github.com/ahms/backend/internal/billing"
	"github.com/ahms/backend/internal/config"
	"github.com/ahms/backend/internal/consultations"
	"github.com/ahms/backend/internal/dashboard"
	"github.com/ahms/backend/internal/database"
	"github.com/ahms/backend/internal/departments"
	"github.com/ahms/backend/internal/diet"
	"github.com/ahms/backend/internal/doctors"
	"github.com/ahms/backend/internal/encounters"
	"github.com/ahms/backend/internal/ipd"
	"github.com/ahms/backend/internal/lab"
	"github.com/ahms/backend/internal/middleware"
	"github.com/ahms/backend/internal/models"
	"github.com/ahms/backend/internal/patientdocs"
	"github.com/ahms/backend/internal/patients"
	"github.com/ahms/backend/internal/pharmacy"
	"github.com/ahms/backend/internal/portal"
	"github.com/ahms/backend/internal/prescriptions"
	"github.com/ahms/backend/internal/public"
	"github.com/ahms/backend/internal/referrals"
	"github.com/ahms/backend/internal/reports"
	"github.com/ahms/backend/internal/roles"
	"github.com/ahms/backend/internal/timeline"
	"github.com/ahms/backend/internal/treatments"
	"github.com/ahms/backend/internal/uploads"
	"github.com/ahms/backend/internal/users"
	"github.com/ahms/backend/internal/utils"
	"github.com/ahms/backend/internal/websocket"
	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"

	_ "github.com/ahms/backend/docs" // generated Swagger docs (swag init)
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config error: %v", err)
	}

	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("database connection error: %v", err)
	}

	if err := database.Migrate(db); err != nil {
		log.Fatalf("migration error: %v", err)
	}
	if err := database.SeedRoles(db); err != nil {
		log.Fatalf("role seeding error: %v", err)
	}
	if err := database.SeedPermissions(db); err != nil {
		log.Fatalf("permission seeding error: %v", err)
	}
	if err := database.SeedSuperAdmin(
		db,
		"System Super Admin",
		os.Getenv("SEED_SUPER_ADMIN_EMAIL"),
		os.Getenv("SEED_SUPER_ADMIN_MOBILE"),
		os.Getenv("SEED_SUPER_ADMIN_PASSWORD"),
	); err != nil {
		log.Fatalf("super admin seeding error: %v", err)
	}
	if err := database.SyncDepartmentMaster(db); err != nil {
		log.Fatalf("department master sync error: %v", err)
	}
	if err := database.SeedProcedureTypes(db); err != nil {
		log.Fatalf("procedure type seeding error: %v", err)
	}
	if err := database.SeedWards(db); err != nil {
		log.Fatalf("ward/bed seeding error: %v", err)
	}
	if err := database.SeedLabTests(db); err != nil {
		log.Fatalf("lab tests seeding error: %v", err)
	}
	if err := database.SeedDietTemplates(db); err != nil {
		log.Fatalf("diet templates seeding error: %v", err)
	}

	if cfg.IsProduction() {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery())

	// Trust reverse proxies (Caddy/nginx in the production topology) so that
	// c.ClientIP() resolves the real client IP — required for per-user rate
	// limiting and correct audit IPs. Defaults to loopback only; production
	// should set TRUSTED_PROXIES to the internal proxy CIDRs.
	if tp := os.Getenv("TRUSTED_PROXIES"); tp != "" {
		var proxies []string
		for _, p := range strings.Split(tp, ",") {
			if trimmed := strings.TrimSpace(p); trimmed != "" {
				proxies = append(proxies, trimmed)
			}
		}
		if len(proxies) > 0 {
			if err := router.SetTrustedProxies(proxies); err != nil {
				log.Printf("config: invalid TRUSTED_PROXIES ignored: %v", err)
			}
		}
	} else {
		_ = router.SetTrustedProxies([]string{"127.0.0.1", "::1"})
	}
	router.Use(middleware.CORS(cfg.AllowedOrigins))
	router.Use(middleware.SecurityHeaders(cfg))
	router.Use(middleware.BodySizeLimit(10 << 20)) // 10MB

	blacklist := middleware.NewTokenBlacklist(true)

	loginLimiter := middleware.NewRateLimiter(10, 1*time.Minute)
	portalLoginLimiter := middleware.NewRateLimiter(10, 1*time.Minute)

	router.GET("/health", func(c *gin.Context) {
		utils.Success(c, http.StatusOK, "AHMS backend is healthy", gin.H{"status": "up"})
	})

	router.Use(middleware.SwaggerProtection(cfg))
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// Uploaded files (patient photos, documents, referral attachments) are
	// NEVER served via a public static route. They are streamed only through
	// authenticated, ownership-checked API handlers (see patientdocs,
	// referrals and patients photo endpoints) so no PHI is reachable
	// without a valid session.
	// NOTE: Doctor photos are NOT private patient files, so we serve them publicly.
	uploadDir := uploads.TrimOrDefault(cfg.UploadDir)
	router.Static("/uploads/doctors", filepath.Join(uploadDir, "doctors"))

	jwtManager := utils.NewJWTManager(cfg.JWTSecret, cfg.JWTAccessTokenTTL, cfg.JWTRefreshTokenTTL)
	authMiddleware := middleware.NewAuthMiddleware(jwtManager, blacklist)
	permissionMiddleware := middleware.NewPermissionMiddleware(db)
	dataScopeMiddleware := middleware.DataScopeMiddleware(db)

	wsHub := websocket.NewHub()
	go wsHub.Run()

	router.GET("/ws", func(c *gin.Context) {
		// Token travels in the Sec-WebSocket-Protocol subprotocol header, not
		// the URL, so it never appears in access logs.
		tokenStr := websocket.TokenFromRequest(c.Request)
		if tokenStr == "" {
			c.JSON(401, gin.H{"error": "missing token"})
			return
		}
		claims, err := jwtManager.Parse(tokenStr)
		if err != nil || claims.TokenType != "access" || blacklist.IsBlacklisted(tokenStr) {
			c.JSON(401, gin.H{"error": "invalid token"})
			return
		}
		if claims.RoleName == "PATIENT" {
			c.JSON(403, gin.H{"error": "patients not allowed on system websocket"})
			return
		}
		// Only front-desk / admin roles need live appointment notifications.
		// Doctors, pharmacists and other clinical roles get no realtime stream.
		if claims.RoleName != models.RoleSuperAdmin &&
			claims.RoleName != models.RoleHospitalAdmin &&
			claims.RoleName != models.RoleReceptionist {
			c.JSON(403, gin.H{"error": "your role is not allowed on the live notification stream"})
			return
		}
		websocket.ServeWs(wsHub, c.Writer, c.Request)
	})

	apiV1 := router.Group("/api/v1")
	{
		auditService := audit.NewService(db)
		auditRecorder := audit.NewRecorder(auditService)

		authRepo := auth.NewRepository(db)
		authService := auth.NewService(authRepo, jwtManager, blacklist)
		authHandler := auth.NewHandler(authService)
		authHandler.SetAuditRecorder(auditRecorder)
		auth.RegisterRoutesWithLimiter(apiV1, authHandler, authMiddleware, loginLimiter)

		// ---- Staff-facing API -------------------------------------------------
		// Everything under staffGroup is off-limits to patient-role tokens.
		// Patients have their own scoped surface at /api/v1/portal/* and the
		// /auth identity endpoints. RequireStaff runs before any permission
		// middleware, so a patient token is rejected even on routes whose
		// permission would otherwise match (e.g. patient.view).
		staffGroup := apiV1.Group("", middleware.RequireStaff())
		{

			deptRepo := departments.NewRepository(db)
			deptService := departments.NewService(deptRepo)
			deptHandler := departments.NewHandler(deptService)
			departments.RegisterRoutes(staffGroup, deptHandler, authMiddleware, permissionMiddleware)

			doctorRepo := doctors.NewRepository(db)
			doctorService := doctors.NewService(doctorRepo)
			doctorHandler := doctors.NewHandler(doctorService)
			doctors.RegisterRoutes(staffGroup, doctorHandler, authMiddleware, permissionMiddleware)

			patientRepo := patients.NewRepository(db)
			patientService := patients.NewService(patientRepo)
			patientHandler := patients.NewHandler(patientService)
			patientHandler.SetAuditRecorder(auditRecorder)
			patientHandler.SetUploadDir(uploadDir)
			patients.RegisterRoutes(staffGroup, patientHandler, authMiddleware, permissionMiddleware, dataScopeMiddleware)

			docRepo := patientdocs.NewRepository(db)
			docService := patientdocs.NewService(docRepo)
			docHandler := patientdocs.NewHandler(docService)
			docHandler.SetAuditRecorder(auditRecorder)
			docHandler.SetUploadDir(uploadDir)
			patientdocs.RegisterRoutes(staffGroup, docHandler, authMiddleware, permissionMiddleware, dataScopeMiddleware)

			apptRepo := appointments.NewRepository(db, patientRepo)
			apptService := appointments.NewService(apptRepo)
			apptHandler := appointments.NewHandler(apptService)
			apptHandler.SetAuditRecorder(auditRecorder)
			apptHandler.SetWebSocketHub(wsHub)
			appointments.RegisterRoutes(staffGroup, apptHandler, authMiddleware, permissionMiddleware, dataScopeMiddleware)

			publicGroup := apiV1.Group("/public")
			{
				publicGroup.POST("/appointments", apptHandler.PublicCreate)
				publicGroup.GET("/slots", apptHandler.Slots)
			}

			dashboardRepo := dashboard.NewRepository(db)
			dashboardService := dashboard.NewService(dashboardRepo)
			dashboardHandler := dashboard.NewHandler(dashboardService)
			dashboard.RegisterRoutes(staffGroup, dashboardHandler, authMiddleware, permissionMiddleware, dataScopeMiddleware)

			encounterRepo := encounters.NewRepository(db)
			encounterService := encounters.NewService(encounterRepo)
			encounterHandler := encounters.NewHandler(encounterService)
			encounterHandler.SetAuditRecorder(auditRecorder)
			encounterHandler.SetWebSocketHub(wsHub)
			encounters.RegisterRoutes(staffGroup, encounterHandler, authMiddleware, permissionMiddleware, dataScopeMiddleware)

			consultationRepo := consultations.NewRepository(db)
			consultationService := consultations.NewService(consultationRepo)
			consultationHandler := consultations.NewHandler(consultationService)
			consultationHandler.SetAuditRecorder(auditRecorder)
			consultations.RegisterRoutes(staffGroup, consultationHandler, authMiddleware, permissionMiddleware, dataScopeMiddleware)

			prescriptionRepo := prescriptions.NewRepository(db)
			prescriptionService := prescriptions.NewService(prescriptionRepo)
			prescriptionHandler := prescriptions.NewHandler(prescriptionService)
			prescriptionHandler.SetAuditRecorder(auditRecorder)
			prescriptions.RegisterRoutes(staffGroup, prescriptionHandler, authMiddleware, permissionMiddleware, dataScopeMiddleware)

			timelineRepo := timeline.NewRepository(db)
			timelineService := timeline.NewService(timelineRepo)
			timelineHandler := timeline.NewHandler(timelineService)
			timeline.RegisterRoutes(staffGroup, timelineHandler, authMiddleware, permissionMiddleware, dataScopeMiddleware)

			referralRepo := referrals.NewRepository(db)
			referralService := referrals.NewService(referralRepo)
			referralHandler := referrals.NewHandler(referralService)
			referralHandler.SetAuditRecorder(auditRecorder)
			referralHandler.SetUploadDir(uploadDir)
			referrals.RegisterRoutes(staffGroup, referralHandler, authMiddleware, permissionMiddleware, dataScopeMiddleware)

			treatmentRepo := treatments.NewRepository(db)
			treatmentService := treatments.NewService(treatmentRepo)
			treatmentHandler := treatments.NewHandler(treatmentService)
			treatmentHandler.SetAuditRecorder(auditRecorder)
			treatments.RegisterRoutes(staffGroup, treatmentHandler, authMiddleware, permissionMiddleware)

			publicHandler := public.NewHandler(deptService, doctorService, treatmentService)
			public.RegisterRoutes(apiV1.Group("/public"), publicHandler)

			pharmacyRepo := pharmacy.NewRepository(db)
			pharmacyService := pharmacy.NewService(pharmacyRepo)
			pharmacyHandler := pharmacy.NewHandler(pharmacyService)
			pharmacyHandler.SetAuditRecorder(auditRecorder)
			pharmacy.RegisterRoutes(staffGroup, pharmacyHandler, authMiddleware, permissionMiddleware, dataScopeMiddleware)

			billingRepo := billing.NewRepository(db)
			billingService := billing.NewService(billingRepo)
			billingHandler := billing.NewHandler(billingService)
			billingHandler.SetAuditRecorder(auditRecorder)
			billing.RegisterRoutes(staffGroup, billingHandler, authMiddleware, permissionMiddleware, dataScopeMiddleware)

			auditHandler := audit.NewHandler(auditService)
			audit.RegisterRoutes(staffGroup, auditHandler, authMiddleware, permissionMiddleware)

			userRepo := users.NewRepository(db)
			userService := users.NewService(userRepo)
			userHandler := users.NewHandler(userService)
			users.RegisterRoutes(staffGroup, userHandler, authMiddleware, permissionMiddleware)

			roleRepo := roles.NewRepository(db)
			roleService := roles.NewService(roleRepo)
			roleHandler := roles.NewHandler(roleService)
			roles.RegisterRoutes(staffGroup, roleHandler, authMiddleware, permissionMiddleware)

			portalRepo := portal.NewRepository(db)
			portalService := portal.NewService(portalRepo, jwtManager)
			portalHandler := portal.NewHandler(portalService)
			portal.RegisterRoutesWithLimiter(apiV1, portalHandler, authMiddleware, portalLoginLimiter)

			ipdRepo := ipd.NewRepository(db)
			ipdService := ipd.NewService(ipdRepo)
			ipdHandler := ipd.NewHandler(ipdService)
			ipdHandler.SetAuditRecorder(auditRecorder)
			ipd.RegisterRoutes(staffGroup, ipdHandler, authMiddleware, permissionMiddleware, dataScopeMiddleware)

			reportsRepo := reports.NewRepository(db)
			reportsService := reports.NewService(reportsRepo)
			reportsHandler := reports.NewHandler(reportsService)
			reports.RegisterRoutes(staffGroup, reportsHandler, authMiddleware, permissionMiddleware)

			labRepo := lab.NewRepository(db)
			labService := lab.NewService(labRepo)
			labHandler := lab.NewHandler(labService)
			lab.RegisterRoutes(staffGroup, labHandler, authMiddleware, permissionMiddleware, dataScopeMiddleware)

			dietRepo := diet.NewRepository(db)
			dietService := diet.NewService(dietRepo, db)
			dietHandler := diet.NewHandler(dietService)
			dietHandler.SetAuditRecorder(auditRecorder)
			diet.RegisterRoutes(staffGroup, dietHandler, authMiddleware, permissionMiddleware, dataScopeMiddleware)

			// Automatic daily meal generation (Asia/Kolkata, configurable time).
			go diet.NewScheduler(dietService, cfg.MealAutoGen, cfg.MealGenTime).Run(context.Background())

			uploadsHandler := uploads.NewHandler(uploadDir)
			uploads.RegisterRoutes(staffGroup, uploadsHandler, authMiddleware, permissionMiddleware)

			staffGroup.GET("/search",
				authMiddleware.RequireAuth(),
				permissionMiddleware.RequirePermission(models.PermPatientView),
				dataScopeMiddleware,
				func(c *gin.Context) {
				q := c.Query("q")
				if q == "" {
					utils.Success(c, 200, "ok", gin.H{"patients": []interface{}{}, "referrals": []interface{}{}, "bills": []interface{}{}})
					return
				}
				like := "%" + q + "%"

				// Doctor scoping: doctors only see patients they have treated,
				// with their referrals and bills. Other staff see everything.
				var doctorConds string
				var doctorArgs []interface{}
				if raw, ok := c.Get("data_scope"); ok {
					if scope, ok2 := raw.(*models.DataScope); ok2 && scope.DoctorID != nil {
						doctorConds = "AND EXISTS (SELECT 1 FROM encounters WHERE encounters.patient_id = p.patient_id AND encounters.doctor_id = ? AND encounters.deleted_at IS NULL)"
						doctorArgs = []interface{}{*scope.DoctorID}
					}
				}

				type PatientResult struct {
					ID       string `json:"id"`
					UHID     string `json:"uh_id"`
					FullName string `json:"full_name"`
					Mobile   string `json:"mobile"`
					Gender   string `json:"gender"`
				}
				args := []interface{}{like, like, like}
				args = append(args, doctorArgs...)
				var patResults []PatientResult
				db.Raw(`SELECT id, uh_id, full_name, mobile, gender FROM patients p WHERE p.deleted_at IS NULL AND (p.full_name ILIKE ? OR p.mobile ILIKE ? OR p.uh_id ILIKE ?)`+doctorConds+` LIMIT 10`, args...).Scan(&patResults)

				type ReferralResult struct {
					ID          string `json:"id"`
					PatientID   string `json:"patient_id"`
					PatientName string `json:"patient_name"`
					Department  string `json:"from_department_name"`
					Status      string `json:"status"`
					CreatedAt   string `json:"created_at"`
				}
				args = []interface{}{like, like}
				args = append(args, doctorArgs...)
				var refResults []ReferralResult
				db.Raw(`SELECT r.id, r.patient_id, COALESCE(p.full_name,'') AS patient_name, COALESCE(d.name,'') AS from_department_name, r.status, r.created_at::text FROM referrals r LEFT JOIN patients p ON p.id = r.patient_id LEFT JOIN departments d ON d.id = r.from_department_id WHERE r.deleted_at IS NULL AND (p.full_name ILIKE ? OR r.referral_no ILIKE ?)`+doctorConds+` LIMIT 10`, args...).Scan(&refResults)

				type BillResult struct {
					ID          string  `json:"id"`
					BillNo      string  `json:"bill_no"`
					PatientID   string  `json:"patient_id"`
					PatientName string  `json:"patient_name"`
					Total       float64 `json:"total_amount"`
					Status      string  `json:"status"`
				}
				args = []interface{}{like, like}
				args = append(args, doctorArgs...)
				var billResults []BillResult
				db.Raw(`SELECT b.id, b.bill_no, b.patient_id, COALESCE(p.full_name,'') AS patient_name, b.total_amount, b.status FROM bills b LEFT JOIN patients p ON p.id = b.patient_id WHERE b.deleted_at IS NULL AND (b.bill_no ILIKE ? OR p.full_name ILIKE ?)`+doctorConds+` LIMIT 10`, args...).Scan(&billResults)

				utils.Success(c, 200, "ok", gin.H{"patients": patResults, "referrals": refResults, "bills": billResults})
			})
		} // staffGroup
	}

	log.Printf("AHMS backend listening on :%s (env=%s)", cfg.ServerPort, cfg.AppEnv)
	if err := router.Run(":" + cfg.ServerPort); err != nil {
		log.Fatalf("server failed to start: %v", err)
	}
}
