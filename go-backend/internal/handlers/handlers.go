package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"github.com/go-chi/chi/v5"
	"net/http"
	"strconv"
	"time"
)

// --------------------------
// POST /api/workout/today
// --------------------------
func (a *API) GymVisitedToday(w http.ResponseWriter, r *http.Request) {
	start, end := dayBoundsIndia(time.Now())
	const q = `
		SELECT id FROM gym_visits
		WHERE created_at >= $1 AND created_at < $2
		ORDER BY created_at DESC
		LIMIT 1;
	`
	var visitID int64
	err := a.DB.QueryRow(q, start, end).Scan(&visitID)
	if errors.Is(err, sql.ErrNoRows) {
		writeJSON(w, http.StatusOK, map[string]any{"visited": false})
		return
	}
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"visited": true, "id": visitID})
}

func (a *API) AddWorkoutForDay(w http.ResponseWriter, r *http.Request) {
	var visitID int64
	if err := a.DB.QueryRow(`INSERT INTO gym_visits DEFAULT VALUES RETURNING id;`).Scan(&visitID); err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"message": "success", "id": visitID})
}

// ------------------------------
// POST /api/meditation/today
// ------------------------------
func (a *API) AddMeditationForDay(w http.ResponseWriter, r *http.Request) {
	start, end := dayBoundsUTC(time.Now())
	const q = `
		SELECT 1 FROM meditations
		WHERE created_at >= $1 AND created_at < $2
		LIMIT 1;
	`
	var dummy int
	err := a.DB.QueryRow(q, start, end).Scan(&dummy)
	switch {
	case err == nil:
		badRequest(w, "You have already meditated today.")
		return
	case errors.Is(err, sql.ErrNoRows):
		_, err := a.DB.Exec(`INSERT INTO meditations DEFAULT VALUES;`)
		if err != nil {
			serverError(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, map[string]string{"message": "success"})
		return
	default:
		serverError(w, err)
		return
	}
}

// --------------------------
// POST /api/sport/today
// body: { "sport": "cricket" }
// --------------------------
type addSportBody struct {
	Sport string `json:"sport"`
}

func (a *API) AddSportForDay(w http.ResponseWriter, r *http.Request) {
	var body addSportBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		badRequest(w, "Invalid JSON.")
		return
	}
	switch body.Sport {
	case "cricket", "football", "badminton":
		_, err := a.DB.Exec(`INSERT INTO sports (name) VALUES ($1);`, body.Sport)
		if err != nil {
			serverError(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, map[string]string{"message": "success"})
	default:
		badRequest(w, "This sport is not available yet.")
	}
}

// --------------------------
// /api/transactions
// --------------------------
type createTxBody struct {
	Name        string  `json:"name"`
	Amount      float64 `json:"amount"`
	Date        string  `json:"date"`        // "YYYY-MM-DD"
	Description *string `json:"description"` // optional
	Vehicle     *string `json:"vehicle"`     // by name (optional)
	Category    string  `json:"category"`    // Django sent strings; keep compatible
}

// category display mapping (1..12)
var categoryDisplay = map[int]string{
	1:  "Entertainment",
	2:  "Shopping",
	3:  "Transport",
	4:  "Fuel",
	5:  "Education",
	6:  "Bills & Utilites",
	7:  "Health & Wellness",
	8:  "Groceries",
	9:  "Trips",
	10: "Gadgets",
	11: "Fitness",
	12: "Food",
}

func parseDateYMD(s string) (time.Time, error) {
	return time.Parse("2006-01-02", s)
}

func (a *API) CreateTransaction(w http.ResponseWriter, r *http.Request) {
	var body createTxBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		badRequest(w, "Invalid JSON.")
		return
	}
	if body.Name == "" || body.Date == "" || body.Category == "" {
		badRequest(w, "name, date, category are required.")
		return
	}
	catInt, err := strconv.Atoi(body.Category)
	if err != nil || catInt < 1 || catInt > 12 {
		badRequest(w, "Invalid category.")
		return
	}
	dt, err := parseDateYMD(body.Date)
	if err != nil {
		badRequest(w, "Invalid date format. Use YYYY-MM-DD.")
		return
	}

	var vehicleID *int64
	if body.Vehicle != nil {
		// Only allowed when category == 4 (Fuel)
		if catInt != 4 {
			badRequest(w, "Invalid input.")
			return
		}
		var id int64
		err := a.DB.QueryRow(`SELECT id FROM vehicles WHERE name=$1 LIMIT 1;`, *body.Vehicle).Scan(&id)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				badRequest(w, "Vehicle not found.")
				return
			}
			serverError(w, err)
			return
		}
		vehicleID = &id
	}

	const ins = `
		INSERT INTO transactions (name, amount, date, description, vehicle_id, category)
		VALUES ($1,$2,$3,$4,$5,$6)
		RETURNING id, name, amount, category;
	`
	var id int64
	var name string
	var amount float64
	var category int
	if err := a.DB.QueryRow(ins, body.Name, body.Amount, dt, body.Description, vehicleID, catInt).
		Scan(&id, &name, &amount, &category); err != nil {
		serverError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"id":       id,
		"name":     name,
		"amount":   amount,
		"category": categoryDisplay[category],
	})
}

func (a *API) ListTransactions(w http.ResponseWriter, r *http.Request) {
	const q = `
		SELECT id, name, amount, category
		FROM transactions
		ORDER BY created_at DESC
		LIMIT 10;
	`
	rows, err := a.DB.Query(q)
	if err != nil {
		serverError(w, err)
		return
	}
	defer rows.Close()

	type item struct {
		ID       int64   `json:"id"`
		Name     string  `json:"name"`
		Amount   float64 `json:"amount"`
		Category string  `json:"category"`
	}
	var out []item
	for rows.Next() {
		var id int64
		var name string
		var amount float64
		var cat int
		if err := rows.Scan(&id, &name, &amount, &cat); err != nil {
			serverError(w, err)
			return
		}
		out = append(out, item{
			ID:       id,
			Name:     name,
			Amount:   amount,
			Category: categoryDisplay[cat],
		})
	}
	if err := rows.Err(); err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

// --------------------------
// GET /api/vehicles
// --------------------------
func (a *API) ListVehicles(w http.ResponseWriter, r *http.Request) {
	const q = `SELECT id, name FROM vehicles ORDER BY id ASC;`
	rows, err := a.DB.Query(q)
	if err != nil {
		serverError(w, err)
		return
	}
	defer rows.Close()

	type vehicleItem struct {
		ID   int64  `json:"id"`
		Name string `json:"name"`
	}
	out := make([]vehicleItem, 0)
	for rows.Next() {
		var v vehicleItem
		if err := rows.Scan(&v.ID, &v.Name); err != nil {
			serverError(w, err)
			return
		}
		out = append(out, v)
	}
	if err := rows.Err(); err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

type vehiclePayload struct {
	Name     *string `json:"name"`
	IsActive *bool   `json:"is_active"`
}

// Response DTO
type vehicleDTO struct {
	ID       int64  `json:"id"`
	Name     string `json:"name"`
	IsActive bool   `json:"is_active"`
}

func parseID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil || id <= 0 {
		badRequest(w, "invalid id")
		return 0, false
	}
	return id, true
}

func (a *API) CreateVehicle(w http.ResponseWriter, r *http.Request) {
	var p vehiclePayload
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		badRequest(w, "invalid JSON")
		return
	}
	if p.Name == nil || *p.Name == "" {
		badRequest(w, "name is required")
		return
	}
	isActive := true
	if p.IsActive != nil {
		isActive = *p.IsActive
	}

	const q = `
        INSERT INTO vehicles (name, is_active)
        VALUES ($1, $2)
        RETURNING id, name, is_active;
    `
	var out vehicleDTO
	if err := a.DB.QueryRow(q, *p.Name, isActive).Scan(&out.ID, &out.Name, &out.IsActive); err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, out)
}

func (a *API) GetVehicle(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}

	const q = `SELECT id, name, is_active FROM vehicles WHERE id=$1;`
	var out vehicleDTO
	err := a.DB.QueryRow(q, id).Scan(&out.ID, &out.Name, &out.IsActive)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			http.NotFound(w, r)
			return
		}
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (a *API) UpdateVehicle(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}

	var p vehiclePayload
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		badRequest(w, "invalid JSON")
		return
	}

	// Load current values
	const sel = `SELECT name, is_active FROM vehicles WHERE id=$1;`
	var curName string
	var curActive bool
	if err := a.DB.QueryRow(sel, id).Scan(&curName, &curActive); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			http.NotFound(w, r)
			return
		}
		serverError(w, err)
		return
	}

	if p.Name != nil {
		curName = *p.Name
	}
	if p.IsActive != nil {
		curActive = *p.IsActive
	}

	const upd = `
        UPDATE vehicles
        SET name=$1, is_active=$2, updated_at=now()
        WHERE id=$3
        RETURNING id, name, is_active;
    `
	var out vehicleDTO
	if err := a.DB.QueryRow(upd, curName, curActive, id).Scan(&out.ID, &out.Name, &out.IsActive); err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (a *API) DeleteVehicle(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}

	res, err := a.DB.Exec(`DELETE FROM vehicles WHERE id=$1;`, id)
	if err != nil {
		serverError(w, err)
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		http.NotFound(w, r)
		return
	}
	w.WriteHeader(http.StatusNoContent) // 204
}
