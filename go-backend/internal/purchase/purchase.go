package purchase

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/DarkAbhi/life-backend/internal/auth"
	"github.com/DarkAbhi/life-backend/internal/timeutil"
	"github.com/DarkAbhi/life-backend/internal/webutil"
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

type Handler struct {
	DB *sql.DB
}

func NewHandler(db *sql.DB) *Handler {
	return &Handler{DB: db}
}

func (h *Handler) NextMonthPurchases(w http.ResponseWriter, r *http.Request) {
	user, err := auth.GetSessionUser(h.DB, r)
	if errors.Is(err, sql.ErrNoRows) {
		webutil.Unauthorized(w, "session is invalid or expired")
		return
	}
	if err != nil {
		webutil.ServerError(w, err)
		return
	}
	month := timeutil.NextMonthDate()
	rows, err := h.DB.Query(`SELECT id,name,price,url FROM next_month_purchases WHERE user_id=$1 AND target_month=$2::date ORDER BY created_at DESC,id DESC`, user.ID, month)
	if err != nil {
		webutil.ServerError(w, err)
		return
	}
	defer rows.Close()
	items := make([]purchaseDTO, 0)
	total := 0.0
	for rows.Next() {
		var item purchaseDTO
		if err := rows.Scan(&item.ID, &item.Name, &item.Price, &item.URL); err != nil {
			webutil.ServerError(w, err)
			return
		}
		total += item.Price
		items = append(items, item)
	}
	webutil.WriteJSON(w, http.StatusOK, map[string]any{"items": items, "total": total})
}

func (h *Handler) CreateNextMonthPurchase(w http.ResponseWriter, r *http.Request) {
	user, err := auth.GetSessionUser(h.DB, r)
	if errors.Is(err, sql.ErrNoRows) {
		webutil.Unauthorized(w, "session is invalid or expired")
		return
	}
	if err != nil {
		webutil.ServerError(w, err)
		return
	}
	var in purchaseInput
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&in); err != nil {
		webutil.BadRequest(w, "invalid JSON")
		return
	}
	in.Name = strings.TrimSpace(in.Name)
	if in.Name == "" || len([]rune(in.Name)) > 160 || in.Price < 0 {
		webutil.BadRequest(w, "name and a valid price are required")
		return
	}
	var item purchaseDTO
	err = h.DB.QueryRow(`INSERT INTO next_month_purchases (user_id,target_month,name,price,url) VALUES ($1,$2::date,$3,$4,$5) RETURNING id,name,price,url`, user.ID, timeutil.NextMonthDate(), in.Name, in.Price, in.URL).Scan(&item.ID, &item.Name, &item.Price, &item.URL)
	if err != nil {
		webutil.ServerError(w, err)
		return
	}
	webutil.WriteJSON(w, http.StatusCreated, item)
}

func (h *Handler) DeleteNextMonthPurchase(w http.ResponseWriter, r *http.Request) {
	user, err := auth.GetSessionUser(h.DB, r)
	if errors.Is(err, sql.ErrNoRows) {
		webutil.Unauthorized(w, "session is invalid or expired")
		return
	}
	if err != nil {
		webutil.ServerError(w, err)
		return
	}

	purchaseID, ok := webutil.ParseID(w, r)
	if !ok {
		return
	}
	result, err := h.DB.Exec(`DELETE FROM next_month_purchases WHERE id=$1 AND user_id=$2 AND target_month=$3::date`, purchaseID, user.ID, timeutil.NextMonthDate())
	if err != nil {
		webutil.ServerError(w, err)
		return
	}
	deleted, err := result.RowsAffected()
	if err != nil {
		webutil.ServerError(w, err)
		return
	}
	if deleted == 0 {
		http.NotFound(w, r)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) ClearNextMonthPurchases(w http.ResponseWriter, r *http.Request) {
	user, err := auth.GetSessionUser(h.DB, r)
	if errors.Is(err, sql.ErrNoRows) {
		webutil.Unauthorized(w, "session is invalid or expired")
		return
	}
	if err != nil {
		webutil.ServerError(w, err)
		return
	}

	if _, err := h.DB.Exec(`DELETE FROM next_month_purchases WHERE user_id=$1 AND target_month=$2::date`, user.ID, timeutil.NextMonthDate()); err != nil {
		webutil.ServerError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
