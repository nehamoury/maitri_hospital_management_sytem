package models

import "github.com/google/uuid"

// DataScope encapsulates contextual authorization constraints for the
// data layer. Service methods accept DataScope to automatically scope
// queries based on the user's role and associated entities (e.g., Doctor).
type DataScope struct {
	Role     string
	DoctorID *uuid.UUID
}
