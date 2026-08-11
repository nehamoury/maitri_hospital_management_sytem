package users

import (
	"errors"
	"testing"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
)

// fakeRepo is an in-memory Repository used to test the service layer
// without a database.
type fakeRepo struct {
	users     map[uuid.UUID]*models.User
	emails    map[string]bool
	mobiles   map[string]bool
	roleIDs   map[uuid.UUID]bool
	superRole uuid.UUID
}

func newFakeRepo() *fakeRepo {
	superRole := uuid.New()
	return &fakeRepo{
		users:     map[uuid.UUID]*models.User{},
		emails:    map[string]bool{},
		mobiles:   map[string]bool{},
		roleIDs:   map[uuid.UUID]bool{superRole: true},
		superRole: superRole,
	}
}

func (f *fakeRepo) Create(u *models.User) error {
	if f.users[u.ID] != nil {
		return errors.New("duplicate id")
	}
	u.ID = uuid.New()
	f.users[u.ID] = u
	f.emails[u.Email] = true
	f.mobiles[u.Mobile] = true
	return nil
}

func (f *fakeRepo) FindAll() ([]models.User, error) {
	out := make([]models.User, 0, len(f.users))
	for _, u := range f.users {
		out = append(out, *u)
	}
	return out, nil
}

func (f *fakeRepo) FindByID(id uuid.UUID) (*models.User, error) {
	if u, ok := f.users[id]; ok {
		return u, nil
	}
	return nil, ErrNotFound
}

func (f *fakeRepo) Update(u *models.User) error {
	if _, ok := f.users[u.ID]; !ok {
		return ErrNotFound
	}
	f.users[u.ID] = u
	return nil
}

func (f *fakeRepo) Delete(id uuid.UUID) error {
	if u, ok := f.users[id]; ok {
		u.IsActive = false
		return nil
	}
	return ErrNotFound
}

func (f *fakeRepo) EmailExists(email string) bool   { return f.emails[email] }
func (f *fakeRepo) MobileExists(mobile string) bool { return f.mobiles[mobile] }
func (f *fakeRepo) RoleExists(roleID uuid.UUID) (bool, error) {
	return f.roleIDs[roleID], nil
}

func validCreateReq(roleID uuid.UUID) CreateUserRequest {
	return CreateUserRequest{
		FullName: "Reception Desk",
		Email:    "reception@ahms.local",
		Mobile:   "9800000001",
		Password: "Staff@123",
		RoleID:   roleID.String(),
	}
}

func warmUp(f *fakeRepo) uuid.UUID {
	id, _ := uuid.Parse("00000000-0000-0000-0000-000000000001")
	existing := &models.User{
		BaseModel:    models.BaseModel{ID: id},
		FullName:     "Existing",
		Email:        "existing@ahms.local",
		Mobile:       "9800000002",
		PasswordHash: "x",
		IsActive:     true,
	}
	f.users[id] = existing
	f.emails[existing.Email] = true
	f.mobiles[existing.Mobile] = true
	return id
}

func TestCreateDuplicateEmail(t *testing.T) {
	f := newFakeRepo()
	id := warmUp(f)
	s := NewService(f)

	req := validCreateReq(f.superRole)
	req.Email = "existing@ahms.local"
	if _, err := s.Create(req); !errors.Is(err, ErrDuplicateEmail) {
		t.Fatalf("expected ErrDuplicateEmail, got %v", err)
	}
	_ = id
}

func TestCreateUnknownRole(t *testing.T) {
	f := newFakeRepo()
	s := NewService(f)

	req := validCreateReq(uuid.New())
	if _, err := s.Create(req); !errors.Is(err, ErrRoleNotFound) {
		t.Fatalf("expected ErrRoleNotFound, got %v", err)
	}
}

func TestCreateSuccess(t *testing.T) {
	f := newFakeRepo()
	s := NewService(f)

	created, err := s.Create(validCreateReq(f.superRole))
	if err != nil {
		t.Fatalf("create failed: %v", err)
	}
	if !created.IsActive {
		t.Fatal("new user should be active")
	}
	if !f.emails[validCreateReq(f.superRole).Email] {
		t.Fatal("email should be registered")
	}
}

func TestDeleteSelfRejected(t *testing.T) {
	f := newFakeRepo()
	id := warmUp(f)
	s := NewService(f)

	if err := s.Delete(id, id); !errors.Is(err, ErrSelfDelete) {
		t.Fatalf("expected ErrSelfDelete, got %v", err)
	}
}

func TestDeleteSuperAdminRejected(t *testing.T) {
	f := newFakeRepo()
	actingID := uuid.New()
	super := &models.User{
		BaseModel: models.BaseModel{ID: actingID},
		FullName:  "Boss",
		Email:     "boss@ahms.local",
		Mobile:    "9800000009",
		RoleID:    f.superRole,
		Role:      models.Role{Name: models.RoleSuperAdmin},
	}
	f.users[actingID] = super
	f.emails[super.Email] = true
	f.mobiles[super.Mobile] = true

	s := NewService(f)
	if err := s.Delete(actingID, uuid.New()); !errors.Is(err, ErrCannotDeactivateSuperAdmin) {
		t.Fatalf("expected ErrCannotDeactivateSuperAdmin, got %v", err)
	}
}

func TestUpdateResetsPassword(t *testing.T) {
	f := newFakeRepo()
	id := warmUp(f)
	s := NewService(f)

	req := UpdateUserRequest{
		FullName: "Renamed",
		Email:    "existing@ahms.local",
		Mobile:   "9800000002",
		RoleID:   f.superRole.String(),
		IsActive: boolPtr(true),
		Password: "NewPass@123",
	}
	before := f.users[id].PasswordHash
	updated, err := s.Update(id, req)
	if err != nil {
		t.Fatalf("update failed: %v", err)
	}
	if updated.PasswordHash == before {
		t.Fatal("password hash should change after reset")
	}
	if updated.FullName != "Renamed" {
		t.Fatalf("expected renamed user, got %q", updated.FullName)
	}
}

func boolPtr(b bool) *bool { return &b }
