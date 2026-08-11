package main

import (
	"fmt"
	"log"

	"github.com/ahms/backend/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	dsn := "host=localhost user=postgres password=postgres dbname=postgres port=5432 sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}

	var encounters []models.Encounter
	if err := db.Preload("Patient").Find(&encounters).Error; err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Found %d encounters\n", len(encounters))
	for _, e := range encounters {
		fmt.Printf("Encounter ID: %s\n", e.ID)
		fmt.Printf("  Patient ID: %s\n", e.PatientID)
		fmt.Printf("  Patient Name: '%s'\n", e.Patient.FullName)
		fmt.Printf("  Token: %d\n", e.TokenNumber)
	}

	var appointments []models.Appointment
	if err := db.Preload("Patient").Find(&appointments).Error; err != nil {
		log.Fatal(err)
	}
	fmt.Printf("\nFound %d appointments\n", len(appointments))
	for _, a := range appointments {
		fmt.Printf("Appt ID: %s\n", a.ID)
		fmt.Printf("  Patient ID: %s\n", a.PatientID)
		fmt.Printf("  Patient Name: '%s'\n", a.Patient.FullName)
	}
}
