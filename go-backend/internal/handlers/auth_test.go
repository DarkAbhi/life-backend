package handlers

import (
	"testing"

	"golang.org/x/crypto/bcrypt"
)

func TestBootstrapPasswordHash(t *testing.T) {
	const bootstrapHash = "$2y$12$bB7WwVq7nGJ4cfNTCX6kQODcNRLQvMjRhIFuH4Qv2.GAxlqNac4/S"
	if err := bcrypt.CompareHashAndPassword([]byte(bootstrapHash), []byte("password")); err != nil {
		t.Fatalf("bootstrap password hash does not match the documented password: %v", err)
	}
}
