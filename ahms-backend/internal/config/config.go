// Package config loads and validates application configuration from
// environment variables (and an optional .env file for local development).
package config

import (
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

// Config holds every environment-driven setting the application needs.
type Config struct {
	AppEnv     string
	ServerPort string

	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string

	RedisAddr     string
	RedisPassword string
	RedisEnabled  bool

	JWTSecret          string
	JWTAccessTokenTTL  time.Duration
	JWTRefreshTokenTTL time.Duration

	AllowedOrigins []string
	UploadDir      string
}

// Load reads configuration from the environment. It attempts to read a
// .env file first (ignored silently if absent, e.g. in production/Docker
// where real environment variables are injected instead).
func Load() (*Config, error) {
	if err := godotenv.Load(); err != nil {
		log.Println("config: no .env file found, relying on process environment variables")
	}

	cfg := &Config{
		AppEnv:     getEnv("APP_ENV", "development"),
		ServerPort: getEnv("SERVER_PORT", "8080"),

		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", ""),
		DBName:     getEnv("DB_NAME", "ahms"),
		DBSSLMode:  getEnv("DB_SSL_MODE", "disable"),

		RedisAddr:     getEnv("REDIS_ADDR", "localhost:6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),
		RedisEnabled:  getEnvBool("REDIS_ENABLED", false),

		JWTSecret: getEnv("JWT_SECRET", ""),
		UploadDir: getEnv("UPLOAD_DIR", "uploads"),
	}

	accessTTLMinutes := getEnvInt("JWT_ACCESS_TOKEN_TTL_MINUTES", 60)
	refreshTTLHours := getEnvInt("JWT_REFRESH_TOKEN_TTL_HOURS", 168) // 7 days

	cfg.JWTAccessTokenTTL = time.Duration(accessTTLMinutes) * time.Minute
	cfg.JWTRefreshTokenTTL = time.Duration(refreshTTLHours) * time.Hour

	origins := getEnv("ALLOWED_ORIGINS", "http://localhost:3000")
	cfg.AllowedOrigins = splitAndTrim(origins)

	if cfg.JWTSecret == "" {
		return nil, fmt.Errorf("config: JWT_SECRET must be set")
	}
	if len(cfg.JWTSecret) < 32 {
		return nil, fmt.Errorf("config: JWT_SECRET must be at least 32 characters long")
	}

	return cfg, nil
}

// DSN builds the PostgreSQL connection string used by GORM's postgres driver.
func (c *Config) DSN() string {
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		c.DBHost, c.DBPort, c.DBUser, c.DBPassword, c.DBName, c.DBSSLMode,
	)
}

// IsProduction reports whether the app is running in the production environment.
func (c *Config) IsProduction() bool {
	return c.AppEnv == "production"
}

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	v, ok := os.LookupEnv(key)
	if !ok || v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		log.Printf("config: invalid int for %s=%q, using fallback %d", key, v, fallback)
		return fallback
	}
	return n
}

func getEnvBool(key string, fallback bool) bool {
	v, ok := os.LookupEnv(key)
	if !ok || v == "" {
		return fallback
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		log.Printf("config: invalid bool for %s=%q, using fallback %v", key, v, fallback)
		return fallback
	}
	return b
}

func splitAndTrim(s string) []string {
	var result []string
	current := ""
	for _, r := range s {
		if r == ',' {
			if trimmed := trimSpace(current); trimmed != "" {
				result = append(result, trimmed)
			}
			current = ""
			continue
		}
		current += string(r)
	}
	if trimmed := trimSpace(current); trimmed != "" {
		result = append(result, trimmed)
	}
	return result
}

func trimSpace(s string) string {
	start := 0
	end := len(s)
	for start < end && (s[start] == ' ' || s[start] == '\t') {
		start++
	}
	for end > start && (s[end-1] == ' ' || s[end-1] == '\t') {
		end--
	}
	return s[start:end]
}
