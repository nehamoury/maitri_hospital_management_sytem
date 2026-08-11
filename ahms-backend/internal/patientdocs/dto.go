package patientdocs

import (
	"time"

	"github.com/ahms/backend/internal/models"
)

// DocumentResponse is the public shape of a patient document.
type DocumentResponse struct {
	ID         string `json:"id"`
	PatientID  string `json:"patient_id"`
	DocType    string `json:"doc_type"`
	Notes      string `json:"notes,omitempty"`
	FileName   string `json:"file_name"`
	FilePath   string `json:"file_path"`
	FileType   string `json:"file_type"`
	FileSize   int64  `json:"file_size"`
	UploadedBy string `json:"uploaded_by"`
	CreatedAt  string `json:"created_at"`
}

func toResponse(d *models.PatientDocument, uploadedBy string) DocumentResponse {
	resp := DocumentResponse{
		ID:         d.ID.String(),
		PatientID:  d.PatientID.String(),
		DocType:    d.DocType,
		Notes:      d.Notes,
		FileName:   d.FileName,
		FilePath:   d.FilePath,
		FileType:   d.FileType,
		FileSize:   d.FileSize,
		UploadedBy: uploadedBy,
		CreatedAt:  d.CreatedAt.Format(time.RFC3339),
	}
	return resp
}
