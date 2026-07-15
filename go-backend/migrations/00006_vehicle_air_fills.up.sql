CREATE TABLE vehicle_air_fills (
    id BIGSERIAL PRIMARY KEY,
    vehicle_id BIGINT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filled_at TIMESTAMP NOT NULL DEFAULT now(),
    reminder_notification_id BIGINT UNIQUE REFERENCES notifications(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX vehicle_air_fills_latest_by_vehicle_idx
    ON vehicle_air_fills (vehicle_id, user_id, filled_at DESC);

CREATE INDEX vehicle_air_fills_due_reminders_idx
    ON vehicle_air_fills (filled_at)
    WHERE reminder_notification_id IS NULL;
