package auth

import (
	"errors"
	"testing"

	"github.com/ahms/backend/internal/models"
	"github.com/ahms/backend/internal/utils"
	"github.com/google/uuid"
)

type fakeRepo struct {
	user        *models.User
	emailTaken  bool
	setPassword string
}

func (f *fakeRepo) FindActiveUserByEmail(email string) (*models.User, error) {
	if f.user != nil && f.user.Email == email {
		return f.user, nil
	}
	return nil, ErrUserNotFound
}

func (f *fakeRepo) FindUserByID(id string) (*models.User, error) {
	if f.user == nil {
		return nil, ErrUserNotFound
	}
	return f.user, nil
}

func (f *fakeRepo) EmailTaken(email, excludeID string) bool { return f.emailTaken }

func (f *fakeRepo) UpdateProfile(id, fullName, email, mobile string) error {
	if f.user != nil {
		f.user.FullName = fullName
		f.user.Email = email
		f.user.Mobile = mobile
	}
	return nil
}

func (f *fakeRepo) SetPassword(id, hash string) error {
	f.setPassword = hash
	return nil
}

func newTestAuthService(f *fakeRepo) Service {
	return NewService(f, nil, nil)
}

func TestUpdateProfileChangesFields(t *testing.T) {
	fake := &fakeRepo{user: &models.User{
		BaseModel: models.BaseModel{ID: uuid.New()},
		FullName:  "Old Name",
		Email:     "old@ahms.local",
		Mobile:    "1234567890",
	}}
	svc := newTestAuthService(fake)

	resp, err := svc.UpdateProfile(fake.user.ID.String(), UpdateProfileRequest{
		FullName: "New Name",
		Email:    "new@ahms.local",
		Mobile:   "9876543210",
	})
	if err != nil {
		t.Fatalf("update should succeed, got %v", err)
	}
	if resp.FullName != "New Name" || resp.Email != "new@ahms.local" {
		t.Fatalf("expected updated profile, got %+v", resp)
	}
}

func TestUpdateProfileRejectsDuplicateEmail(t *testing.T) {
	fake := &fakeRepo{
		user: &models.User{
			BaseModel: models.BaseModel{ID: uuid.New()},
			FullName:  "A",
			Email:     "a@ahms.local",
		},
		emailTaken: true,
	}
	svc := newTestAuthService(fake)

	_, err := svc.UpdateProfile(fake.user.ID.String(), UpdateProfileRequest{
		FullName: "A",
		Email:    "someone-else@ahms.local",
	})
	if !errors.Is(err, ErrDuplicateEmail) {
		t.Fatalf("expected ErrDuplicateEmail, got %v", err)
	}
}

func TestChangePasswordVerifiesOldPassword(t *testing.T) {
	hash, err := utils.HashPassword("oldpass1")
	if err != nil {
		t.Fatalf("hash should succeed, got %v", err)
	}
	fake := &fakeRepo{user: &models.User{
		BaseModel:    models.BaseModel{ID: uuid.New()},
		PasswordHash: hash,
	}}
	svc := newTestAuthService(fake)

	if err := svc.ChangePassword(fake.user.ID.String(), "wrongpass", "newpass123"); !errors.Is(err, ErrInvalidCredentials) {
		t.Fatalf("expected ErrInvalidCredentials for wrong old password, got %v", err)
	}
	if fake.setPassword != "" {
		t.Fatal("password must not change when old password is wrong")
	}
}

func TestChangePasswordUpdatesHash(t *testing.T) {
	hash, err := utils.HashPassword("oldpass1")
	if err != nil {
		t.Fatalf("hash should succeed, got %v", err)
	}
	fake := &fakeRepo{user: &models.User{
		BaseModel:    models.BaseModel{ID: uuid.New()},
		PasswordHash: hash,
	}}
	svc := newTestAuthService(fake)

	if err := svc.ChangePassword(fake.user.ID.String(), "oldpass1", "newpass123"); err != nil {
		t.Fatalf("change should succeed, got %v", err)
	}
	if fake.setPassword == "" {
		t.Fatal("expected a new hash to be persisted")
	}
}

func TestChangePasswordRejectsShortNewPassword(t *testing.T) {
	hash, _ := utils.HashPassword("oldpass1")
	fake := &fakeRepo{user: &models.User{
		BaseModel:    models.BaseModel{ID: uuid.New()},
		PasswordHash: hash,
	}}
	svc := newTestAuthService(fake)

	if err := svc.ChangePassword(fake.user.ID.String(), "oldpass1", "123"); err == nil {
		t.Fatal("short new password must be rejected")
	}
}
