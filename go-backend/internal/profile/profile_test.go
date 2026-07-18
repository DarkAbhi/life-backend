package profile

import (
	"bytes"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/DarkAbhi/life-backend/internal/testhelper"
)

func loginUser(t *testing.T, db *sql.DB) *http.Cookie {
	t.Helper()
	token := "profiletesttoken"
	hash := sha256.Sum256([]byte(token))
	hashStr := hex.EncodeToString(hash[:])
	expiresAt := time.Now().Add(24 * time.Hour)
	_, err := db.Exec(`
		INSERT INTO user_sessions (user_id, token_hash, expires_at)
		VALUES (1, $1, $2)
	`, hashStr, expiresAt)
	if err != nil {
		t.Fatalf("failed to insert session: %v", err)
	}
	return &http.Cookie{
		Name:  "life_session",
		Value: token,
	}
}

func TestGetProfile(t *testing.T) {
	db, shutdown := testhelper.StartPostgres(t)
	defer shutdown()

	h := NewHandler(db)
	cookie := loginUser(t, db)

	// 1. GetProfile when user doesn't have a profile yet
	{
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/profile", nil)
		req.AddCookie(cookie)
		h.GetProfile(rec, req)

		if rec.Code != http.StatusOK {
			t.Errorf("expected 200 OK, got %d", rec.Code)
		}

		var out map[string]any
		_ = json.NewDecoder(rec.Body).Decode(&out)
		if out["has_profile"] != false {
			t.Errorf("expected has_profile to be false, got %v", out["has_profile"])
		}
	}

	// Seed profile
	_, err := db.Exec(`INSERT INTO user_profiles (user_id, display_name) VALUES (1, 'Abhishek')`)
	if err != nil {
		t.Fatalf("failed to seed profile: %v", err)
	}

	// 2. GetProfile when user has setup profile
	{
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/profile", nil)
		req.AddCookie(cookie)
		h.GetProfile(rec, req)

		if rec.Code != http.StatusOK {
			t.Errorf("expected 200 OK, got %d", rec.Code)
		}

		var out map[string]any
		_ = json.NewDecoder(rec.Body).Decode(&out)
		if out["has_profile"] != true {
			t.Errorf("expected has_profile to be true, got %v", out["has_profile"])
		}
		if out["name"] != "Abhishek" {
			t.Errorf("expected name Abhishek, got %v", out["name"])
		}
	}
}

func TestSaveProfile(t *testing.T) {
	db, shutdown := testhelper.StartPostgres(t)
	defer shutdown()

	h := NewHandler(db)
	cookie := loginUser(t, db)

	// 1. Save profile - invalid JSON
	{
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPut, "/profile", bytes.NewReader([]byte("{invalid")))
		req.AddCookie(cookie)
		h.SaveProfile(rec, req)

		if rec.Code != http.StatusBadRequest {
			t.Errorf("expected 400 Bad Request, got %d", rec.Code)
		}
	}

	// 2. Save profile - empty name
	{
		rec := httptest.NewRecorder()
		body, _ := json.Marshal(profileBody{Name: ""})
		req := httptest.NewRequest(http.MethodPut, "/profile", bytes.NewReader(body))
		req.AddCookie(cookie)
		h.SaveProfile(rec, req)

		if rec.Code != http.StatusBadRequest {
			t.Errorf("expected 400 Bad Request, got %d", rec.Code)
		}
	}

	// 3. Save profile - successful create
	{
		rec := httptest.NewRecorder()
		body, _ := json.Marshal(profileBody{Name: "New Name"})
		req := httptest.NewRequest(http.MethodPut, "/profile", bytes.NewReader(body))
		req.AddCookie(cookie)
		h.SaveProfile(rec, req)

		if rec.Code != http.StatusOK {
			t.Errorf("expected 200 OK, got %d", rec.Code)
		}

		var out map[string]string
		_ = json.NewDecoder(rec.Body).Decode(&out)
		if out["name"] != "New Name" {
			t.Errorf("expected name 'New Name', got %q", out["name"])
		}

		// Verify DB entry
		var name string
		err := db.QueryRow(`SELECT display_name FROM user_profiles WHERE user_id = 1`).Scan(&name)
		if err != nil {
			t.Fatalf("failed to query profile: %v", err)
		}
		if name != "New Name" {
			t.Errorf("expected DB profile name 'New Name', got %q", name)
		}
	}

	// 4. Save profile - successful update (on conflict)
	{
		rec := httptest.NewRecorder()
		body, _ := json.Marshal(profileBody{Name: "Updated Name"})
		req := httptest.NewRequest(http.MethodPut, "/profile", bytes.NewReader(body))
		req.AddCookie(cookie)
		h.SaveProfile(rec, req)

		if rec.Code != http.StatusOK {
			t.Errorf("expected 200 OK, got %d", rec.Code)
		}

		var name string
		_ = db.QueryRow(`SELECT display_name FROM user_profiles WHERE user_id = 1`).Scan(&name)
		if name != "Updated Name" {
			t.Errorf("expected updated DB profile name 'Updated Name', got %q", name)
		}
	}
}
