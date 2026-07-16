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

func nextMonthStart() time.Time {
	location, _ := time.LoadLocation("Asia/Kolkata")
	if location == nil {
		location = time.UTC
	}
	now := time.Now().In(location)
	return time.Date(now.Year(), now.Month()+1, 1, 0, 0, 0, 0, location)
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
	month := nextMonthStart()
	rows, err := a.DB.Query(`SELECT id,name,price,url FROM next_month_purchases WHERE user_id=$1 AND target_month=$2 ORDER BY created_at DESC,id DESC`, user.ID, month)
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
	err = a.DB.QueryRow(`INSERT INTO next_month_purchases (user_id,target_month,name,price,url) VALUES ($1,$2,$3,$4,$5) RETURNING id,name,price,url`, user.ID, nextMonthStart(), in.Name, in.Price, in.URL).Scan(&item.ID, &item.Name, &item.Price, &item.URL)
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, item)
}
