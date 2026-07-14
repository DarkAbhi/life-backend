package db

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

func buildDSN() string {
	host := getenv("DB_HOSTNAME", "localhost")
	port := getenv("DB_PORT", "5432")
	user := getenv("DB_USERNAME", "user")
	pass := getenv("DB_PASSWORD", "pass")
	name := getenv("DB_NAME", "life")
	ssl := getenv("DB_SSLMODE", "disable")
	return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s", user, pass, host, port, name, ssl)
}

func migrationsPath() (string, error) {
	// Expecting ./migrations at repo root (adjust if yours differs)
	wd, err := os.Getwd()
	if err != nil {
		return "", err
	}
	// If running from cmd/, go up one
	if filepath.Base(wd) == "cmd" {
		wd = filepath.Dir(wd)
	}
	p := filepath.Join(wd, "migrations")
	return "file://" + p, nil
}

func RunMigrations() error {
	src, err := migrationsPath()
	if err != nil {
		return err
	}
	dsn := buildDSN()
	m, err := migrate.New(src, dsn)
	if err != nil {
		return err
	}
	defer closeSilently(m)
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return err
	}
	log.Println("✅ migrations up applied")
	return nil
}

func RollbackMigration() error {
	src, err := migrationsPath()
	if err != nil {
		return err
	}
	dsn := buildDSN()
	m, err := migrate.New(src, dsn)
	if err != nil {
		return err
	}
	defer closeSilently(m)
	if err := m.Steps(-1); err != nil {
		return err
	}
	log.Println("↩️  rolled back 1 step")
	return nil
}

func ShowMigrationVersion() error {
	src, err := migrationsPath()
	if err != nil {
		return err
	}
	dsn := buildDSN()
	m, err := migrate.New(src, dsn)
	if err != nil {
		return err
	}
	defer closeSilently(m)
	v, dirty, err := m.Version()
	if err == migrate.ErrNilVersion {
		log.Println("📌 version: none (no migrations applied)")
		return nil
	}
	if err != nil {
		return err
	}
	log.Printf("📌 version: %d (dirty=%v)\n", v, dirty)
	return nil
}

func RunMigrationSteps(n int) error {
	src, err := migrationsPath()
	if err != nil {
		return err
	}
	dsn := buildDSN()
	m, err := migrate.New(src, dsn)
	if err != nil {
		return err
	}
	defer closeSilently(m)
	if err := m.Steps(n); err != nil {
		return err
	}
	log.Printf("🔂 applied steps: %d\n", n)
	return nil
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func closeSilently(m *migrate.Migrate) {
	_, _ = m.Close()
}