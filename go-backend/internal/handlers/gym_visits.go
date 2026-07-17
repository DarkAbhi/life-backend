package handlers

import (
	"net/http"
	"time"
)

type gymVisitListItem struct {
	ID        int64     `json:"id"`
	CreatedAt time.Time `json:"created_at"`
}

// ListGymVisits returns every recorded gym visit, newest first.
func (a *API) ListGymVisits(w http.ResponseWriter, r *http.Request) {
	rows, err := a.DB.Query(`
		SELECT id, created_at
		FROM gym_visits
		ORDER BY created_at DESC, id DESC
	`)
	if err != nil {
		serverError(w, err)
		return
	}
	defer rows.Close()

	visits := make([]gymVisitListItem, 0)
	for rows.Next() {
		var visit gymVisitListItem
		if err := rows.Scan(&visit.ID, &visit.CreatedAt); err != nil {
			serverError(w, err)
			return
		}
		visit.CreatedAt = visit.CreatedAt.UTC()
		visits = append(visits, visit)
	}
	if err := rows.Err(); err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, visits)
}

// DeleteGymVisit removes a visit and its exercises and sets through database cascades.
func (a *API) DeleteGymVisit(w http.ResponseWriter, r *http.Request) {
	visitID, ok := parseID(w, r)
	if !ok {
		return
	}
	result, err := a.DB.Exec(`DELETE FROM gym_visits WHERE id = $1`, visitID)
	if err != nil {
		serverError(w, err)
		return
	}
	deleted, err := result.RowsAffected()
	if err != nil {
		serverError(w, err)
		return
	}
	if deleted == 0 {
		http.NotFound(w, r)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
