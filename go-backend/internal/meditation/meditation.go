package meditation

import (
	"database/sql"
	"errors"
	"net/http"
	"time"

	"github.com/DarkAbhi/life-backend/internal/timeutil"
	"github.com/DarkAbhi/life-backend/internal/webutil"
)

type Handler struct {
	DB *sql.DB
}

func NewHandler(db *sql.DB) *Handler {
	return &Handler{DB: db}
}

// AddMeditationForDay records a meditation session for today.
func (h *Handler) AddMeditationForDay(w http.ResponseWriter, r *http.Request) {
	start, end := timeutil.DayBoundsIndia(time.Now().UTC())
	const q = `
		SELECT 1 FROM meditations
		WHERE created_at >= $1 AND created_at < $2
		LIMIT 1;
	`
	var dummy int
	err := h.DB.QueryRow(q, start, end).Scan(&dummy)
	switch {
	case err == nil:
		webutil.BadRequest(w, "You have already meditated today.")
		return
	case errors.Is(err, sql.ErrNoRows):
		_, err := h.DB.Exec(`INSERT INTO meditations DEFAULT VALUES;`)
		if err != nil {
			webutil.ServerError(w, err)
			return
		}
		webutil.WriteJSON(w, http.StatusCreated, map[string]string{"message": "success"})
		return
	default:
		webutil.ServerError(w, err)
		return
	}
}
