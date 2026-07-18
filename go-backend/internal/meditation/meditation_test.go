package meditation

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/DarkAbhi/life-backend/internal/testhelper"
	"github.com/DarkAbhi/life-backend/internal/timeutil"
)

func TestAddMeditationForDay(t *testing.T) {
	db, shutdown := testhelper.StartPostgres(t)
	defer shutdown()

	h := NewHandler(db)

	// 1. Success on first meditation
	{
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPost, "/meditation/today", nil)
		h.AddMeditationForDay(rec, req)

		if rec.Code != http.StatusCreated {
			t.Errorf("expected 201 Created, got %d", rec.Code)
		}

		var out map[string]string
		_ = json.NewDecoder(rec.Body).Decode(&out)
		if out["message"] != "success" {
			t.Errorf("expected message success, got %q", out["message"])
		}

		// Verify count in DB
		start, end := timeutil.DayBoundsIndia(time.Now().UTC())
		var count int
		err := db.QueryRow(`
			SELECT COUNT(*) FROM meditations
			WHERE created_at >= $1 AND created_at < $2
		`, start, end).Scan(&count)
		if err != nil {
			t.Fatalf("failed to query meditations: %v", err)
		}
		if count != 1 {
			t.Errorf("expected 1 meditation entry in DB, got %d", count)
		}
	}

	// 2. Failure on duplicate meditation for same day
	{
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPost, "/meditation/today", nil)
		h.AddMeditationForDay(rec, req)

		if rec.Code != http.StatusBadRequest {
			t.Errorf("expected 400 Bad Request on duplicate, got %d", rec.Code)
		}

		var out map[string]string
		_ = json.NewDecoder(rec.Body).Decode(&out)
		if out["error"] != "You have already meditated today." {
			t.Errorf("expected duplicate error message, got %q", out["error"])
		}
	}
}
