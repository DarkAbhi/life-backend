package vehicle

import (
	"database/sql"
	"errors"
	"log"
	"net/http"
	"time"

	"github.com/DarkAbhi/life-backend/internal/auth"
	"github.com/DarkAbhi/life-backend/internal/webutil"
)

type vehicleAirFillDTO struct {
	VehicleID int64     `json:"vehicle_id"`
	FilledAt  time.Time `json:"filled_at"`
}

// CreateVehicleAirFill records a new air fill event for a vehicle.
func (h *Handler) CreateVehicleAirFill(w http.ResponseWriter, r *http.Request) {
	user, err := auth.GetSessionUser(h.DB, r)
	if errors.Is(err, sql.ErrNoRows) {
		webutil.Unauthorized(w, "session is invalid or expired")
		return
	}
	if err != nil {
		webutil.ServerError(w, err)
		return
	}
	vehicleID, ok := webutil.ParseID(w, r)
	if !ok {
		return
	}

	var vehicleExists bool
	if err := h.DB.QueryRow(`SELECT EXISTS(SELECT 1 FROM vehicles WHERE id = $1)`, vehicleID).Scan(&vehicleExists); err != nil {
		webutil.ServerError(w, err)
		return
	}
	if !vehicleExists {
		http.NotFound(w, r)
		return
	}

	var filledAt time.Time
	if err := h.DB.QueryRow(`
		INSERT INTO vehicle_air_fills (vehicle_id, user_id)
		VALUES ($1, $2)
		RETURNING filled_at
	`, vehicleID, user.ID).Scan(&filledAt); err != nil {
		webutil.ServerError(w, err)
		return
	}
	webutil.WriteJSON(w, http.StatusCreated, vehicleAirFillDTO{VehicleID: vehicleID, FilledAt: filledAt.UTC()})
}

// ListLatestVehicleAirFills lists the latest air fills across vehicles.
func (h *Handler) ListLatestVehicleAirFills(w http.ResponseWriter, r *http.Request) {
	user, err := auth.GetSessionUser(h.DB, r)
	if errors.Is(err, sql.ErrNoRows) {
		webutil.Unauthorized(w, "session is invalid or expired")
		return
	}
	if err != nil {
		webutil.ServerError(w, err)
		return
	}

	rows, err := h.DB.Query(`
		SELECT DISTINCT ON (vehicle_id) vehicle_id, filled_at
		FROM vehicle_air_fills
		WHERE user_id = $1
		ORDER BY vehicle_id, filled_at DESC, id DESC
	`, user.ID)
	if err != nil {
		webutil.ServerError(w, err)
		return
	}
	defer rows.Close()

	fills := make([]vehicleAirFillDTO, 0)
	for rows.Next() {
		var fill vehicleAirFillDTO
		if err := rows.Scan(&fill.VehicleID, &fill.FilledAt); err != nil {
			webutil.ServerError(w, err)
			return
		}
		fill.FilledAt = fill.FilledAt.UTC()
		fills = append(fills, fill)
	}
	if err := rows.Err(); err != nil {
		webutil.ServerError(w, err)
		return
	}
	webutil.WriteJSON(w, http.StatusOK, fills)
}

// RunAirFillReminderJob creates each overdue air-fill reminder once.
// It catches up on startup and then checks hourly while the API is running.
func RunAirFillReminderJob(database *sql.DB) {
	createDueAirFillReminders(database)
	ticker := time.NewTicker(time.Hour)
	defer ticker.Stop()
	for range ticker.C {
		createDueAirFillReminders(database)
	}
}

func createDueAirFillReminders(database *sql.DB) {
	rows, err := database.Query(`
		SELECT id FROM vehicle_air_fills
		WHERE reminder_notification_id IS NULL
			AND filled_at <= NOW() - INTERVAL '30 days'
		LIMIT 100
	`)
	if err != nil {
		log.Printf("air-fill reminder scan failed: %v", err)
		return
	}
	defer rows.Close()

	var airFillIDs []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			log.Printf("air-fill reminder scan failed: %v", err)
			return
		}
		airFillIDs = append(airFillIDs, id)
	}
	for _, airFillID := range airFillIDs {
		if err := createAirFillReminder(database, airFillID); err != nil {
			log.Printf("air-fill reminder failed for fill %d: %v", airFillID, err)
		}
	}
}

func createAirFillReminder(database *sql.DB, airFillID int64) error {
	tx, err := database.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var userID int64
	var vehicleID int64
	var vehicleName string
	err = tx.QueryRow(`
		SELECT vehicle_air_fills.user_id, vehicle_air_fills.vehicle_id, vehicles.name
		FROM vehicle_air_fills
		JOIN vehicles ON vehicles.id = vehicle_air_fills.vehicle_id
		WHERE vehicle_air_fills.id = $1
			AND vehicle_air_fills.reminder_notification_id IS NULL
			AND vehicle_air_fills.filled_at <= NOW() - INTERVAL '30 days'
		FOR UPDATE
	`, airFillID).Scan(&userID, &vehicleID, &vehicleName)
	if errors.Is(err, sql.ErrNoRows) {
		return nil
	}
	if err != nil {
		return err
	}

	var notificationID int64
	err = tx.QueryRow(`
		INSERT INTO notifications (user_id, source, title, body, target_path, priority, metadata)
		VALUES ($1, 'Garage', $2, $3, '/garage', 1, jsonb_build_object('vehicle_id', $4::bigint))
		RETURNING id
	`, userID, "Time to check "+vehicleName+"'s air", "It has been 30 days since you last filled air in "+vehicleName+".", vehicleID).Scan(&notificationID)
	if err != nil {
		return err
	}
	if _, err := tx.Exec(`UPDATE vehicle_air_fills SET reminder_notification_id = $1 WHERE id = $2`, notificationID, airFillID); err != nil {
		return err
	}
	return tx.Commit()
}
