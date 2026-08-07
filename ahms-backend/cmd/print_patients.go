package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type Patient struct {
	ID       string `gorm:"column:id"`
	UHID     string `gorm:"column:uhid"`
	FullName string `gorm:"column:full_name"`
	Mobile   string `gorm:"column:mobile"`
	IsActive bool   `gorm:"column:is_active"`
}

func (Patient) TableName() string {
	return "patients"
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func main() {
	cwd, _ := os.Getwd()
	_ = godotenv.Load(filepath.Join(cwd, ".env"))

	host := getEnv("DB_HOST", "localhost")
	port := getEnv("DB_PORT", "5432")
	user := getEnv("DB_USER", "postgres")
	pass := getEnv("DB_PASSWORD", "postgres")
	dbname := getEnv("DB_NAME", "ahms")
	ssl := getEnv("DB_SSL_MODE", "disable")

	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s", host, port, user, pass, dbname, ssl)
	fmt.Printf("DSN used: %s\n", dsn)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	var patients []Patient
	if err := db.Find(&patients).Error; err != nil {
		log.Fatalf("failed to query patients: %v", err)
	}

	fmt.Println("=== Patients list ===")
	for _, p := range patients {
		fmt.Printf("ID: %s | UHID: %s | Name: %s | Mobile: %s | Active: %t\n", p.ID, p.UHID, p.FullName, p.Mobile, p.IsActive)
	}
}
