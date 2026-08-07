package utils

import "testing"

func TestHashAndCheckPassword(t *testing.T) {
	hash, err := HashPassword("S3cret#Pass")
	if err != nil {
		t.Fatalf("HashPassword returned error: %v", err)
	}
	if hash == "" {
		t.Fatal("HashPassword returned empty hash")
	}
	if hash == "S3cret#Pass" {
		t.Fatal("hash must never equal the plaintext password")
	}
	if !CheckPassword(hash, "S3cret#Pass") {
		t.Fatal("CheckPassword should accept the correct plaintext")
	}
	if CheckPassword(hash, "WrongPass") {
		t.Fatal("CheckPassword must reject an incorrect plaintext")
	}
	if CheckPassword(hash, "") {
		t.Fatal("CheckPassword must reject an empty password")
	}
}

func TestHashPasswordProducesDifferentSalt(t *testing.T) {
	h1, _ := HashPassword("same-password")
	h2, _ := HashPassword("same-password")
	if h1 == h2 {
		t.Fatal("bcrypt should use a random salt so hashes differ")
	}
}
