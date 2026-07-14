package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
)

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

func (a *API) GetGymVisitExercises(w http.ResponseWriter, r *http.Request) {
	visitID, ok := parseID(w, r)
	if !ok {
		return
	}
	if !a.gymVisitExists(w, r, visitID) {
		return
	}

	rows, err := a.DB.Query(`
		SELECT id, name FROM gym_visit_exercises
		WHERE gym_visit_id = $1
		ORDER BY id ASC
	`, visitID)
	if err != nil {
		serverError(w, err)
		return
	}
	defer rows.Close()

	exercises := make([]gymExerciseDTO, 0)
	for rows.Next() {
		var exercise gymExerciseDTO
		if err := rows.Scan(&exercise.ID, &exercise.Name); err != nil {
			serverError(w, err)
			return
		}
		sets, err := a.exerciseSets(exercise.ID)
		if err != nil {
			serverError(w, err)
			return
		}
		exercise.Sets = sets
		exercises = append(exercises, exercise)
	}
	if err := rows.Err(); err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, exercises)
}

func (a *API) CreateGymVisitExercise(w http.ResponseWriter, r *http.Request) {
	visitID, ok := parseID(w, r)
	if !ok {
		return
	}
	if !a.gymVisitExists(w, r, visitID) {
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	defer r.Body.Close()
	var body createGymExerciseBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		badRequest(w, "invalid JSON")
		return
	}
	name := strings.TrimSpace(body.Name)
	if name == "" || len([]rune(name)) > 100 {
		badRequest(w, "exercise name must be between 1 and 100 characters")
		return
	}
	if len(body.Sets) == 0 || len(body.Sets) > 20 {
		badRequest(w, "provide between 1 and 20 sets")
		return
	}
	for _, set := range body.Sets {
		if set.Reps <= 0 || set.Reps > 1000 || (set.Weight != nil && *set.Weight < 0) {
			badRequest(w, "each set needs positive reps and a non-negative weight")
			return
		}
	}

	tx, err := a.DB.BeginTx(r.Context(), nil)
	if err != nil {
		serverError(w, err)
		return
	}
	defer tx.Rollback()

	var exercise gymExerciseDTO
	if err := tx.QueryRow(`
		INSERT INTO gym_visit_exercises (gym_visit_id, name)
		VALUES ($1, $2)
		RETURNING id, name
	`, visitID, name).Scan(&exercise.ID, &exercise.Name); err != nil {
		serverError(w, err)
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
			serverError(w, err)
			return
		}
		if weight.Valid {
			savedSet.Weight = &weight.Float64
		}
		exercise.Sets = append(exercise.Sets, savedSet)
	}
	if err := tx.Commit(); err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, exercise)
}

func (a *API) gymVisitExists(w http.ResponseWriter, r *http.Request, visitID int64) bool {
	var found int
	err := a.DB.QueryRow(`SELECT 1 FROM gym_visits WHERE id = $1`, visitID).Scan(&found)
	if errors.Is(err, sql.ErrNoRows) {
		http.NotFound(w, r)
		return false
	}
	if err != nil {
		serverError(w, err)
		return false
	}
	return true
}

func (a *API) exerciseSets(exerciseID int64) ([]gymExerciseSetDTO, error) {
	rows, err := a.DB.Query(`
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
