package profile

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/DarkAbhi/life-backend/internal/auth"
	"github.com/DarkAbhi/life-backend/internal/webutil"
)

type profileBody struct {
	Name string `json:"name"`
}

type Handler struct {
	DB *sql.DB
}

func NewHandler(db *sql.DB) *Handler {
	return &Handler{DB: db}
}

// GetProfile reports whether the signed-in user has completed first-run setup.
func (h *Handler) GetProfile(w http.ResponseWriter, r *http.Request) {
	user, err := auth.GetSessionUser(h.DB, r)
	if errors.Is(err, sql.ErrNoRows) {
		webutil.Unauthorized(w, "session is invalid or expired")
		return
	}
	if err != nil {
		webutil.ServerError(w, err)
		return
	}

	var name string
	err = h.DB.QueryRow(
		`SELECT display_name FROM user_profiles WHERE user_id = $1`,
		user.ID,
	).Scan(&name)
	if errors.Is(err, sql.ErrNoRows) {
		webutil.WriteJSON(w, http.StatusOK, map[string]any{"has_profile": false})
		return
	}
	if err != nil {
		webutil.ServerError(w, err)
		return
	}
	webutil.WriteJSON(w, http.StatusOK, map[string]any{"has_profile": true, "name": name})
}

// SaveProfile creates or updates the signed-in user's profile.
func (h *Handler) SaveProfile(w http.ResponseWriter, r *http.Request) {
	user, err := auth.GetSessionUser(h.DB, r)
	if errors.Is(err, sql.ErrNoRows) {
		webutil.Unauthorized(w, "session is invalid or expired")
		return
	}
	if err != nil {
		webutil.ServerError(w, err)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	defer r.Body.Close()
	var body profileBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		webutil.BadRequest(w, "invalid JSON")
		return
	}

	name := strings.TrimSpace(body.Name)
	if name == "" || len([]rune(name)) > 120 {
		webutil.BadRequest(w, "name must be between 1 and 120 characters")
		return
	}

	_, err = h.DB.Exec(`
		INSERT INTO user_profiles (user_id, display_name)
		VALUES ($1, $2)
		ON CONFLICT (user_id)
		DO UPDATE SET display_name = EXCLUDED.display_name, updated_at = NOW()
	`, user.ID, name)
	if err != nil {
		webutil.ServerError(w, err)
		return
	}
	webutil.WriteJSON(w, http.StatusOK, map[string]string{"name": name})
}
