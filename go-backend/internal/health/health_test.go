package health

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/DarkAbhi/life-backend/internal/testhelper"
)

func TestHealthz(t *testing.T) {
	h := NewHandler(nil)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)

	h.Healthz(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
}

func TestReadyz(t *testing.T) {
	db, shutdown := testhelper.StartPostgres(t)
	defer shutdown()

	h := NewHandler(db)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/readyz", nil)

	h.Readyz(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
}
