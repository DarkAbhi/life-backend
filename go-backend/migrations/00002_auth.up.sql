CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE user_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX user_sessions_token_hash_idx ON user_sessions (token_hash);
CREATE INDEX user_sessions_expires_at_idx ON user_sessions (expires_at);

-- Bootstrap account: username "admin", password "password".
-- The password is stored as a bcrypt hash, never as plain text.
INSERT INTO users (username, password_hash)
VALUES ('admin', '$2y$12$bB7WwVq7nGJ4cfNTCX6kQODcNRLQvMjRhIFuH4Qv2.GAxlqNac4/S');
