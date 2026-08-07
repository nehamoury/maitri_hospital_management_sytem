package utils

import "golang.org/x/crypto/bcrypt"

// HashPassword hashes a plaintext password with bcrypt (cost 12 — a
// deliberate balance between brute-force resistance and login latency).
func HashPassword(plain string) (string, error) {
	hashed, err := bcrypt.GenerateFromPassword([]byte(plain), 12)
	if err != nil {
		return "", err
	}
	return string(hashed), nil
}

// CheckPassword reports whether the plaintext password matches the
// stored bcrypt hash.
func CheckPassword(hash, plain string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(plain))
	return err == nil
}
