package handlers

import (
	"database/sql"
	"errors"
	"net/http"
	"strconv"
)

type notificationDTO struct {
	ID         int64   `json:"id"`
	Source     string  `json:"source"`
	Title      string  `json:"title"`
	Body       *string `json:"body"`
	TargetPath *string `json:"target_path"`
	Priority   int     `json:"priority"`
	CreatedAt  string  `json:"created_at"`
}

func (a *API) ListNotifications(w http.ResponseWriter, r *http.Request) {
	user, ok := a.notificationUser(w, r)
	if !ok {
		return
	}

	limit := 100
	if rawLimit := r.URL.Query().Get("limit"); rawLimit != "" {
		parsedLimit, err := strconv.Atoi(rawLimit)
		if err != nil || parsedLimit < 1 || parsedLimit > 100 {
			badRequest(w, "limit must be between 1 and 100")
			return
		}
		limit = parsedLimit
	}

	rows, err := a.DB.Query(`
		SELECT id, source, title, body, target_path, priority, created_at
		FROM notifications
		WHERE user_id = $1 AND dismissed_at IS NULL
		ORDER BY created_at DESC, id DESC
		LIMIT $2
	`, user.ID, limit)
	if err != nil {
		serverError(w, err)
		return
	}
	defer rows.Close()

	notifications := make([]notificationDTO, 0)
	for rows.Next() {
		var notification notificationDTO
		var createdAt sql.NullTime
		if err := rows.Scan(
			&notification.ID,
			&notification.Source,
			&notification.Title,
			&notification.Body,
			&notification.TargetPath,
			&notification.Priority,
			&createdAt,
		); err != nil {
			serverError(w, err)
			return
		}
		if createdAt.Valid {
			notification.CreatedAt = createdAt.Time.UTC().Format("2006-01-02T15:04:05Z")
		}
		notifications = append(notifications, notification)
	}
	if err := rows.Err(); err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, notifications)
}

func (a *API) DismissNotification(w http.ResponseWriter, r *http.Request) {
	user, ok := a.notificationUser(w, r)
	if !ok {
		return
	}
	notificationID, ok := parseID(w, r)
	if !ok {
		return
	}

	result, err := a.DB.Exec(`
		UPDATE notifications
		SET dismissed_at = NOW()
		WHERE id = $1 AND user_id = $2 AND dismissed_at IS NULL
	`, notificationID, user.ID)
	if err != nil {
		serverError(w, err)
		return
	}
	updated, err := result.RowsAffected()
	if err != nil {
		serverError(w, err)
		return
	}
	if updated == 0 {
		http.NotFound(w, r)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) ClearNotifications(w http.ResponseWriter, r *http.Request) {
	user, ok := a.notificationUser(w, r)
	if !ok {
		return
	}
	if _, err := a.DB.Exec(`
		UPDATE notifications
		SET dismissed_at = NOW()
		WHERE user_id = $1 AND dismissed_at IS NULL
	`, user.ID); err != nil {
		serverError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) notificationUser(w http.ResponseWriter, r *http.Request) (sessionUser, bool) {
	user, err := a.sessionUser(r)
	if errors.Is(err, sql.ErrNoRows) {
		unauthorized(w, "session is invalid or expired")
		return sessionUser{}, false
	}
	if err != nil {
		serverError(w, err)
		return sessionUser{}, false
	}
	return user, true
}
