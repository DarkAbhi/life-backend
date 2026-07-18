package sport

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/DarkAbhi/life-backend/internal/testhelper"
)

func TestAddSportForDay(t *testing.T) {
	db, shutdown := testhelper.StartPostgres(t)
	defer shutdown()

	h := NewHandler(db)

	// 1. Invalid JSON
	{
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPost, "/sport/today", bytes.NewReader([]byte("{invalid")))
		h.AddSportForDay(rec, req)
		if rec.Code != http.StatusBadRequest {
			t.Errorf("expected 400 Bad Request, got %d", rec.Code)
		}
	}

	// 2. Unsupported sport
	{
		rec := httptest.NewRecorder()
		body, _ := json.Marshal(addSportBody{Sport: "tennis"})
		req := httptest.NewRequest(http.MethodPost, "/sport/today", bytes.NewReader(body))
		h.AddSportForDay(rec, req)
		if rec.Code != http.StatusBadRequest {
			t.Errorf("expected 400 Bad Request, got %d", rec.Code)
		}
	}

	// 3. Supported sport - cricket
	{
		rec := httptest.NewRecorder()
		body, _ := json.Marshal(addSportBody{Sport: "cricket"})
		req := httptest.NewRequest(http.MethodPost, "/sport/today", bytes.NewReader(body))
		h.AddSportForDay(rec, req)

		if rec.Code != http.StatusCreated {
			t.Errorf("expected 201 Created, got %d", rec.Code)
		}

		var out map[string]string
		_ = json.NewDecoder(rec.Body).Decode(&out)
		if out["message"] != "success" {
			t.Errorf("expected message success, got %q", out["message"])
		}

		// Verify entry in DB
		var count int
		err := db.QueryRow(`SELECT COUNT(*) FROM sports WHERE name = 'cricket'`).Scan(&count)
		if err != nil {
			t.Fatalf("failed to query sports: %v", err)
		}
		if count != 1 {
			t.Errorf("expected 1 sport in DB, got %d", count)
		}
	}

	// 4. Supported sport - football
	{
		rec := httptest.NewRecorder()
		body, _ := json.Marshal(addSportBody{Sport: "football"})
		req := httptest.NewRequest(http.MethodPost, "/sport/today", bytes.NewReader(body))
		h.AddSportForDay(rec, req)
		if rec.Code != http.StatusCreated {
			t.Errorf("expected 201 Created, got %d", rec.Code)
		}
	}

	// 5. Supported sport - badminton
	{
		rec := httptest.NewRecorder()
		body, _ := json.Marshal(addSportBody{Sport: "badminton"})
		req := httptest.NewRequest(http.MethodPost, "/sport/today", bytes.NewReader(body))
		h.AddSportForDay(rec, req)
		if rec.Code != http.StatusCreated {
			t.Errorf("expected 201 Created, got %d", rec.Code)
		}
	}
}
