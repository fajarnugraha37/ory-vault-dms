package store

import (
	"database/sql"
	"log"

	_ "github.com/lib/pq"
)

type Store struct {
	db *sql.DB
}

func NewPostgresStore(dsn string) (*Store, error) {
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, err
	}

	if err := db.Ping(); err != nil {
		return nil, err
	}

	// Hardened search_path as per protocol
	if _, err := db.Exec("SET search_path TO enterprise, app, public"); err != nil {
		log.Printf("DB_WARN: Failed to set search_path: %v", err)
	}

	return &Store{db: db}, nil
}

func (s *Store) Close() error {
	return s.db.Close()
}
