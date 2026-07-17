package handlers

import (
	"database/sql"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
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
	var vehicleName string
	if err := a.DB.QueryRow(`SELECT name FROM vehicles WHERE id=$1`, vehicleID).Scan(&vehicleName); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			http.NotFound(w, r)
			return
		}
		serverError(w, err)
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
		item.FilledAt = item.FilledAt.UTC()
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
		fill.FilledAt = fill.FilledAt.UTC()
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
	writeJSON(w, http.StatusOK, map[string]any{"vehicle_name": vehicleName, "air_fills": air, "fuel_fillups": fuels})
}

func (a *API) DeleteVehicleAirFill(w http.ResponseWriter, r *http.Request) {
	a.deleteVehicleRecord(w, r, "vehicle_air_fills", "airFillID")
}
func (a *API) DeleteFuelFillup(w http.ResponseWriter, r *http.Request) {
	a.deleteVehicleRecord(w, r, "vehicle_fuel_fillups", "fillupID")
}
func (a *API) deleteVehicleRecord(w http.ResponseWriter, r *http.Request, table, param string) {
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
	recordID, err := strconv.ParseInt(chi.URLParam(r, param), 10, 64)
	if err != nil || recordID <= 0 {
		badRequest(w, "invalid record id")
		return
	}
	result, err := a.DB.Exec(`DELETE FROM `+table+` WHERE id=$1 AND vehicle_id=$2 AND user_id=$3`, recordID, vehicleID, user.ID)
	if err != nil {
		serverError(w, err)
		return
	}
	n, err := result.RowsAffected()
	if err != nil {
		serverError(w, err)
		return
	}
	if n == 0 {
		http.NotFound(w, r)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
