package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"fmt"
)

// JSONB is a map that marshals to PostgreSQL jsonb columns. Used for
// configurable clinical fields (Ayurvedic assessment) and audit values so
// the schema stays flexible without migrations for every new field.
type JSONB map[string]interface{}

// Value implements driver.Valuer so GORM stores the map as jsonb.
func (j JSONB) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	b, err := json.Marshal(j)
	if err != nil {
		return nil, err
	}
	return string(b), nil
}

// Scan implements sql.Scanner so GORM can read a jsonb column into the map.
func (j *JSONB) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}
	var data []byte
	switch v := value.(type) {
	case []byte:
		data = v
	case string:
		data = []byte(v)
	default:
		return errors.New("jsonb: unsupported scan type")
	}
	var m map[string]interface{}
	if err := json.Unmarshal(data, &m); err != nil {
		return fmt.Errorf("jsonb: failed to unmarshal value: %w", err)
	}
	*j = m
	return nil
}
