CREATE TABLE meditations (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE gym_visits (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE trips (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE credit_cards (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    link TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE sports (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(10) NOT NULL CHECK (name IN ('cricket','football','badminton')),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE vehicles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(48) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE transactions (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    vehicle_id BIGINT REFERENCES vehicles(id) ON DELETE CASCADE,
    category INT NOT NULL CHECK (category BETWEEN 1 AND 12),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);