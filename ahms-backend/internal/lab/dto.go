package lab

import (
	"time"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
)

// ─── Request DTOs ─────────────────────────────────────────────────────────────

type CreateCategoryRequest struct {
	Name        string `json:"name" binding:"required"`
	Code        string `json:"code" binding:"required"`
	Description string `json:"description"`
}

type UpdateCategoryRequest struct {
	Name        string `json:"name"`
	Code        string `json:"code"`
	Description string `json:"description"`
	IsActive    *bool  `json:"is_active"`
}

type CreateTestRequest struct {
	CategoryID           string  `json:"category_id" binding:"required"`
	Name                 string  `json:"name" binding:"required"`
	Code                 string  `json:"code" binding:"required"`
	SampleType           string  `json:"sample_type" binding:"required"`
	Method               string  `json:"method"`
	Unit                 string  `json:"unit"`
	ReferenceRangeMale   string  `json:"reference_range_male"`
	ReferenceRangeFemale string  `json:"reference_range_female"`
	ReferenceRangeChild  string  `json:"reference_range_child"`
	TurnaroundHours      int     `json:"turnaround_hours"`
	Cost                 float64 `json:"cost"`
}

type UpdateTestRequest struct {
	Name                 string  `json:"name"`
	SampleType           string  `json:"sample_type"`
	Method               string  `json:"method"`
	Unit                 string  `json:"unit"`
	ReferenceRangeMale   string  `json:"reference_range_male"`
	ReferenceRangeFemale string  `json:"reference_range_female"`
	ReferenceRangeChild  string  `json:"reference_range_child"`
	TurnaroundHours      int     `json:"turnaround_hours"`
	Cost                 float64 `json:"cost"`
	IsActive             *bool   `json:"is_active"`
}

type OrderItemRequest struct {
	TestID string `json:"test_id" binding:"required"`
}

type CreateOrderRequest struct {
	PatientID     string             `json:"patient_id" binding:"required"`
	EncounterID   string             `json:"encounter_id"`
	AdmissionID   string             `json:"admission_id"`
	DepartmentID  string             `json:"department_id"`
	Priority      string             `json:"priority"`
	ClinicalNotes string             `json:"clinical_notes"`
	Items         []OrderItemRequest `json:"items" binding:"required,min=1"`
}

type CollectSampleRequest struct {
	SampleType       string  `json:"sample_type" binding:"required"`
	CollectionMethod string  `json:"collection_method"`
	Barcode          string  `json:"barcode"`
	VolumeMl         float64 `json:"volume_ml"`
	IsAdequate       *bool   `json:"is_adequate"`
	Notes            string  `json:"notes"`
}

type ResultItemRequest struct {
	ItemID      string `json:"item_id" binding:"required"`
	ResultValue string `json:"result_value"`
	ResultUnit  string `json:"result_unit"`
	ResultText  string `json:"result_text"`
	ResultFlag  string `json:"result_flag"` // NORMAL/LOW/HIGH/CRITICAL
	Remarks     string `json:"remarks"`
}

type EnterResultsRequest struct {
	Results []ResultItemRequest `json:"results" binding:"required,min=1"`
}

type DoctorReviewRequest struct {
	DoctorRemarks string `json:"doctor_remarks" binding:"required"`
}

type CancelOrderRequest struct {
	Reason string `json:"reason" binding:"required"`
}

type ListOrdersFilter struct {
	PatientID   string
	EncounterID string
	Status      string
	Priority    string
	From        time.Time
	To          time.Time
	Page        int
	PageSize    int
}

// ─── Response DTOs ────────────────────────────────────────────────────────────

type CategoryResponse struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Code        string    `json:"code"`
	Description string    `json:"description"`
	IsActive    bool      `json:"is_active"`
	TestCount   int64     `json:"test_count,omitempty"`
}

type TestResponse struct {
	ID                   uuid.UUID `json:"id"`
	CategoryID           uuid.UUID `json:"category_id"`
	CategoryName         string    `json:"category_name,omitempty"`
	Name                 string    `json:"name"`
	Code                 string    `json:"code"`
	SampleType           string    `json:"sample_type"`
	Method               string    `json:"method"`
	Unit                 string    `json:"unit"`
	ReferenceRangeMale   string    `json:"reference_range_male"`
	ReferenceRangeFemale string    `json:"reference_range_female"`
	ReferenceRangeChild  string    `json:"reference_range_child"`
	TurnaroundHours      int       `json:"turnaround_hours"`
	Cost                 float64   `json:"cost"`
	IsActive             bool      `json:"is_active"`
}

type OrderItemResponse struct {
	ID                     uuid.UUID  `json:"id"`
	TestID                 uuid.UUID  `json:"test_id"`
	TestName               string     `json:"test_name"`
	TestCode               string     `json:"test_code"`
	TestUnit               string     `json:"test_unit"`
	SampleType             string     `json:"sample_type"`
	Status                 string     `json:"status"`
	ResultValue            string     `json:"result_value,omitempty"`
	ResultUnit             string     `json:"result_unit,omitempty"`
	ResultText             string     `json:"result_text,omitempty"`
	ResultFlag             string     `json:"result_flag,omitempty"`
	ReferenceRangeSnapshot string     `json:"reference_range_snapshot,omitempty"`
	Remarks                string     `json:"remarks,omitempty"`
	ResultedByName         string     `json:"resulted_by_name,omitempty"`
	ResultedAt             *time.Time `json:"resulted_at,omitempty"`
	VerifiedByName         string     `json:"verified_by_name,omitempty"`
	VerifiedAt             *time.Time `json:"verified_at,omitempty"`
}

type SampleResponse struct {
	ID               uuid.UUID `json:"id"`
	OrderID          uuid.UUID `json:"order_id"`
	SampleType       string    `json:"sample_type"`
	CollectionMethod string    `json:"collection_method"`
	Barcode          string    `json:"barcode"`
	VolumeMl         float64   `json:"volume_ml"`
	IsAdequate       bool      `json:"is_adequate"`
	Notes            string    `json:"notes"`
	CollectedByName  string    `json:"collected_by_name"`
	CollectedAt      time.Time `json:"collected_at"`
}

type OrderResponse struct {
	ID             uuid.UUID          `json:"id"`
	OrderNo        string             `json:"order_no"`
	PatientID      uuid.UUID          `json:"patient_id"`
	PatientName    string             `json:"patient_name"`
	PatientUHID    string             `json:"patient_uhid"`
	EncounterID    *uuid.UUID         `json:"encounter_id,omitempty"`
	AdmissionID    *uuid.UUID         `json:"admission_id,omitempty"`
	DepartmentID   *uuid.UUID         `json:"department_id,omitempty"`
	OrderedBy      string             `json:"ordered_by"`
	Status         string             `json:"status"`
	Priority       string             `json:"priority"`
	ClinicalNotes  string             `json:"clinical_notes"`
	CancelReason   string             `json:"cancel_reason,omitempty"`
	DoctorRemarks  string             `json:"doctor_remarks,omitempty"`
	ReviewedBy     string             `json:"reviewed_by,omitempty"`
	ReviewedAt     *time.Time         `json:"reviewed_at,omitempty"`
	Items          []OrderItemResponse `json:"items"`
	Sample         *SampleResponse    `json:"sample,omitempty"`
	CreatedAt      time.Time          `json:"created_at"`
}

// OrderListItem is a lightweight row for the order list view.
type OrderListItem struct {
	ID          uuid.UUID  `json:"id"`
	OrderNo     string     `json:"order_no"`
	PatientName string     `json:"patient_name"`
	PatientUHID string     `json:"patient_uhid"`
	Status      string     `json:"status"`
	Priority    string     `json:"priority"`
	TestCount   int        `json:"test_count"`
	PendingCount int       `json:"pending_count"`
	OrderedBy   string     `json:"ordered_by"`
	CreatedAt   time.Time  `json:"created_at"`
}

// fromModel helpers — convert DB model to response DTO

func orderItemToResponse(item models.InvestigationOrderItem) OrderItemResponse {
	r := OrderItemResponse{
		ID:                     item.ID,
		TestID:                 item.TestID,
		Status:                 item.Status,
		ResultValue:            item.ResultValue,
		ResultUnit:             item.ResultUnit,
		ResultText:             item.ResultText,
		ResultFlag:             item.ResultFlag,
		ReferenceRangeSnapshot: item.ReferenceRangeSnapshot,
		Remarks:                item.Remarks,
		ResultedAt:             item.ResultedAt,
		VerifiedAt:             item.VerifiedAt,
	}
	if item.Test.ID != uuid.Nil {
		r.TestName = item.Test.Name
		r.TestCode = item.Test.Code
		r.TestUnit = item.Test.Unit
		r.SampleType = item.Test.SampleType
	}
	if item.ResultedByUser != nil {
		r.ResultedByName = item.ResultedByUser.FullName
	}
	if item.VerifiedByUser != nil {
		r.VerifiedByName = item.VerifiedByUser.FullName
	}
	return r
}

func sampleToResponse(s *models.InvestigationSample) *SampleResponse {
	if s == nil {
		return nil
	}
	return &SampleResponse{
		ID:               s.ID,
		OrderID:          s.OrderID,
		SampleType:       s.SampleType,
		CollectionMethod: s.CollectionMethod,
		Barcode:          s.Barcode,
		VolumeMl:         s.VolumeMl,
		IsAdequate:       s.IsAdequate,
		Notes:            s.Notes,
		CollectedByName:  s.CollectedByUser.FullName,
		CollectedAt:      s.CollectedAt,
	}
}

func orderToResponse(o models.InvestigationOrder) OrderResponse {
	resp := OrderResponse{
		ID:            o.ID,
		OrderNo:       o.OrderNo,
		PatientID:     o.PatientID,
		EncounterID:   o.EncounterID,
		AdmissionID:   o.AdmissionID,
		DepartmentID:  o.DepartmentID,
		Status:        o.Status,
		Priority:      o.Priority,
		ClinicalNotes: o.ClinicalNotes,
		CancelReason:  o.CancelReason,
		DoctorRemarks: o.DoctorRemarks,
		ReviewedAt:    o.ReviewedAt,
		CreatedAt:     o.CreatedAt,
	}
	if o.Patient.ID != uuid.Nil {
		resp.PatientName = o.Patient.FullName
		resp.PatientUHID = o.Patient.UHID
	}
	if o.OrderedByUser.ID != uuid.Nil {
		resp.OrderedBy = o.OrderedByUser.FullName
	}
	if o.ReviewedByUser != nil {
		resp.ReviewedBy = o.ReviewedByUser.FullName
	}
	for _, item := range o.Items {
		resp.Items = append(resp.Items, orderItemToResponse(item))
	}
	resp.Sample = sampleToResponse(o.Sample)
	return resp
}
