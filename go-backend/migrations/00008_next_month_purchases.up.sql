CREATE TABLE next_month_purchases (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_month DATE NOT NULL,
    name VARCHAR(160) NOT NULL,
    price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    url TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX next_month_purchases_user_month_idx ON next_month_purchases (user_id, target_month, created_at);
