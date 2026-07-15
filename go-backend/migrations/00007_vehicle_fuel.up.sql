CREATE TABLE vehicle_fuel_fillups (
    id BIGSERIAL PRIMARY KEY,
    vehicle_id BIGINT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    odometer_km NUMERIC(12,1) NOT NULL CHECK (odometer_km >= 0),
    filled_at TIMESTAMP NOT NULL DEFAULT now(),
    station_name VARCHAR(160),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX vehicle_fuel_fillups_vehicle_idx ON vehicle_fuel_fillups (vehicle_id, filled_at, id);

CREATE TABLE vehicle_fuel_items (
    id BIGSERIAL PRIMARY KEY,
    fillup_id BIGINT NOT NULL REFERENCES vehicle_fuel_fillups(id) ON DELETE CASCADE,
    fuel_type VARCHAR(16) NOT NULL CHECK (fuel_type IN ('petrol', 'diesel', 'lpg', 'cng', 'electric')),
    fill_type VARCHAR(16) NOT NULL CHECK (fill_type IN ('full', 'partial', 'missed')),
    quantity NUMERIC(10,3) NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price > 0),
    total_cost NUMERIC(12,2) NOT NULL CHECK (total_cost > 0),
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX vehicle_fuel_items_fillup_idx ON vehicle_fuel_items (fillup_id, fuel_type);
