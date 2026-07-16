package handlers

import (
	"database/sql"
	"errors"
	"log"
	"net/http"
	"time"
)

const gymReminderSource = "Gym reminder"

// RunGymReminderJob creates the weekday gym reminder at 3:30 PM India time.
// It also catches up after a restart later on the same eligible day.
func RunGymReminderJob(database *sql.DB) {
	createDueGymReminders(database, time.Now())
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()
	for now := range ticker.C {
		createDueGymReminders(database, now)
	}
}

func createDueGymReminders(database *sql.DB, now time.Time) {
	location, err := time.LoadLocation("Asia/Kolkata")
	if err != nil {
		log.Printf("gym reminder timezone load failed: %v", err)
		return
	}
	localNow := now.In(location)
	if localNow.Weekday() == time.Sunday || localNow.Hour() < 15 || (localNow.Hour() == 15 && localNow.Minute() < 30) {
		return
	}

	reminderDate := localNow.Format("2006-01-02")
	rows, err := database.Query(`SELECT id FROM users`)
	if err != nil {
		log.Printf("gym reminder user scan failed: %v", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var userID int64
		if err := rows.Scan(&userID); err != nil {
			log.Printf("gym reminder user scan failed: %v", err)
			return
		}
		if err := createGymReminder(database, userID, reminderDate); err != nil {
			log.Printf("gym reminder failed for user %d: %v", userID, err)
		}
	}
	if err := rows.Err(); err != nil {
		log.Printf("gym reminder user scan failed: %v", err)
	}
}

func createGymReminder(database *sql.DB, userID int64, reminderDate string) error {
	tx, err := database.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var notificationID int64
	err = tx.QueryRow(`
		INSERT INTO notifications (user_id, source, title, body, target_path, priority, metadata)
		SELECT $1, $2, 'Time for the gym', 'Your 3:30 PM gym reminder. Mark your visit when you are done.', '/gym-visits', 1, jsonb_build_object('reminder_date', $3)
		WHERE NOT EXISTS (
			SELECT 1 FROM gym_reminder_deliveries WHERE user_id = $1 AND reminder_date = $3::date
		)
		RETURNING id
	`, userID, gymReminderSource, reminderDate).Scan(&notificationID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil
	}
	if err != nil {
		return err
	}
	if _, err := tx.Exec(`
		INSERT INTO gym_reminder_deliveries (user_id, reminder_date, notification_id)
		VALUES ($1, $2::date, $3)
	`, userID, reminderDate, notificationID); err != nil {
		return err
	}
	return tx.Commit()
}

// MarkGymReminderVisited records a gym visit from the reminder card and dismisses it.
func (a *API) MarkGymReminderVisited(w http.ResponseWriter, r *http.Request) {
	user, ok := a.notificationUser(w, r)
	if !ok {
		return
	}
	notificationID, ok := parseID(w, r)
	if !ok {
		return
	}

	tx, err := a.DB.Begin()
	if err != nil {
		serverError(w, err)
		return
	}
	defer tx.Rollback()

	var reminderExists bool
	err = tx.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM notifications
			WHERE id = $1 AND user_id = $2 AND source = $3 AND dismissed_at IS NULL
		)
	`, notificationID, user.ID, gymReminderSource).Scan(&reminderExists)
	if err != nil {
		serverError(w, err)
		return
	}
	if !reminderExists {
		http.NotFound(w, r)
		return
	}

	var visitID int64
	if err := tx.QueryRow(`INSERT INTO gym_visits DEFAULT VALUES RETURNING id`).Scan(&visitID); err != nil {
		serverError(w, err)
		return
	}
	if _, err := tx.Exec(`UPDATE notifications SET dismissed_at = NOW() WHERE id = $1`, notificationID); err != nil {
		serverError(w, err)
		return
	}
	if err := tx.Commit(); err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"id": visitID})
}
