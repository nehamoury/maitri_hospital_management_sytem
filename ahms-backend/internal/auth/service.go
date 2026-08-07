package auth

import (
	"errors"
	"time"

	"github.com/ahms/backend/internal/middleware"
	"github.com/ahms/backend/internal/models"
	"github.com/ahms/backend/internal/utils"
)

// ErrInvalidCredentials is returned for any wrong email/password
// combination. It is deliberately identical whether the email doesn't
// exist or the password is wrong, so the API never reveals which one
// failed (prevents user enumeration).
var ErrInvalidCredentials = errors.New("invalid email or password")

// Service contains authentication business logic, independent of the
// HTTP layer.
type Service interface {
	Login(email, password string) (*LoginResponse, error)
	Refresh(refreshToken string) (*LoginResponse, error)
	CurrentUser(id string) (*UserResponse, error)
	Logout(accessToken string)
}

type service struct {
	repo       Repository
	jwtManager *utils.JWTManager
	blacklist  *middleware.TokenBlacklist
}

// NewService builds a Service.
func NewService(repo Repository, jwtManager *utils.JWTManager, blacklist *middleware.TokenBlacklist) Service {
	return &service{repo: repo, jwtManager: jwtManager, blacklist: blacklist}
}

func (s *service) Login(email, password string) (*LoginResponse, error) {
	user, err := s.repo.FindActiveUserByEmail(email)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}

	if !utils.CheckPassword(user.PasswordHash, password) {
		return nil, ErrInvalidCredentials
	}

	return s.issueTokens(user)
}

func (s *service) Refresh(refreshToken string) (*LoginResponse, error) {
	claims, err := s.jwtManager.Parse(refreshToken)
	if err != nil {
		return nil, utils.ErrInvalidToken
	}
	if claims.TokenType != "refresh" {
		return nil, utils.ErrInvalidToken
	}

	user, err := s.repo.FindUserByID(claims.UserID.String())
	if err != nil {
		return nil, utils.ErrInvalidToken
	}

	return s.issueTokens(user)
}

func (s *service) CurrentUser(id string) (*UserResponse, error) {
	user, err := s.repo.FindUserByID(id)
	if err != nil {
		return nil, err
	}
	return toUserResponse(user), nil
}

func (s *service) Logout(accessToken string) {
	s.blacklist.Add(accessToken, 60*time.Minute)
}

func (s *service) issueTokens(user *models.User) (*LoginResponse, error) {
	accessToken, err := s.jwtManager.GenerateAccessToken(user.ID, user.Email, user.Role.Name)
	if err != nil {
		return nil, err
	}
	refreshToken, err := s.jwtManager.GenerateRefreshToken(user.ID, user.Email, user.Role.Name)
	if err != nil {
		return nil, err
	}

	return &LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    3600,
		User:         *toUserResponse(user),
	}, nil
}

func toUserResponse(user *models.User) *UserResponse {
	permissions := make([]string, 0, len(user.Role.Permissions))
	for _, p := range user.Role.Permissions {
		permissions = append(permissions, p.Name)
	}
	return &UserResponse{
		ID:          user.ID.String(),
		FullName:    user.FullName,
		Email:       user.Email,
		Mobile:      user.Mobile,
		RoleName:    user.Role.Name,
		Permissions: permissions,
	}
}
