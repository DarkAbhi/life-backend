package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"
)

type purchaseInput struct {
	Name  string  `json:"name"`
	Price float64 `json:"price"`
	URL   *string `json:"url"`
}
type purchaseDTO struct {
	ID    int64   `json:"id"`
	Name  string  `json:"name"`
	Price float64 `json:"price"`
	URL   *string `json:"url"`
}

func nextMonthDate() string {
	location, err := time.LoadLocation(indiaTimeZone)
	if err != nil {
		location = time.UTC
	}
	if location == nil {
		location = time.UTC
	}
	now := time.Now().UTC().In(location)
	return time.Date(now.Year(), now.Month()+1, 1, 0, 0, 0, 0, location).Format("2006-01-02")
}
func (a *API) NextMonthPurchases(w http.ResponseWriter, r *http.Request) {
	user, err := a.sessionUser(r)
	if errors.Is(err, sql.ErrNoRows) {
		unauthorized(w, "session is invalid or expired")
		return
	}
	if err != nil {
		serverError(w, err)
		return
	}
	month := nextMonthDate()
	rows, err := a.DB.Query(`SELECT id,name,price,url FROM next_month_purchases WHERE user_id=$1 AND target_month=$2::date ORDER BY created_at DESC,id DESC`, user.ID, month)
	if err != nil {
		serverError(w, err)
		return
	}
	defer rows.Close()
	items := make([]purchaseDTO, 0)
	total := 0.0
	for rows.Next() {
		var item purchaseDTO
		if err := rows.Scan(&item.ID, &item.Name, &item.Price, &item.URL); err != nil {
			serverError(w, err)
			return
		}
		total += item.Price
		items = append(items, item)
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items, "total": total})
}
func (a *API) CreateNextMonthPurchase(w http.ResponseWriter, r *http.Request) {
	user, err := a.sessionUser(r)
	if errors.Is(err, sql.ErrNoRows) {
		unauthorized(w, "session is invalid or expired")
		return
	}
	if err != nil {
		serverError(w, err)
		return
	}
	var in purchaseInput
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&in); err != nil {
		badRequest(w, "invalid JSON")
		return
	}
	in.Name = strings.TrimSpace(in.Name)
	if in.Name == "" || len([]rune(in.Name)) > 160 || in.Price < 0 {
		badRequest(w, "name and a valid price are required")
		return
	}
	var item purchaseDTO
	err = a.DB.QueryRow(`INSERT INTO next_month_purchases (user_id,target_month,name,price,url) VALUES ($1,$2::date,$3,$4,$5) RETURNING id,name,price,url`, user.ID, nextMonthDate(), in.Name, in.Price, in.URL).Scan(&item.ID, &item.Name, &item.Price, &item.URL)
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, item)
}

// DeleteNextMonthPurchase removes one purchase from the upcoming month's list.
func (a *API) DeleteNextMonthPurchase(w http.ResponseWriter, r *http.Request) {
	user, err := a.sessionUser(r)
	if errors.Is(err, sql.ErrNoRows) {
		unauthorized(w, "session is invalid or expired")
		return
	}
	if err != nil {
		serverError(w, err)
		return
	}

	purchaseID, ok := parseID(w, r)
	if !ok {
		return
	}
	result, err := a.DB.Exec(`DELETE FROM next_month_purchases WHERE id=$1 AND user_id=$2 AND target_month=$3::date`, purchaseID, user.ID, nextMonthDate())
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

// ClearNextMonthPurchases removes all purchases planned for the upcoming month.
func (a *API) ClearNextMonthPurchases(w http.ResponseWriter, r *http.Request) {
	user, err := a.sessionUser(r)
	if errors.Is(err, sql.ErrNoRows) {
		unauthorized(w, "session is invalid or expired")
		return
	}
	if err != nil {
		serverError(w, err)
		return
	}

	if _, err := a.DB.Exec(`DELETE FROM next_month_purchases WHERE user_id=$1 AND target_month=$2::date`, user.ID, nextMonthDate()); err != nil {
		serverError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
