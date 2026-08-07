// Package public serves the marketing-website read endpoints that anyone
// can call without a token: active departments, active doctors and the
// procedure catalogue. Only curated, safe fields are exposed — no email,
// mobile, internal notes, permissions or audit data.
package public

import (
	"net/http"

	"github.com/ahms/backend/internal/departments"
	"github.com/ahms/backend/internal/doctors"
	"github.com/ahms/backend/internal/treatments"
	"github.com/ahms/backend/internal/utils"
	"github.com/gin-gonic/gin"
)

// Handler composes the feature services that back the public website feeds.
type Handler struct {
	departments departments.Service
	doctors     doctors.Service
	treatments  treatments.Service
}

// NewHandler builds a Handler.
func NewHandler(deptSvc departments.Service, docSvc doctors.Service, treatmentSvc treatments.Service) *Handler {
	return &Handler{departments: deptSvc, doctors: docSvc, treatments: treatmentSvc}
}

// DepartmentPublic is the safe, public shape of a department with its
// live count of active doctors.
type DepartmentPublic struct {
	ID          string  `json:"id"`
	Code        string  `json:"code"`
	Name        string  `json:"name"`
	Type        string  `json:"type"`
	Description string  `json:"description"`
	DefaultFee  float64 `json:"default_fee"`
	DoctorCount int     `json:"doctor_count"`
}

// DoctorPublic is the safe, public shape of a doctor.
type DoctorPublic struct {
	ID              string  `json:"id"`
	Name            string  `json:"name"`
	Department      string  `json:"department"`
	Specialization  string  `json:"specialization"`
	Qualification   string  `json:"qualification"`
	ExperienceYears int     `json:"experience_years"`
	ConsultationFee float64 `json:"consultation_fee"`
}

// ProcedureTypePublic is the safe, public shape of a procedure type.
type ProcedureTypePublic struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Category    string `json:"category"`
	Description string `json:"description"`
}

// Doctors godoc
// @Summary      Public list of active doctors
// @Description  No auth. Safe fields only: name, department, specialization, qualification, experience, fee.
// @Tags         public
// @Produce      json
// @Success      200 {object} utils.APIResponse{data=[]DoctorPublic}
// @Router       /public/doctors [get]
func (h *Handler) Doctors(c *gin.Context) {
	docs, err := h.doctors.List()
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, "failed to fetch doctors")
		return
	}
	resp := make([]DoctorPublic, 0, len(docs))
	for i := range docs {
		d := &docs[i]
		if !d.IsActive {
			continue
		}
		resp = append(resp, DoctorPublic{
			ID:              d.ID.String(),
			Name:            d.User.FullName,
			Department:      d.Department.Name,
			Specialization:  d.Specialization,
			Qualification:   d.Qualification,
			ExperienceYears: d.ExperienceYears,
			ConsultationFee: d.ConsultationFee,
		})
	}
	utils.Success(c, http.StatusOK, "doctors fetched", resp)
}

// Departments godoc
// @Summary      Public list of active departments with doctor counts
// @Description  No auth. Safe fields only.
// @Tags         public
// @Produce      json
// @Success      200 {object} utils.APIResponse{data=[]DepartmentPublic}
// @Router       /public/departments [get]
func (h *Handler) Departments(c *gin.Context) {
	depts, err := h.departments.List()
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, "failed to fetch departments")
		return
	}
	allDocs, err := h.doctors.List()
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, "failed to fetch doctors")
		return
	}
	counts := map[string]int{}
	for i := range allDocs {
		if !allDocs[i].IsActive {
			continue
		}
		counts[allDocs[i].DepartmentID.String()]++
	}
	resp := make([]DepartmentPublic, 0, len(depts))
	for i := range depts {
		d := &depts[i]
		if !d.IsActive {
			continue
		}
		resp = append(resp, DepartmentPublic{
			ID:          d.ID.String(),
			Code:        d.Code,
			Name:        d.Name,
			Type:        d.Type,
			Description: d.Description,
			DefaultFee:  d.DefaultFee,
			DoctorCount: counts[d.ID.String()],
		})
	}
	utils.Success(c, http.StatusOK, "departments fetched", resp)
}

// ProcedureTypes godoc
// @Summary      Public list of active procedure types
// @Description  No auth. The treatment catalogue shown on the website.
// @Tags         public
// @Produce      json
// @Success      200 {object} utils.APIResponse{data=[]ProcedureTypePublic}
// @Router       /public/procedure-types [get]
func (h *Handler) ProcedureTypes(c *gin.Context) {
	types, err := h.treatments.ListProcedureTypes()
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, "failed to fetch procedure types")
		return
	}
	resp := make([]ProcedureTypePublic, 0, len(types))
	for i := range types {
		t := &types[i]
		resp = append(resp, ProcedureTypePublic{
			ID:          t.ID.String(),
			Name:        t.Name,
			Category:    t.Category,
			Description: t.Description,
		})
	}
	utils.Success(c, http.StatusOK, "procedure types fetched", resp)
}
