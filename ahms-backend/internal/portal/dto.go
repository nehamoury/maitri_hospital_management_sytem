// Package portal implements the patient-facing web portal: patient login,
// profile, appointments (view + self-booking), prescriptions and bills.
// Patients authenticate with their UHID + registered mobile number — there
// is no password since patient records carry no user account.
package portal

import (
	"github.com/ahms/backend/internal/auth"
	"github.com/ahms/backend/internal/models"
)

// PatientLoginRequest is the payload for POST /portal/login.
type PatientLoginRequest struct {
	UHID   string `json:"uhid" binding:"required"`
	Mobile string `json:"mobile" binding:"required,min=10,max=15"`
}

// LoginResponse mirrors the staff auth response so the frontend uses one
// token contract.
type LoginResponse = auth.LoginResponse

// ProfileResponse is the patient's own demographic snapshot.
type ProfileResponse struct {
	ID         string `json:"id"`
	UHID       string `json:"uhid"`
	FullName   string `json:"full_name"`
	Gender     string `json:"gender"`
	DOB        string `json:"dob,omitempty"`
	Age        int    `json:"age"`
	Mobile     string `json:"mobile"`
	Email      string `json:"email"`
	Address    string `json:"address"`
	BloodGroup string `json:"blood_group"`
}

func toProfile(p *models.Patient) ProfileResponse {
	dob := ""
	if p.DOB != nil {
		dob = p.DOB.Format("2006-01-02")
	}
	return ProfileResponse{
		ID:         p.ID.String(),
		UHID:       p.UHID,
		FullName:   p.FullName,
		Gender:     p.Gender,
		DOB:        dob,
		Age:        p.Age,
		Mobile:     p.Mobile,
		Email:      p.Email,
		Address:    p.Address,
		BloodGroup: p.BloodGroup,
	}
}

// PortalAppointmentResponse is a patient's own appointment.
type PortalAppointmentResponse struct {
	ID              string `json:"id"`
	DoctorID        string `json:"doctor_id"`
	DoctorName      string `json:"doctor_name"`
	AppointmentDate string `json:"appointment_date"`
	TokenNumber     int    `json:"token_number"`
	Status          string `json:"status"`
	Reason          string `json:"reason"`
}

func toAppointment(a *models.Appointment) PortalAppointmentResponse {
	return PortalAppointmentResponse{
		ID:              a.ID.String(),
		DoctorID:        a.DoctorID.String(),
		DoctorName:      a.Doctor.User.FullName,
		AppointmentDate: a.AppointmentDate.Format("2006-01-02"),
		TokenNumber:     a.TokenNumber,
		Status:          a.Status,
		Reason:          a.Reason,
	}
}

// BookAppointmentRequest is the payload for POST /portal/appointments.
type BookAppointmentRequest struct {
	DoctorID        string `json:"doctor_id" binding:"required,uuid"`
	AppointmentDate string `json:"appointment_date" binding:"required,datetime=2006-01-02"`
	Reason          string `json:"reason" binding:"max=500"`
}

// PortalPrescriptionItemResponse is one medicine line in a patient's own prescription.
type PortalPrescriptionItemResponse struct {
	Medicine     string `json:"medicine"`
	Formulation  string `json:"formulation"`
	Dose         string `json:"dose"`
	Frequency    string `json:"frequency"`
	Duration     string `json:"duration"`
	Quantity     int    `json:"quantity"`
	Anupana      string `json:"anupana"`
	Route        string `json:"route"`
	DispensedQty int    `json:"dispensed_qty"`
}

// PortalPrescriptionResponse is a patient's own prescription with the
// prescribed-vs-dispensed distinction.
type PortalPrescriptionResponse struct {
	ID        string                         `json:"id"`
	Date      string                         `json:"date"`
	Doctor    string                         `json:"doctor"`
	Status    string                         `json:"status"`
	Notes     string                         `json:"notes"`
	Items     []PortalPrescriptionItemResponse `json:"items"`
}

func toPrescription(p *models.Prescription) PortalPrescriptionResponse {
	resp := PortalPrescriptionResponse{
		ID:     p.ID.String(),
		Date:   p.CreatedAt.Format("2006-01-02"),
		Doctor: p.Doctor.User.FullName,
		Status: p.Status,
		Notes:  p.Notes,
	}
	for i := range p.Items {
		it := &p.Items[i]
		resp.Items = append(resp.Items, PortalPrescriptionItemResponse{
			Medicine:     it.Medicine,
			Formulation:  it.Formulation,
			Dose:         it.Dose,
			Frequency:    it.Frequency,
			Duration:     it.Duration,
			Quantity:     it.Quantity,
			Anupana:      it.Anupana,
			Route:        it.Route,
			DispensedQty: it.DispensedQty,
		})
	}
	return resp
}

// PortalPaymentResponse is one payment a patient made.
type PortalPaymentResponse struct {
	Amount   float64 `json:"amount"`
	Method   string  `json:"method"`
	Date     string  `json:"date"`
}

// PortalBillResponse is a patient's own bill with outstanding balance.
type PortalBillResponse struct {
	ID            string                  `json:"id"`
	BillNo        string                  `json:"bill_no"`
	Date          string                  `json:"date"`
	TotalAmount   float64                 `json:"total_amount"`
	Discount      float64                 `json:"discount"`
	NetAmount     float64                 `json:"net_amount"`
	PaidAmount    float64                 `json:"paid_amount"`
	DueAmount     float64                 `json:"due_amount"`
	PaymentStatus string                  `json:"payment_status"`
	Items         []PortalBillItemResponse `json:"items"`
	Payments      []PortalPaymentResponse  `json:"payments"`
}

// PortalBillItemResponse is one billed line.
type PortalBillItemResponse struct {
	Description string  `json:"description"`
	Quantity    int     `json:"quantity"`
	Rate        float64 `json:"rate"`
	Amount      float64 `json:"amount"`
}

func toBill(b *models.Bill) PortalBillResponse {
	resp := PortalBillResponse{
		ID:            b.ID.String(),
		BillNo:        b.BillNo,
		Date:          b.CreatedAt.Format("2006-01-02"),
		TotalAmount:   b.TotalAmount,
		Discount:      b.Discount,
		NetAmount:     b.NetAmount,
		PaidAmount:    b.PaidAmount,
		DueAmount:     b.DueAmount,
		PaymentStatus: b.PaymentStatus,
	}
	for i := range b.Items {
		it := &b.Items[i]
		resp.Items = append(resp.Items, PortalBillItemResponse{
			Description: it.Description,
			Quantity:    it.Quantity,
			Rate:        it.Rate,
			Amount:      it.Amount,
		})
	}
	for i := range b.Payments {
		pay := &b.Payments[i]
		resp.Payments = append(resp.Payments, PortalPaymentResponse{
			Amount: pay.Amount,
			Method: pay.Method,
			Date:   pay.CreatedAt.Format("2006-01-02"),
		})
	}
	return resp
}
