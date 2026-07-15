package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"
)

type fuelItemInput struct {
	FuelType  string   `json:"fuel_type"`
	FillType  string   `json:"fill_type"`
	Quantity  *float64 `json:"quantity"`
	UnitPrice *float64 `json:"unit_price"`
	TotalCost *float64 `json:"total_cost"`
}
type fuelFillupInput struct {
	OdometerKM  float64         `json:"odometer_km"`
	FilledAt    *time.Time      `json:"filled_at"`
	StationName *string         `json:"station_name"`
	Notes       *string         `json:"notes"`
	Items       []fuelItemInput `json:"items"`
}

func (a *API) CreateFuelFillup(w http.ResponseWriter, r *http.Request) {
	user, err := a.sessionUser(r)
	if errors.Is(err, sql.ErrNoRows) {
		unauthorized(w, "session is invalid or expired")
		return
	}
	if err != nil {
		serverError(w, err)
		return
	}
	vehicleID, ok := parseID(w, r)
	if !ok {
		return
	}
	var in fuelFillupInput
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&in); err != nil {
		badRequest(w, "invalid JSON")
		return
	}
	if in.OdometerKM < 0 || len(in.Items) == 0 || len(in.Items) > 2 {
		badRequest(w, "odometer and one or two fuel tanks are required")
		return
	}
	for i := range in.Items {
		if err := normalizeFuelItem(&in.Items[i]); err != nil {
			badRequest(w, err.Error())
			return
		}
	}
	filledAt := time.Now()
	if in.FilledAt != nil {
		filledAt = *in.FilledAt
	}
	tx, err := a.DB.BeginTx(r.Context(), nil)
	if err != nil {
		serverError(w, err)
		return
	}
	defer tx.Rollback()
	var previousOdometer sql.NullFloat64
	if err := tx.QueryRow(`SELECT MAX(odometer_km) FROM vehicle_fuel_fillups WHERE vehicle_id=$1`, vehicleID).Scan(&previousOdometer); err != nil {
		serverError(w, err)
		return
	}
	if previousOdometer.Valid && in.OdometerKM < previousOdometer.Float64 {
		badRequest(w, "odometer cannot be lower than a previous fuel entry")
		return
	}
	var fillupID int64
	if err := tx.QueryRow(`INSERT INTO vehicle_fuel_fillups (vehicle_id,user_id,odometer_km,filled_at,station_name,notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`, vehicleID, user.ID, in.OdometerKM, filledAt, in.StationName, in.Notes).Scan(&fillupID); err != nil {
		serverError(w, err)
		return
	}
	for _, item := range in.Items {
		if _, err := tx.Exec(`INSERT INTO vehicle_fuel_items (fillup_id,fuel_type,fill_type,quantity,unit_price,total_cost) VALUES ($1,$2,$3,$4,$5,$6)`, fillupID, item.FuelType, item.FillType, *item.Quantity, *item.UnitPrice, *item.TotalCost); err != nil {
			serverError(w, err)
			return
		}
	}
	if err := tx.Commit(); err != nil {
		serverError(w, err)
		return
	}
	economies := map[string]*float64{}
	for _, item := range in.Items {
		economies[item.FuelType] = a.latestFuelEconomy(vehicleID, item.FuelType)
	}
	writeJSON(w, http.StatusCreated, map[string]any{"id": fillupID, "economy_km_per_litre": economies})
}

func normalizeFuelItem(item *fuelItemInput) error {
	item.FuelType = strings.ToLower(strings.TrimSpace(item.FuelType))
	item.FillType = strings.ToLower(strings.TrimSpace(item.FillType))
	if !map[string]bool{"petrol": true, "diesel": true, "lpg": true, "cng": true, "electric": true}[item.FuelType] {
		return errors.New("invalid fuel type")
	}
	if !map[string]bool{"full": true, "partial": true, "missed": true}[item.FillType] {
		return errors.New("invalid fill type")
	}
	count := 0
	if item.Quantity != nil {
		count++
	}
	if item.UnitPrice != nil {
		count++
	}
	if item.TotalCost != nil {
		count++
	}
	if count < 2 {
		return errors.New("enter any two of quantity, price, and total cost")
	}
	if item.Quantity == nil {
		v := *item.TotalCost / *item.UnitPrice
		item.Quantity = &v
	} else if item.UnitPrice == nil {
		v := *item.TotalCost / *item.Quantity
		item.UnitPrice = &v
	} else if item.TotalCost == nil {
		v := *item.Quantity * *item.UnitPrice
		item.TotalCost = &v
	}
	if *item.Quantity <= 0 || *item.UnitPrice <= 0 || *item.TotalCost <= 0 {
		return errors.New("fuel values must be positive")
	}
	return nil
}

func (a *API) latestFuelEconomy(vehicleID int64, fuelType string) *float64 {
	rows, err := a.DB.Query(`SELECT f.odometer_km, i.fill_type, i.quantity FROM vehicle_fuel_fillups f JOIN vehicle_fuel_items i ON i.fillup_id=f.id WHERE f.vehicle_id=$1 AND i.fuel_type=$2 ORDER BY f.filled_at, f.id`, vehicleID, fuelType)
	if err != nil {
		return nil
	}
	defer rows.Close()
	var previousFull *float64
	accumulated := 0.0
	var latest *float64
	for rows.Next() {
		var odometer, quantity float64
		var fillType string
		if rows.Scan(&odometer, &fillType, &quantity) != nil {
			return nil
		}
		if fillType == "missed" {
			previousFull = nil
			accumulated = 0
			continue
		}
		if fillType == "partial" {
			if previousFull != nil {
				accumulated += quantity
			}
			continue
		}
		if previousFull != nil && odometer > *previousFull {
			value := (odometer - *previousFull) / (accumulated + quantity)
			latest = &value
		}
		value := odometer
		previousFull = &value
		accumulated = 0
	}
	return latest
}
