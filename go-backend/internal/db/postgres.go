package db

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

var DB *sql.DB

func ConnectDB() *sql.DB {
	dbHost := os.Getenv("DB_HOSTNAME")
	dbPort := os.Getenv("DB_PORT")
	dbUser := os.Getenv("DB_USERNAME")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")

	dsn := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable&timezone=UTC",
		dbUser, dbPassword, dbHost, dbPort, dbName,
	)

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Fatalf("❌ Failed to open DB connection: %v", err)
	}

	// Optional: set connection pool settings
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(25)
	db.SetConnMaxLifetime(5 * time.Minute)

	// Verify connection
	if err := db.Ping(); err != nil {
		log.Fatalf("❌ Failed to ping DB: %v", err)
	}

	log.Println("✅ Connected to PostgreSQL database")
	DB = db
	return DB
}
