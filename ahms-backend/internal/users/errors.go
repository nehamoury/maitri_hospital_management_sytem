package users

import (
	"errors"
)

// ErrSelfDelete is returned when a user tries to deactivate their own
// login — that would lock them out mid-session.
var ErrSelfDelete = errors.New("you cannot deactivate your own account")

// ErrCannotDeactivateSuperAdmin is returned when an operator tries to
// deactivate the last line of defence Super Admin account.
var ErrCannotDeactivateSuperAdmin = errors.New("the Super Admin account cannot be deactivated")
