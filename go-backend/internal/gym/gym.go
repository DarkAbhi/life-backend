package gym

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/DarkAbhi/life-backend/internal/auth"
	"github.com/DarkAbhi/life-backend/internal/timeutil"
	"github.com/DarkAbhi/life-backend/internal/webutil"
)

const gymReminderSource = "Gym reminder"

type gymVisitListItem struct {
	ID        int64     `json:"id"`
	CreatedAt time.Time `json:"created_at"`
}

type exerciseSetInput struct {
	Reps   int      `json:"reps"`
	Weight *float64 `json:"weight"`
}

type createGymExerciseBody struct {
	Name string             `json:"name"`
	Sets []exerciseSetInput `json:"sets"`
}

type gymExerciseSetDTO struct {
	ID        int64    `json:"id"`
	SetNumber int      `json:"set_number"`
	Reps      int      `json:"reps"`
	Weight    *float64 `json:"weight"`
}

type gymExerciseDTO struct {
	ID   int64               `json:"id"`
	Name string              `json:"name"`
	Sets []gymExerciseSetDTO `json:"sets"`
}

type Handler struct {
	DB *sql.DB
}

func NewHandler(db *sql.DB) *Handler {
	return &Handler{DB: db}
}

// GymVisitedToday checks if the gym has been visited today.
func (h *Handler) GymVisitedToday(w http.ResponseWriter, r *http.Request) {
	start, end := timeutil.DayBoundsIndia(time.Now().UTC())
	const q = `
		SELECT id FROM gym_visits
		WHERE created_at >= $1 AND created_at < $2
		ORDER BY created_at DESC
		LIMIT 1;
	`
	var visitID int64
	err := h.DB.QueryRow(q, start, end).Scan(&visitID)
	if errors.Is(err, sql.ErrNoRows) {
		webutil.WriteJSON(w, http.StatusOK, map[string]any{"visited": false})
		return
	}
	if err != nil {
		webutil.ServerError(w, err)
		return
	}
	webutil.WriteJSON(w, http.StatusOK, map[string]any{"visited": true, "id": visitID})
}

// AddWorkoutForDay records a new gym visit.
func (h *Handler) AddWorkoutForDay(w http.ResponseWriter, r *http.Request) {
	var visitID int64
	if err := h.DB.QueryRow(`INSERT INTO gym_visits DEFAULT VALUES RETURNING id;`).Scan(&visitID); err != nil {
		webutil.ServerError(w, err)
		return
	}
	webutil.WriteJSON(w, http.StatusCreated, map[string]any{"message": "success", "id": visitID})
}

// ListGymVisits returns every recorded gym visit, newest first.
func (h *Handler) ListGymVisits(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query(`
		SELECT id, created_at
		FROM gym_visits
		ORDER BY created_at DESC, id DESC
	`)
	if err != nil {
		webutil.ServerError(w, err)
		return
	}
	defer rows.Close()

	visits := make([]gymVisitListItem, 0)
	for rows.Next() {
		var visit gymVisitListItem
		if err := rows.Scan(&visit.ID, &visit.CreatedAt); err != nil {
			webutil.ServerError(w, err)
			return
		}
		visit.CreatedAt = visit.CreatedAt.UTC()
		visits = append(visits, visit)
	}
	if err := rows.Err(); err != nil {
		webutil.ServerError(w, err)
		return
	}
	webutil.WriteJSON(w, http.StatusOK, visits)
}

// DeleteGymVisit removes a visit and its exercises and sets through database cascades.
func (h *Handler) DeleteGymVisit(w http.ResponseWriter, r *http.Request) {
	visitID, ok := webutil.ParseID(w, r)
	if !ok {
		return
	}
	result, err := h.DB.Exec(`DELETE FROM gym_visits WHERE id = $1`, visitID)
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

// GetGymVisitExercises gets exercises for a gym visit.
func (h *Handler) GetGymVisitExercises(w http.ResponseWriter, r *http.Request) {
	visitID, ok := webutil.ParseID(w, r)
	if !ok {
		return
	}
	if !h.gymVisitExists(w, r, visitID) {
		return
	}

	rows, err := h.DB.Query(`
		SELECT id, name FROM gym_visit_exercises
		WHERE gym_visit_id = $1
		ORDER BY id ASC
	`, visitID)
	if err != nil {
		webutil.ServerError(w, err)
		return
	}
	defer rows.Close()

	exercises := make([]gymExerciseDTO, 0)
	for rows.Next() {
		var exercise gymExerciseDTO
		if err := rows.Scan(&exercise.ID, &exercise.Name); err != nil {
			webutil.ServerError(w, err)
			return
		}
		sets, err := h.exerciseSets(exercise.ID)
		if err != nil {
			webutil.ServerError(w, err)
			return
		}
		exercise.Sets = sets
		exercises = append(exercises, exercise)
	}
	if err := rows.Err(); err != nil {
		webutil.ServerError(w, err)
		return
	}
	webutil.WriteJSON(w, http.StatusOK, exercises)
}

// CreateGymVisitExercise creates an exercise set log for a visit.
func (h *Handler) CreateGymVisitExercise(w http.ResponseWriter, r *http.Request) {
	visitID, ok := webutil.ParseID(w, r)
	if !ok {
		return
	}
	if !h.gymVisitExists(w, r, visitID) {
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	defer r.Body.Close()
	var body createGymExerciseBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		webutil.BadRequest(w, "invalid JSON")
		return
	}
	name := strings.TrimSpace(body.Name)
	if name == "" || len([]rune(name)) > 100 {
		webutil.BadRequest(w, "exercise name must be between 1 and 100 characters")
		return
	}
	if len(body.Sets) == 0 || len(body.Sets) > 20 {
		webutil.BadRequest(w, "provide between 1 and 20 sets")
		return
	}
	for _, set := range body.Sets {
		if set.Reps <= 0 || set.Reps > 1000 || (set.Weight != nil && *set.Weight < 0) {
			webutil.BadRequest(w, "each set needs positive reps and a non-negative weight")
			return
		}
	}

	tx, err := h.DB.BeginTx(r.Context(), nil)
	if err != nil {
		webutil.ServerError(w, err)
		return
	}
	defer tx.Rollback()

	var exercise gymExerciseDTO
	if err := tx.QueryRow(`
		INSERT INTO gym_visit_exercises (gym_visit_id, name)
		VALUES ($1, $2)
		RETURNING id, name
	`, visitID, name).Scan(&exercise.ID, &exercise.Name); err != nil {
		webutil.ServerError(w, err)
		return
	}

	exercise.Sets = make([]gymExerciseSetDTO, 0, len(body.Sets))
	for index, set := range body.Sets {
		var savedSet gymExerciseSetDTO
		var weight sql.NullFloat64
		if err := tx.QueryRow(`
			INSERT INTO gym_exercise_sets (gym_visit_exercise_id, set_number, reps, weight)
			VALUES ($1, $2, $3, $4)
			RETURNING id, set_number, reps, weight
		`, exercise.ID, index+1, set.Reps, set.Weight).Scan(
			&savedSet.ID,
			&savedSet.SetNumber,
			&savedSet.Reps,
			&weight,
		); err != nil {
			webutil.ServerError(w, err)
			return
		}
		if weight.Valid {
			savedSet.Weight = &weight.Float64
		}
		exercise.Sets = append(exercise.Sets, savedSet)
	}
	if err := tx.Commit(); err != nil {
		webutil.ServerError(w, err)
		return
	}
	webutil.WriteJSON(w, http.StatusCreated, exercise)
}

// MarkGymReminderVisited records a gym visit from the reminder card and dismisses it.
func (h *Handler) MarkGymReminderVisited(w http.ResponseWriter, r *http.Request) {
	user, ok := h.notificationUser(w, r)
	if !ok {
		return
	}
	notificationID, ok := webutil.ParseID(w, r)
	if !ok {
		return
	}

	tx, err := h.DB.Begin()
	if err != nil {
		webutil.ServerError(w, err)
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
		webutil.ServerError(w, err)
		return
	}
	if !reminderExists {
		http.NotFound(w, r)
		return
	}

	var visitID int64
	if err := tx.QueryRow(`INSERT INTO gym_visits DEFAULT VALUES RETURNING id`).Scan(&visitID); err != nil {
		webutil.ServerError(w, err)
		return
	}
	if _, err := tx.Exec(`UPDATE notifications SET dismissed_at = NOW() WHERE id = $1`, notificationID); err != nil {
		webutil.ServerError(w, err)
		return
	}
	if err := tx.Commit(); err != nil {
		webutil.ServerError(w, err)
		return
	}
	webutil.WriteJSON(w, http.StatusCreated, map[string]any{"id": visitID})
}

func (h *Handler) gymVisitExists(w http.ResponseWriter, r *http.Request, visitID int64) bool {
	var found int
	err := h.DB.QueryRow(`SELECT 1 FROM gym_visits WHERE id = $1`, visitID).Scan(&found)
	if errors.Is(err, sql.ErrNoRows) {
		http.NotFound(w, r)
		return false
	}
	if err != nil {
		webutil.ServerError(w, err)
		return false
	}
	return true
}

func (h *Handler) exerciseSets(exerciseID int64) ([]gymExerciseSetDTO, error) {
	rows, err := h.DB.Query(`
		SELECT id, set_number, reps, weight FROM gym_exercise_sets
		WHERE gym_visit_exercise_id = $1
		ORDER BY set_number ASC
	`, exerciseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	sets := make([]gymExerciseSetDTO, 0)
	for rows.Next() {
		var set gymExerciseSetDTO
		var weight sql.NullFloat64
		if err := rows.Scan(&set.ID, &set.SetNumber, &set.Reps, &weight); err != nil {
			return nil, err
		}
		if weight.Valid {
			set.Weight = &weight.Float64
		}
		sets = append(sets, set)
	}
	return sets, rows.Err()
}

func (h *Handler) notificationUser(w http.ResponseWriter, r *http.Request) (auth.SessionUser, bool) {
	user, err := auth.GetSessionUser(h.DB, r)
	if errors.Is(err, sql.ErrNoRows) {
		webutil.Unauthorized(w, "session is invalid or expired")
		return auth.SessionUser{}, false
	}
	if err != nil {
		webutil.ServerError(w, err)
		return auth.SessionUser{}, false
	}
	return user, true
}
