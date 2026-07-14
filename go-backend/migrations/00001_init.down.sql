-- Rollback transactions first since it depends on vehicles
DROP TABLE IF EXISTS transactions;

-- Then drop vehicles
DROP TABLE IF EXISTS vehicles;

-- Independent tables
DROP TABLE IF EXISTS sports;
DROP TABLE IF EXISTS credit_cards;
DROP TABLE IF EXISTS trips;
DROP TABLE IF EXISTS gym_visits;
DROP TABLE IF EXISTS meditations;