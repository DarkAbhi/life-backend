package health

import (
	"context"
	"database/sql"
	"net/http"
	"time"

	"github.com/DarkAbhi/life-backend/internal/webutil"
)

type Handler struct {
	DB *sql.DB
}

func NewHandler(db *sql.DB) *Handler {
	return &Handler{DB: db}
}

func (h *Handler) Healthz(w http.ResponseWriter, r *http.Request) {
	webutil.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) Readyz(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()
	if err := h.DB.PingContext(ctx); err != nil {
		webutil.WriteJSON(w, http.StatusServiceUnavailable, map[string]string{"status": "db not ready", "error": err.Error()})
		return
	}
	webutil.WriteJSON(w, http.StatusOK, map[string]string{"status": "ready"})
}
