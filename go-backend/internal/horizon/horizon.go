package horizon

import (
	"database/sql"
	"encoding/json"
	"errors"
	"math"
	"net/http"
	"strings"

	"github.com/DarkAbhi/life-backend/internal/auth"
	"github.com/DarkAbhi/life-backend/internal/webutil"
)

type ConfigInput struct {
	BaseAmount float64 `json:"base_amount"`
	Currency   *string `json:"currency"`
}

type ConfigDTO struct {
	BaseAmount float64 `json:"base_amount"`
	Currency   string  `json:"currency"`
}

type DeductionInput struct {
	Name     string  `json:"name"`
	Category string  `json:"category"`
	Amount   float64 `json:"amount"`
	DueDay   *int    `json:"due_day"`
	IsActive *bool   `json:"is_active"`
}

type DeductionDTO struct {
	ID       int64   `json:"id"`
	Name     string  `json:"name"`
	Category string  `json:"category"`
	Amount   float64 `json:"amount"`
	DueDay   *int    `json:"due_day"`
	IsActive bool    `json:"is_active"`
}

type ProjectionDTO struct {
	Months                int     `json:"months"`
	Label                 string  `json:"label"`
	CumulativeUncommitted float64 `json:"cumulative_uncommitted"`
}

type HorizonSummaryDTO struct {
	BaseAmount      float64         `json:"base_amount"`
	Currency        string          `json:"currency"`
	TotalDeductions float64         `json:"total_deductions"`
	RemainingAmount float64         `json:"remaining_amount"`
	CommittedRatio  float64         `json:"committed_ratio"`
	Deductions      []DeductionDTO  `json:"deductions"`
	Projections     []ProjectionDTO `json:"projections"`
}

type Handler struct {
	DB *sql.DB
}

func NewHandler(db *sql.DB) *Handler {
	return &Handler{DB: db}
}

var validCategories = map[string]bool{
	"housing":      true,
	"investment":   true,
	"bill":         true,
	"subscription": true,
	"debt":         true,
	"other":        true,
}

func (h *Handler) GetHorizon(w http.ResponseWriter, r *http.Request) {
	user, err := auth.GetSessionUser(h.DB, r)
	if errors.Is(err, sql.ErrNoRows) {
		webutil.Unauthorized(w, "session is invalid or expired")
		return
	}
	if err != nil {
		webutil.ServerError(w, err)
		return
	}

	summary, err := h.fetchHorizonSummary(user.ID)
	if err != nil {
		webutil.ServerError(w, err)
		return
	}

	webutil.WriteJSON(w, http.StatusOK, summary)
}

func (h *Handler) fetchHorizonSummary(userID int64) (*HorizonSummaryDTO, error) {
	var baseAmount float64
	var currency string

	err := h.DB.QueryRow(`SELECT base_amount, currency FROM financial_horizon_configs WHERE user_id = $1`, userID).Scan(&baseAmount, &currency)
	if errors.Is(err, sql.ErrNoRows) {
		baseAmount = 0
		currency = "₹"
	} else if err != nil {
		return nil, err
	}

	rows, err := h.DB.Query(`SELECT id, name, category, amount, due_day, is_active FROM financial_horizon_deductions WHERE user_id = $1 ORDER BY is_active DESC, created_at DESC, id DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	deductions := make([]DeductionDTO, 0)
	var totalDeductions float64

	for rows.Next() {
		var item DeductionDTO
		var dueDay sql.NullInt64
		if err := rows.Scan(&item.ID, &item.Name, &item.Category, &item.Amount, &dueDay, &item.IsActive); err != nil {
			return nil, err
		}
		if dueDay.Valid {
			d := int(dueDay.Int64)
			item.DueDay = &d
		}
		if item.IsActive {
			totalDeductions += item.Amount
		}
		deductions = append(deductions, item)
	}

	remainingAmount := baseAmount - totalDeductions
	var committedRatio float64
	if baseAmount > 0 {
		committedRatio = math.Round((totalDeductions/baseAmount)*10000) / 100
	}

	projections := []ProjectionDTO{
		{Months: 3, Label: "3 Months", CumulativeUncommitted: math.Max(0, remainingAmount*3)},
		{Months: 6, Label: "6 Months", CumulativeUncommitted: math.Max(0, remainingAmount*6)},
		{Months: 12, Label: "1 Year", CumulativeUncommitted: math.Max(0, remainingAmount*12)},
	}

	return &HorizonSummaryDTO{
		BaseAmount:      baseAmount,
		Currency:        currency,
		TotalDeductions: totalDeductions,
		RemainingAmount: remainingAmount,
		CommittedRatio:  committedRatio,
		Deductions:      deductions,
		Projections:     projections,
	}, nil
}

func (h *Handler) UpdateConfig(w http.ResponseWriter, r *http.Request) {
	user, err := auth.GetSessionUser(h.DB, r)
	if errors.Is(err, sql.ErrNoRows) {
		webutil.Unauthorized(w, "session is invalid or expired")
		return
	}
	if err != nil {
		webutil.ServerError(w, err)
		return
	}

	var in ConfigInput
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&in); err != nil {
		webutil.BadRequest(w, "invalid JSON")
		return
	}

	if in.BaseAmount < 0 {
		webutil.BadRequest(w, "base amount cannot be negative")
		return
	}

	currency := "₹"
	if in.Currency != nil && strings.TrimSpace(*in.Currency) != "" {
		currency = strings.TrimSpace(*in.Currency)
	}

	_, err = h.DB.Exec(`
		INSERT INTO financial_horizon_configs (user_id, base_amount, currency, updated_at)
		VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
		ON CONFLICT (user_id) DO UPDATE
		SET base_amount = EXCLUDED.base_amount, currency = EXCLUDED.currency, updated_at = CURRENT_TIMESTAMP
	`, user.ID, in.BaseAmount, currency)

	if err != nil {
		webutil.ServerError(w, err)
		return
	}

	summary, err := h.fetchHorizonSummary(user.ID)
	if err != nil {
		webutil.ServerError(w, err)
		return
	}

	webutil.WriteJSON(w, http.StatusOK, summary)
}

func (h *Handler) CreateDeduction(w http.ResponseWriter, r *http.Request) {
	user, err := auth.GetSessionUser(h.DB, r)
	if errors.Is(err, sql.ErrNoRows) {
		webutil.Unauthorized(w, "session is invalid or expired")
		return
	}
	if err != nil {
		webutil.ServerError(w, err)
		return
	}

	var in DeductionInput
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&in); err != nil {
		webutil.BadRequest(w, "invalid JSON")
		return
	}

	in.Name = strings.TrimSpace(in.Name)
	if in.Name == "" || len([]rune(in.Name)) > 160 {
		webutil.BadRequest(w, "name is required and must be under 160 characters")
		return
	}

	if in.Amount < 0 {
		webutil.BadRequest(w, "amount cannot be negative")
		return
	}

	category := strings.ToLower(strings.TrimSpace(in.Category))
	if !validCategories[category] {
		category = "bill"
	}

	if in.DueDay != nil && (*in.DueDay < 1 || *in.DueDay > 31) {
		webutil.BadRequest(w, "due day must be between 1 and 31")
		return
	}

	isActive := true
	if in.IsActive != nil {
		isActive = *in.IsActive
	}

	var item DeductionDTO
	var dueDay sql.NullInt64
	if in.DueDay != nil {
		dueDay = sql.NullInt64{Int64: int64(*in.DueDay), Valid: true}
	}

	err = h.DB.QueryRow(`
		INSERT INTO financial_horizon_deductions (user_id, name, category, amount, due_day, is_active)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, name, category, amount, due_day, is_active
	`, user.ID, in.Name, category, in.Amount, dueDay, isActive).Scan(&item.ID, &item.Name, &item.Category, &item.Amount, &dueDay, &item.IsActive)

	if err != nil {
		webutil.ServerError(w, err)
		return
	}

	if dueDay.Valid {
		d := int(dueDay.Int64)
		item.DueDay = &d
	}

	webutil.WriteJSON(w, http.StatusCreated, item)
}

func (h *Handler) UpdateDeduction(w http.ResponseWriter, r *http.Request) {
	user, err := auth.GetSessionUser(h.DB, r)
	if errors.Is(err, sql.ErrNoRows) {
		webutil.Unauthorized(w, "session is invalid or expired")
		return
	}
	if err != nil {
		webutil.ServerError(w, err)
		return
	}

	deductionID, ok := webutil.ParseID(w, r)
	if !ok {
		return
	}

	var in DeductionInput
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&in); err != nil {
		webutil.BadRequest(w, "invalid JSON")
		return
	}

	in.Name = strings.TrimSpace(in.Name)
	if in.Name == "" || len([]rune(in.Name)) > 160 {
		webutil.BadRequest(w, "name is required and must be under 160 characters")
		return
	}

	if in.Amount < 0 {
		webutil.BadRequest(w, "amount cannot be negative")
		return
	}

	category := strings.ToLower(strings.TrimSpace(in.Category))
	if !validCategories[category] {
		category = "bill"
	}

	if in.DueDay != nil && (*in.DueDay < 1 || *in.DueDay > 31) {
		webutil.BadRequest(w, "due day must be between 1 and 31")
		return
	}

	isActive := true
	if in.IsActive != nil {
		isActive = *in.IsActive
	}

	var item DeductionDTO
	var dueDay sql.NullInt64
	if in.DueDay != nil {
		dueDay = sql.NullInt64{Int64: int64(*in.DueDay), Valid: true}
	}

	err = h.DB.QueryRow(`
		UPDATE financial_horizon_deductions
		SET name = $1, category = $2, amount = $3, due_day = $4, is_active = $5, updated_at = CURRENT_TIMESTAMP
		WHERE id = $6 AND user_id = $7
		RETURNING id, name, category, amount, due_day, is_active
	`, in.Name, category, in.Amount, dueDay, isActive, deductionID, user.ID).Scan(&item.ID, &item.Name, &item.Category, &item.Amount, &dueDay, &item.IsActive)

	if errors.Is(err, sql.ErrNoRows) {
		http.NotFound(w, r)
		return
	}
	if err != nil {
		webutil.ServerError(w, err)
		return
	}

	if dueDay.Valid {
		d := int(dueDay.Int64)
		item.DueDay = &d
	}

	webutil.WriteJSON(w, http.StatusOK, item)
}

func (h *Handler) DeleteDeduction(w http.ResponseWriter, r *http.Request) {
	user, err := auth.GetSessionUser(h.DB, r)
	if errors.Is(err, sql.ErrNoRows) {
		webutil.Unauthorized(w, "session is invalid or expired")
		return
	}
	if err != nil {
		webutil.ServerError(w, err)
		return
	}

	deductionID, ok := webutil.ParseID(w, r)
	if !ok {
		return
	}

	result, err := h.DB.Exec(`DELETE FROM financial_horizon_deductions WHERE id = $1 AND user_id = $2`, deductionID, user.ID)
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
