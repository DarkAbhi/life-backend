CREATE TABLE gym_visit_exercises (
    id BIGSERIAL PRIMARY KEY,
    gym_visit_id BIGINT NOT NULL REFERENCES gym_visits(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX gym_visit_exercises_visit_id_idx ON gym_visit_exercises (gym_visit_id);

CREATE TABLE gym_exercise_sets (
    id BIGSERIAL PRIMARY KEY,
    gym_visit_exercise_id BIGINT NOT NULL REFERENCES gym_visit_exercises(id) ON DELETE CASCADE,
    set_number SMALLINT NOT NULL CHECK (set_number > 0),
    reps SMALLINT NOT NULL CHECK (reps > 0),
    weight NUMERIC(8,2) CHECK (weight IS NULL OR weight >= 0),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (gym_visit_exercise_id, set_number)
);
