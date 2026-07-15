CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source VARCHAR(64) NOT NULL,
    title VARCHAR(160) NOT NULL,
    body TEXT,
    target_path VARCHAR(512),
    priority SMALLINT NOT NULL DEFAULT 0 CHECK (priority BETWEEN 0 AND 2),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    read_at TIMESTAMP,
    dismissed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX notifications_active_by_user_idx
    ON notifications (user_id, created_at DESC)
    WHERE dismissed_at IS NULL;
