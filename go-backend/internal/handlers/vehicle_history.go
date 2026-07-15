package handlers

import (
	"database/sql"
	"errors"
	"net/http"
	"time"
)

type airFillHistory struct {
	ID       int64     `json:"id"`
	FilledAt time.Time `json:"filled_at"`
}
type fuelHistoryItem struct {
	FuelType  string  `json:"fuel_type"`
	FillType  string  `json:"fill_type"`
	Quantity  float64 `json:"quantity"`
	UnitPrice float64 `json:"unit_price"`
	TotalCost float64 `json:"total_cost"`
}
type fuelFillHistory struct {
	ID          int64             `json:"id"`
	OdometerKM  float64           `json:"odometer_km"`
	FilledAt    time.Time         `json:"filled_at"`
	StationName *string           `json:"station_name"`
	Notes       *string           `json:"notes"`
	Items       []fuelHistoryItem `json:"items"`
}

func (a *API) VehicleHistory(w http.ResponseWriter, r *http.Request) {
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
	var exists bool
	if err := a.DB.QueryRow(`SELECT EXISTS(SELECT 1 FROM vehicles WHERE id=$1)`, vehicleID).Scan(&exists); err != nil {
		serverError(w, err)
		return
	}
	if !exists {
		http.NotFound(w, r)
		return
	}
	airRows, err := a.DB.Query(`SELECT id,filled_at FROM vehicle_air_fills WHERE vehicle_id=$1 AND user_id=$2 ORDER BY filled_at DESC,id DESC`, vehicleID, user.ID)
	if err != nil {
		serverError(w, err)
		return
	}
	defer airRows.Close()
	air := make([]airFillHistory, 0)
	for airRows.Next() {
		var item airFillHistory
		if err := airRows.Scan(&item.ID, &item.FilledAt); err != nil {
			serverError(w, err)
			return
		}
		air = append(air, item)
	}
	fuelRows, err := a.DB.Query(`SELECT id,odometer_km,filled_at,station_name,notes FROM vehicle_fuel_fillups WHERE vehicle_id=$1 AND user_id=$2 ORDER BY filled_at DESC,id DESC`, vehicleID, user.ID)
	if err != nil {
		serverError(w, err)
		return
	}
	defer fuelRows.Close()
	fuels := make([]fuelFillHistory, 0)
	for fuelRows.Next() {
		var fill fuelFillHistory
		if err := fuelRows.Scan(&fill.ID, &fill.OdometerKM, &fill.FilledAt, &fill.StationName, &fill.Notes); err != nil {
			serverError(w, err)
			return
		}
		rows, err := a.DB.Query(`SELECT fuel_type,fill_type,quantity,unit_price,total_cost FROM vehicle_fuel_items WHERE fillup_id=$1 ORDER BY id`, fill.ID)
		if err != nil {
			serverError(w, err)
			return
		}
		fill.Items = []fuelHistoryItem{}
		for rows.Next() {
			var item fuelHistoryItem
			if err := rows.Scan(&item.FuelType, &item.FillType, &item.Quantity, &item.UnitPrice, &item.TotalCost); err != nil {
				rows.Close()
				serverError(w, err)
				return
			}
			fill.Items = append(fill.Items, item)
		}
		rows.Close()
		fuels = append(fuels, fill)
	}
	writeJSON(w, http.StatusOK, map[string]any{"air_fills": air, "fuel_fillups": fuels})
}
