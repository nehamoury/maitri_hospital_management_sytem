package lab

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
)

var (
	ErrNotFound         = errors.New("not found")
	ErrInvalidTransition = errors.New("invalid status transition")
	ErrAlreadyExists    = errors.New("already exists")
	ErrOrderNotOrderable = errors.New("order cannot be modified in its current state")
)

// Service contains all business logic for the lab module.
type Service interface {
	// Test Master
	CreateCategory(req CreateCategoryRequest) (*CategoryResponse, error)
	UpdateCategory(id uuid.UUID, req UpdateCategoryRequest) (*CategoryResponse, error)
	ListCategories(activeOnly bool) ([]CategoryResponse, error)
	CreateTest(req CreateTestRequest) (*TestResponse, error)
	UpdateTest(id uuid.UUID, req UpdateTestRequest) (*TestResponse, error)
	ListTests(categoryID string, activeOnly bool) ([]TestResponse, error)

	// Orders
	CreateOrder(req CreateOrderRequest, orderedByUserID uuid.UUID) (*OrderResponse, error)
	GetOrder(id uuid.UUID, scope *models.DataScope) (*OrderResponse, error)
	ListOrders(f ListOrdersFilter, scope *models.DataScope) ([]OrderListItem, int64, error)
	CancelOrder(id uuid.UUID, cancelledByUserID uuid.UUID, req CancelOrderRequest, scope *models.DataScope) error

	// Workflow transitions
	CollectSample(orderID uuid.UUID, collectedByUserID uuid.UUID, req CollectSampleRequest, scope *models.DataScope) error
	MarkProcessing(orderID uuid.UUID, scope *models.DataScope) error
	EnterResults(orderID uuid.UUID, resultedByUserID uuid.UUID, req EnterResultsRequest, scope *models.DataScope) error
	VerifyResults(orderID uuid.UUID, verifiedByUserID uuid.UUID, scope *models.DataScope) error
	DoctorReview(orderID uuid.UUID, doctorUserID uuid.UUID, req DoctorReviewRequest, scope *models.DataScope) error

	// Print report
	PrintReport(orderID uuid.UUID, scope *models.DataScope) (string, error)

	// Patient timeline
	PatientOrders(patientID uuid.UUID, scope *models.DataScope) ([]OrderListItem, error)
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

// ─── Category ──────────────────────────────────────────────────────────────────

func (s *service) CreateCategory(req CreateCategoryRequest) (*CategoryResponse, error) {
	cat := &models.InvestigationCategory{
		Name:        req.Name,
		Code:        strings.ToUpper(strings.TrimSpace(req.Code)),
		Description: req.Description,
		IsActive:    true,
	}
	if err := s.repo.CreateCategory(cat); err != nil {
		return nil, err
	}
	resp := &CategoryResponse{
		ID: cat.ID, Name: cat.Name, Code: cat.Code,
		Description: cat.Description, IsActive: cat.IsActive,
	}
	return resp, nil
}

func (s *service) UpdateCategory(id uuid.UUID, req UpdateCategoryRequest) (*CategoryResponse, error) {
	cat, err := s.repo.GetCategory(id)
	if err != nil {
		return nil, ErrNotFound
	}
	if req.Name != "" {
		cat.Name = req.Name
	}
	if req.Code != "" {
		cat.Code = strings.ToUpper(req.Code)
	}
	if req.Description != "" {
		cat.Description = req.Description
	}
	if req.IsActive != nil {
		cat.IsActive = *req.IsActive
	}
	if err := s.repo.UpdateCategory(cat); err != nil {
		return nil, err
	}
	return &CategoryResponse{
		ID: cat.ID, Name: cat.Name, Code: cat.Code,
		Description: cat.Description, IsActive: cat.IsActive,
	}, nil
}

func (s *service) ListCategories(activeOnly bool) ([]CategoryResponse, error) {
	cats, err := s.repo.ListCategories(activeOnly)
	if err != nil {
		return nil, err
	}
	out := make([]CategoryResponse, len(cats))
	for i, c := range cats {
		out[i] = CategoryResponse{
			ID: c.ID, Name: c.Name, Code: c.Code,
			Description: c.Description, IsActive: c.IsActive,
		}
	}
	return out, nil
}

// ─── Tests ────────────────────────────────────────────────────────────────────

func (s *service) CreateTest(req CreateTestRequest) (*TestResponse, error) {
	catID, err := uuid.Parse(req.CategoryID)
	if err != nil {
		return nil, errors.New("invalid category_id")
	}
	hours := req.TurnaroundHours
	if hours <= 0 {
		hours = 24
	}
	test := &models.InvestigationTest{
		CategoryID:           catID,
		Name:                 req.Name,
		Code:                 strings.ToUpper(req.Code),
		SampleType:           req.SampleType,
		Method:               req.Method,
		Unit:                 req.Unit,
		ReferenceRangeMale:   req.ReferenceRangeMale,
		ReferenceRangeFemale: req.ReferenceRangeFemale,
		ReferenceRangeChild:  req.ReferenceRangeChild,
		TurnaroundHours:      hours,
		Cost:                 req.Cost,
		IsActive:             true,
	}
	if err := s.repo.CreateTest(test); err != nil {
		return nil, err
	}
	return s.testToResponse(*test), nil
}

func (s *service) UpdateTest(id uuid.UUID, req UpdateTestRequest) (*TestResponse, error) {
	test, err := s.repo.GetTest(id)
	if err != nil {
		return nil, ErrNotFound
	}
	if req.Name != "" {
		test.Name = req.Name
	}
	if req.SampleType != "" {
		test.SampleType = req.SampleType
	}
	if req.Method != "" {
		test.Method = req.Method
	}
	if req.Unit != "" {
		test.Unit = req.Unit
	}
	if req.ReferenceRangeMale != "" {
		test.ReferenceRangeMale = req.ReferenceRangeMale
	}
	if req.ReferenceRangeFemale != "" {
		test.ReferenceRangeFemale = req.ReferenceRangeFemale
	}
	if req.ReferenceRangeChild != "" {
		test.ReferenceRangeChild = req.ReferenceRangeChild
	}
	if req.TurnaroundHours > 0 {
		test.TurnaroundHours = req.TurnaroundHours
	}
	if req.Cost >= 0 {
		test.Cost = req.Cost
	}
	if req.IsActive != nil {
		test.IsActive = *req.IsActive
	}
	if err := s.repo.UpdateTest(test); err != nil {
		return nil, err
	}
	return s.testToResponse(*test), nil
}

func (s *service) ListTests(categoryID string, activeOnly bool) ([]TestResponse, error) {
	tests, err := s.repo.ListTests(categoryID, activeOnly)
	if err != nil {
		return nil, err
	}
	out := make([]TestResponse, len(tests))
	for i, t := range tests {
		resp := s.testToResponse(t)
		out[i] = *resp
	}
	return out, nil
}

func (s *service) testToResponse(t models.InvestigationTest) *TestResponse {
	r := &TestResponse{
		ID:                   t.ID,
		CategoryID:           t.CategoryID,
		Name:                 t.Name,
		Code:                 t.Code,
		SampleType:           t.SampleType,
		Method:               t.Method,
		Unit:                 t.Unit,
		ReferenceRangeMale:   t.ReferenceRangeMale,
		ReferenceRangeFemale: t.ReferenceRangeFemale,
		ReferenceRangeChild:  t.ReferenceRangeChild,
		TurnaroundHours:      t.TurnaroundHours,
		Cost:                 t.Cost,
		IsActive:             t.IsActive,
	}
	if t.Category.ID != uuid.Nil {
		r.CategoryName = t.Category.Name
	}
	return r
}

// ─── Orders ───────────────────────────────────────────────────────────────────

func (s *service) CreateOrder(req CreateOrderRequest, orderedByUserID uuid.UUID) (*OrderResponse, error) {
	patientID, err := uuid.Parse(req.PatientID)
	if err != nil {
		return nil, errors.New("invalid patient_id")
	}

	year := time.Now().Year()
	orderNo, err := s.repo.NextOrderNumber(year)
	if err != nil {
		return nil, fmt.Errorf("failed to generate order number: %w", err)
	}

	order := &models.InvestigationOrder{
		OrderNo:         orderNo,
		PatientID:       patientID,
		OrderedByUserID: orderedByUserID,
		Status:          models.LabOrderOrdered,
		Priority:        req.Priority,
		ClinicalNotes:   req.ClinicalNotes,
	}
	if order.Priority == "" {
		order.Priority = models.LabPriorityRoutine
	}
	if req.EncounterID != "" {
		eid, err := uuid.Parse(req.EncounterID)
		if err == nil {
			order.EncounterID = &eid
		}
	}
	if req.AdmissionID != "" {
		aid, err := uuid.Parse(req.AdmissionID)
		if err == nil {
			order.AdmissionID = &aid
		}
	}
	if req.DepartmentID != "" {
		did, err := uuid.Parse(req.DepartmentID)
		if err == nil {
			order.DepartmentID = &did
		}
	}

	// Build order items
	items := make([]models.InvestigationOrderItem, 0, len(req.Items))
	for _, ir := range req.Items {
		testID, err := uuid.Parse(ir.TestID)
		if err != nil {
			return nil, fmt.Errorf("invalid test_id: %s", ir.TestID)
		}
		// Fetch test to snapshot reference range
		test, err := s.repo.GetTest(testID)
		if err != nil {
			return nil, fmt.Errorf("test %s not found", ir.TestID)
		}
		items = append(items, models.InvestigationOrderItem{
			TestID:                 testID,
			Status:                 models.LabItemPending,
			ReferenceRangeSnapshot: test.ReferenceRangeMale, // default; can be refined per patient gender
		})
	}

	if err := s.repo.CreateOrder(order, items); err != nil {
		return nil, err
	}

	full, err := s.repo.GetOrder(order.ID, nil)
	if err != nil {
		return nil, err
	}
	resp := orderToResponse(*full)
	return &resp, nil
}

func (s *service) GetOrder(id uuid.UUID, scope *models.DataScope) (*OrderResponse, error) {
	order, err := s.repo.GetOrder(id, scope)
	if err != nil {
		return nil, ErrNotFound
	}
	resp := orderToResponse(*order)
	return &resp, nil
}

func (s *service) ListOrders(f ListOrdersFilter, scope *models.DataScope) ([]OrderListItem, int64, error) {
	orders, total, err := s.repo.ListOrders(f, scope)
	if err != nil {
		return nil, 0, err
	}
	out := make([]OrderListItem, len(orders))
	for i, o := range orders {
		pending := 0
		for _, item := range o.Items {
			if item.Status == models.LabItemPending || item.Status == models.LabItemProcessing {
				pending++
			}
		}
		name := ""
		uhid := ""
		if o.Patient.ID != uuid.Nil {
			name = o.Patient.FullName
			uhid = o.Patient.UHID
		}
		orderedBy := ""
		if o.OrderedByUser.ID != uuid.Nil {
			orderedBy = o.OrderedByUser.FullName
		}
		out[i] = OrderListItem{
			ID:           o.ID,
			OrderNo:      o.OrderNo,
			PatientName:  name,
			PatientUHID:  uhid,
			Status:       o.Status,
			Priority:     o.Priority,
			TestCount:    len(o.Items),
			PendingCount: pending,
			OrderedBy:    orderedBy,
			CreatedAt:    o.CreatedAt,
		}
	}
	return out, total, nil
}

func (s *service) CancelOrder(id uuid.UUID, cancelledByUserID uuid.UUID, req CancelOrderRequest, scope *models.DataScope) error {
	order, err := s.repo.GetOrder(id, scope)
	if err != nil {
		return ErrNotFound
	}
	if order.Status == models.LabOrderDoctorReviewed || order.Status == models.LabOrderCancelled {
		return ErrInvalidTransition
	}
	now := time.Now()
	order.Status = models.LabOrderCancelled
	order.CancelledByUserID = &cancelledByUserID
	order.CancelledAt = &now
	order.CancelReason = req.Reason
	return s.repo.UpdateOrder(order)
}

// ─── Workflow Transitions ─────────────────────────────────────────────────────

func (s *service) CollectSample(orderID uuid.UUID, collectedByUserID uuid.UUID, req CollectSampleRequest, scope *models.DataScope) error {
	order, err := s.repo.GetOrder(orderID, scope)
	if err != nil {
		return ErrNotFound
	}
	if order.Status != models.LabOrderOrdered {
		return fmt.Errorf("%w: expected ORDERED, got %s", ErrInvalidTransition, order.Status)
	}

	isAdequate := true
	if req.IsAdequate != nil {
		isAdequate = *req.IsAdequate
	}

	sample := &models.InvestigationSample{
		OrderID:          orderID,
		SampleType:       req.SampleType,
		CollectionMethod: req.CollectionMethod,
		Barcode:          req.Barcode,
		VolumeMl:         req.VolumeMl,
		IsAdequate:       isAdequate,
		Notes:            req.Notes,
		CollectedByUserID: collectedByUserID,
		CollectedAt:      time.Now(),
	}
	if err := s.repo.CreateSample(sample); err != nil {
		return err
	}

	order.Status = models.LabOrderSampleCollected
	return s.repo.UpdateOrder(order)
}

func (s *service) MarkProcessing(orderID uuid.UUID, scope *models.DataScope) error {
	order, err := s.repo.GetOrder(orderID, scope)
	if err != nil {
		return ErrNotFound
	}
	if order.Status != models.LabOrderSampleCollected {
		return fmt.Errorf("%w: expected SAMPLE_COLLECTED, got %s", ErrInvalidTransition, order.Status)
	}
	order.Status = models.LabOrderProcessing
	// Also mark each item as PROCESSING
	for i := range order.Items {
		if order.Items[i].Status == models.LabItemPending {
			order.Items[i].Status = models.LabItemProcessing
		}
	}
	if err := s.repo.UpdateOrderItems(order.Items); err != nil {
		return err
	}
	return s.repo.UpdateOrder(order)
}

func (s *service) EnterResults(orderID uuid.UUID, resultedByUserID uuid.UUID, req EnterResultsRequest, scope *models.DataScope) error {
	order, err := s.repo.GetOrder(orderID, scope)
	if err != nil {
		return ErrNotFound
	}
	if order.Status != models.LabOrderProcessing && order.Status != models.LabOrderSampleCollected {
		return fmt.Errorf("%w: cannot enter results in status %s", ErrInvalidTransition, order.Status)
	}

	// Build a map for quick lookup
	itemMap := make(map[uuid.UUID]*models.InvestigationOrderItem, len(order.Items))
	for i := range order.Items {
		itemMap[order.Items[i].ID] = &order.Items[i]
	}

	now := time.Now()
	for _, r := range req.Results {
		itemID, err := uuid.Parse(r.ItemID)
		if err != nil {
			return fmt.Errorf("invalid item_id: %s", r.ItemID)
		}
		item, ok := itemMap[itemID]
		if !ok {
			return fmt.Errorf("item %s not found in order", r.ItemID)
		}
		item.ResultValue = r.ResultValue
		item.ResultUnit = r.ResultUnit
		item.ResultText = r.ResultText
		item.ResultFlag = r.ResultFlag
		if item.ResultFlag == "" {
			item.ResultFlag = models.LabFlagNormal
		}
		item.Remarks = r.Remarks
		item.Status = models.LabItemResultEntered
		item.ResultedByUserID = &resultedByUserID
		item.ResultedAt = &now
	}

	// Persist updated items
	updatedItems := make([]models.InvestigationOrderItem, 0, len(itemMap))
	for _, item := range itemMap {
		updatedItems = append(updatedItems, *item)
	}
	if err := s.repo.UpdateOrderItems(updatedItems); err != nil {
		return err
	}

	// Recompute order status
	newStatus := computeOrderStatus(updatedItems)
	if newStatus != "" {
		order.Status = newStatus
		return s.repo.UpdateOrder(order)
	}
	return nil
}

func (s *service) VerifyResults(orderID uuid.UUID, verifiedByUserID uuid.UUID, scope *models.DataScope) error {
	order, err := s.repo.GetOrder(orderID, scope)
	if err != nil {
		return ErrNotFound
	}
	if order.Status != models.LabOrderProcessing && order.Status != models.LabOrderResultAvailable {
		return fmt.Errorf("%w: cannot verify in status %s", ErrInvalidTransition, order.Status)
	}

	now := time.Now()
	for i := range order.Items {
		if order.Items[i].Status == models.LabItemResultEntered {
			order.Items[i].Status = models.LabItemVerified
			order.Items[i].VerifiedByUserID = &verifiedByUserID
			order.Items[i].VerifiedAt = &now
		}
	}
	if err := s.repo.UpdateOrderItems(order.Items); err != nil {
		return err
	}

	newStatus := computeOrderStatus(order.Items)
	if newStatus != "" {
		order.Status = newStatus
	}
	return s.repo.UpdateOrder(order)
}

func (s *service) DoctorReview(orderID uuid.UUID, doctorUserID uuid.UUID, req DoctorReviewRequest, scope *models.DataScope) error {
	order, err := s.repo.GetOrder(orderID, scope)
	if err != nil {
		return ErrNotFound
	}
	if order.Status != models.LabOrderResultAvailable {
		return fmt.Errorf("%w: expected RESULT_AVAILABLE, got %s", ErrInvalidTransition, order.Status)
	}

	now := time.Now()
	order.Status = models.LabOrderDoctorReviewed
	order.ReviewedByUserID = &doctorUserID
	order.ReviewedAt = &now
	order.DoctorRemarks = req.DoctorRemarks
	return s.repo.UpdateOrder(order)
}

// ─── Print Report ─────────────────────────────────────────────────────────────

func (s *service) PrintReport(orderID uuid.UUID, scope *models.DataScope) (string, error) {
	order, err := s.repo.GetOrder(orderID, scope)
	if err != nil {
		return "", ErrNotFound
	}
	return renderLabReport(order), nil
}

// ─── Patient Timeline ─────────────────────────────────────────────────────────

func (s *service) PatientOrders(patientID uuid.UUID, scope *models.DataScope) ([]OrderListItem, error) {
	orders, err := s.repo.ListOrdersByPatient(patientID, scope)
	if err != nil {
		return nil, err
	}
	out := make([]OrderListItem, len(orders))
	for i, o := range orders {
		pending := 0
		for _, item := range o.Items {
			if item.Status == models.LabItemPending || item.Status == models.LabItemProcessing {
				pending++
			}
		}
		out[i] = OrderListItem{
			ID:           o.ID,
			OrderNo:      o.OrderNo,
			Status:       o.Status,
			Priority:     o.Priority,
			TestCount:    len(o.Items),
			PendingCount: pending,
			CreatedAt:    o.CreatedAt,
		}
	}
	return out, nil
}
