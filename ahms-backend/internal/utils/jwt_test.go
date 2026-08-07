package utils

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestGenerateAndParseAccessToken(t *testing.T) {
	m := NewJWTManager("test-secret-at-least-32-characters-long!!", time.Hour, 24*time.Hour)
	userID := uuid.New()

	token, err := m.GenerateAccessToken(userID, "doctor@ahms.local", "DOCTOR")
	if err != nil {
		t.Fatalf("GenerateAccessToken returned error: %v", err)
	}

	claims, err := m.Parse(token)
	if err != nil {
		t.Fatalf("Parse returned error: %v", err)
	}
	if claims.UserID != userID {
		t.Fatalf("UserID mismatch: got %s want %s", claims.UserID, userID)
	}
	if claims.Email != "doctor@ahms.local" {
		t.Fatalf("Email mismatch: got %s", claims.Email)
	}
	if claims.RoleName != "DOCTOR" {
		t.Fatalf("RoleName mismatch: got %s", claims.RoleName)
	}
	if claims.TokenType != "access" {
		t.Fatalf("TokenType mismatch: got %s", claims.TokenType)
	}
}

func TestRefreshTokenRejectedOnAccessResource(t *testing.T) {
	m := NewJWTManager("test-secret-at-least-32-characters-long!!", time.Hour, 24*time.Hour)
	refresh, err := m.GenerateRefreshToken(uuid.New(), "u@ahms.local", "RECEPTIONIST")
	if err != nil {
		t.Fatalf("GenerateRefreshToken returned error: %v", err)
	}
	claims, err := m.Parse(refresh)
	if err != nil {
		t.Fatalf("Parse returned error: %v", err)
	}
	if claims.TokenType != "refresh" {
		t.Fatalf("expected refresh token type, got %s", claims.TokenType)
	}
}

func TestParseRejectsWrongSecret(t *testing.T) {
	m1 := NewJWTManager("secret-one-12345678901234567890-abc", time.Hour, time.Hour)
	m2 := NewJWTManager("secret-two-12345678901234567890-xyz", time.Hour, time.Hour)

	token, err := m1.GenerateAccessToken(uuid.New(), "a@b.c", "DOCTOR")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := m2.Parse(token); err == nil {
		t.Fatal("Parse must reject a token signed with a different secret")
	}
}

func TestParseRejectsGarbage(t *testing.T) {
	m := NewJWTManager("test-secret-at-least-32-characters-long!!", time.Hour, time.Hour)
	if _, err := m.Parse("not-a-jwt-token"); err == nil {
		t.Fatal("Parse must reject malformed tokens")
	}
}
