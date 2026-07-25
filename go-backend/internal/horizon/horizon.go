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

type BudgetInput struct {
	Name            string  `json:"name"`
	AllocatedAmount float64 `json:"allocated_amount"`
}

type BudgetDTO struct {
	ID              int64   `json:"id"`
	Name            string  `json:"name"`
	AllocatedAmount float64 `json:"allocated_amount"`
	UsedAmount      float64 `json:"used_amount"`
	AvailableAmount float64 `json:"available_amount"`
	UsagePercentage float64 `json:"usage_percentage"`
}

type DeductionInput struct {
	Name     string  `json:"name"`
	Category string  `json:"category"`
	Amount   float64 `json:"amount"`
	DueDay   *int    `json:"due_day"`
	IsActive *bool   `json:"is_active"`
	BudgetID *int64  `json:"budget_id"`
}

type DeductionDTO struct {
	ID       int64   `json:"id"`
	Name     string  `json:"name"`
	Category string  `json:"category"`
	Amount   float64 `json:"amount"`
	DueDay   *int    `json:"due_day"`
	IsActive bool    `json:"is_active"`
	BudgetID *int64  `json:"budget_id"`
}

type ProjectionDTO struct {
	Months                int     `json:"months"`
	Label                 string  `json:"label"`
	CumulativeUncommitted float64 `json:"cumulative_uncommitted"`
}

type HorizonSummaryDTO struct {
	BaseAmount            float64         `json:"base_amount"`
	Currency              string          `json:"currency"`
	TotalDeductions       float64         `json:"total_deductions"`
	RemainingAmount       float64         `json:"remaining_amount"`
	CommittedRatio        float64         `json:"committed_ratio"`
	TotalBudgetsAllocated float64         `json:"total_budgets_allocated"`
	Budgets               []BudgetDTO     `json:"budgets"`
	Deductions            []DeductionDTO  `json:"deductions"`
	Projections           []ProjectionDTO `json:"projections"`
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

	// Fetch Budgets
	budgetRows, err := h.DB.Query(`SELECT id, name, allocated_amount FROM financial_horizon_budgets WHERE user_id = $1 ORDER BY created_at ASC, id ASC`, userID)
	if err != nil {
		return nil, err
	}
	defer budgetRows.Close()

	budgetsMap := make(map[int64]*BudgetDTO)
	budgetsList := make([]BudgetDTO, 0)
	var totalBudgetsAllocated float64

	for budgetRows.Next() {
		var b BudgetDTO
		if err := budgetRows.Scan(&b.ID, &b.Name, &b.AllocatedAmount); err != nil {
			return nil, err
		}
		totalBudgetsAllocated += b.AllocatedAmount
		budgetsList = append(budgetsList, b)
	}

	// Fetch Deductions
	rows, err := h.DB.Query(`SELECT id, name, category, amount, due_day, is_active, budget_id FROM financial_horizon_deductions WHERE user_id = $1 ORDER BY is_active DESC, created_at DESC, id DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	budgetUsedMap := make(map[int64]float64)
	deductions := make([]DeductionDTO, 0)
	var totalDeductions float64

	for rows.Next() {
		var item DeductionDTO
		var dueDay sql.NullInt64
		var budgetID sql.NullInt64

		if err := rows.Scan(&item.ID, &item.Name, &item.Category, &item.Amount, &dueDay, &item.IsActive, &budgetID); err != nil {
			return nil, err
		}
		if dueDay.Valid {
			d := int(dueDay.Int64)
			item.DueDay = &d
		}
		if budgetID.Valid {
			bID := budgetID.Int64
			item.BudgetID = &bID
			if item.IsActive {
				budgetUsedMap[bID] += item.Amount
			}
		}

		if item.IsActive {
			totalDeductions += item.Amount
		}
		deductions = append(deductions, item)
	}

	// Populate budget used, available, and percentage
	for i := range budgetsList {
		b := &budgetsList[i]
		b.UsedAmount = budgetUsedMap[b.ID]
		b.AvailableAmount = b.AllocatedAmount - b.UsedAmount
		if b.AllocatedAmount > 0 {
			b.UsagePercentage = math.Round((b.UsedAmount/b.AllocatedAmount)*10000) / 100
		}
		budgetsMap[b.ID] = b
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
		BaseAmount:            baseAmount,
		Currency:              currency,
		TotalDeductions:       totalDeductions,
		RemainingAmount:       remainingAmount,
		CommittedRatio:        committedRatio,
		TotalBudgetsAllocated: totalBudgetsAllocated,
		Budgets:               budgetsList,
		Deductions:            deductions,
		Projections:           projections,
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

func (h *Handler) CreateBudget(w http.ResponseWriter, r *http.Request) {
	user, err := auth.GetSessionUser(h.DB, r)
	if errors.Is(err, sql.ErrNoRows) {
		webutil.Unauthorized(w, "session is invalid or expired")
		return
	}
	if err != nil {
		webutil.ServerError(w, err)
		return
	}

	var in BudgetInput
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&in); err != nil {
		webutil.BadRequest(w, "invalid JSON")
		return
	}

	in.Name = strings.TrimSpace(in.Name)
	if in.Name == "" || len([]rune(in.Name)) > 160 {
		webutil.BadRequest(w, "name is required and must be under 160 characters")
		return
	}

	if in.AllocatedAmount < 0 {
		webutil.BadRequest(w, "allocated amount cannot be negative")
		return
	}

	var b BudgetDTO
	err = h.DB.QueryRow(`
		INSERT INTO financial_horizon_budgets (user_id, name, allocated_amount)
		VALUES ($1, $2, $3)
		RETURNING id, name, allocated_amount
	`, user.ID, in.Name, in.AllocatedAmount).Scan(&b.ID, &b.Name, &b.AllocatedAmount)

	if err != nil {
		webutil.ServerError(w, err)
		return
	}

	b.UsedAmount = 0
	b.AvailableAmount = b.AllocatedAmount
	b.UsagePercentage = 0

	webutil.WriteJSON(w, http.StatusCreated, b)
}

func (h *Handler) UpdateBudget(w http.ResponseWriter, r *http.Request) {
	user, err := auth.GetSessionUser(h.DB, r)
	if errors.Is(err, sql.ErrNoRows) {
		webutil.Unauthorized(w, "session is invalid or expired")
		return
	}
	if err != nil {
		webutil.ServerError(w, err)
		return
	}

	budgetID, ok := webutil.ParseID(w, r)
	if !ok {
		return
	}

	var in BudgetInput
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&in); err != nil {
		webutil.BadRequest(w, "invalid JSON")
		return
	}

	in.Name = strings.TrimSpace(in.Name)
	if in.Name == "" || len([]rune(in.Name)) > 160 {
		webutil.BadRequest(w, "name is required and must be under 160 characters")
		return
	}

	if in.AllocatedAmount < 0 {
		webutil.BadRequest(w, "allocated amount cannot be negative")
		return
	}

	var b BudgetDTO
	err = h.DB.QueryRow(`
		UPDATE financial_horizon_budgets
		SET name = $1, allocated_amount = $2, updated_at = CURRENT_TIMESTAMP
		WHERE id = $3 AND user_id = $4
		RETURNING id, name, allocated_amount
	`, in.Name, in.AllocatedAmount, budgetID, user.ID).Scan(&b.ID, &b.Name, &b.AllocatedAmount)

	if errors.Is(err, sql.ErrNoRows) {
		http.NotFound(w, r)
		return
	}
	if err != nil {
		webutil.ServerError(w, err)
		return
	}

	var usedAmount float64
	err = h.DB.QueryRow(`
		SELECT COALESCE(SUM(amount), 0)
		FROM financial_horizon_deductions
		WHERE budget_id = $1 AND user_id = $2 AND is_active = true
	`, budgetID, user.ID).Scan(&usedAmount)

	if err != nil {
		webutil.ServerError(w, err)
		return
	}

	b.UsedAmount = usedAmount
	b.AvailableAmount = b.AllocatedAmount - b.UsedAmount
	if b.AllocatedAmount > 0 {
		b.UsagePercentage = math.Round((b.UsedAmount/b.AllocatedAmount)*10000) / 100
	}

	webutil.WriteJSON(w, http.StatusOK, b)
}

func (h *Handler) DeleteBudget(w http.ResponseWriter, r *http.Request) {
	user, err := auth.GetSessionUser(h.DB, r)
	if errors.Is(err, sql.ErrNoRows) {
		webutil.Unauthorized(w, "session is invalid or expired")
		return
	}
	if err != nil {
		webutil.ServerError(w, err)
		return
	}

	budgetID, ok := webutil.ParseID(w, r)
	if !ok {
		return
	}

	result, err := h.DB.Exec(`DELETE FROM financial_horizon_budgets WHERE id = $1 AND user_id = $2`, budgetID, user.ID)
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

	var budgetID sql.NullInt64
	if in.BudgetID != nil {
		budgetID = sql.NullInt64{Int64: *in.BudgetID, Valid: true}
	}

	var item DeductionDTO
	var dueDay sql.NullInt64
	if in.DueDay != nil {
		dueDay = sql.NullInt64{Int64: int64(*in.DueDay), Valid: true}
	}

	err = h.DB.QueryRow(`
		INSERT INTO financial_horizon_deductions (user_id, name, category, amount, due_day, is_active, budget_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, name, category, amount, due_day, is_active, budget_id
	`, user.ID, in.Name, category, in.Amount, dueDay, isActive, budgetID).Scan(&item.ID, &item.Name, &item.Category, &item.Amount, &dueDay, &item.IsActive, &budgetID)

	if err != nil {
		webutil.ServerError(w, err)
		return
	}

	if dueDay.Valid {
		d := int(dueDay.Int64)
		item.DueDay = &d
	}
	if budgetID.Valid {
		bID := budgetID.Int64
		item.BudgetID = &bID
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

	var budgetID sql.NullInt64
	if in.BudgetID != nil {
		budgetID = sql.NullInt64{Int64: *in.BudgetID, Valid: true}
	}

	var item DeductionDTO
	var dueDay sql.NullInt64
	if in.DueDay != nil {
		dueDay = sql.NullInt64{Int64: int64(*in.DueDay), Valid: true}
	}

	err = h.DB.QueryRow(`
		UPDATE financial_horizon_deductions
		SET name = $1, category = $2, amount = $3, due_day = $4, is_active = $5, budget_id = $6, updated_at = CURRENT_TIMESTAMP
		WHERE id = $7 AND user_id = $8
		RETURNING id, name, category, amount, due_day, is_active, budget_id
	`, in.Name, category, in.Amount, dueDay, isActive, budgetID, deductionID, user.ID).Scan(&item.ID, &item.Name, &item.Category, &item.Amount, &dueDay, &item.IsActive, &budgetID)

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
	if budgetID.Valid {
		bID := budgetID.Int64
		item.BudgetID = &bID
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
