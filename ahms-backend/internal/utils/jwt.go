package utils

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// ErrInvalidToken is returned for any token that fails signature
// verification, is expired, or has a malformed/missing claim.
var ErrInvalidToken = errors.New("invalid or expired token")

// Claims is the JWT payload AHMS issues. RoleName is embedded directly
// (rather than requiring a DB lookup on every request) so middleware can
// authorize requests using only the token.
type Claims struct {
	UserID    uuid.UUID `json:"user_id"`
	Email     string    `json:"email"`
	RoleName  string    `json:"role_name"`
	TokenType string    `json:"token_type"` // "access" or "refresh"
	jwt.RegisteredClaims
}

// JWTManager issues and validates access/refresh tokens using a single
// HMAC secret.
type JWTManager struct {
	secret     []byte
	accessTTL  time.Duration
	refreshTTL time.Duration
	issuer     string
}

// NewJWTManager builds a JWTManager from the given secret and TTLs.
func NewJWTManager(secret string, accessTTL, refreshTTL time.Duration) *JWTManager {
	return &JWTManager{
		secret:     []byte(secret),
		accessTTL:  accessTTL,
		refreshTTL: refreshTTL,
		issuer:     "ahms-backend",
	}
}

// GenerateAccessToken creates a short-lived token used to authorize API
// requests.
func (m *JWTManager) GenerateAccessToken(userID uuid.UUID, email, roleName string) (string, error) {
	return m.generate(userID, email, roleName, "access", m.accessTTL)
}

// GenerateRefreshToken creates a long-lived token used only to obtain a
// new access token.
func (m *JWTManager) GenerateRefreshToken(userID uuid.UUID, email, roleName string) (string, error) {
	return m.generate(userID, email, roleName, "refresh", m.refreshTTL)
}

func (m *JWTManager) generate(userID uuid.UUID, email, roleName, tokenType string, ttl time.Duration) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID:    userID,
		Email:     email,
		RoleName:  roleName,
		TokenType: tokenType,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    m.issuer,
			Subject:   userID.String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(m.secret)
}

// Parse validates a token's signature and expiry and returns its claims.
func (m *JWTManager) Parse(tokenString string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return m.secret, nil
	})
	if err != nil || !token.Valid {
		return nil, ErrInvalidToken
	}
	return claims, nil
}
