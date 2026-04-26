package main

import (
	"log"
	"net/http"
	"os"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/nugra/ory-vault/dms-backend/internal/api"
	"github.com/nugra/ory-vault/dms-backend/internal/kratos"
	"github.com/nugra/ory-vault/dms-backend/internal/store"
)

func main() {
	kratosAdminURL := os.Getenv("KRATOS_ADMIN_URL")
	if kratosAdminURL == "" {
		kratosAdminURL = "http://REQUIRED_CONFIG_MISSING_KRATOS_ADMIN_URL"
	}

	jwksURL := os.Getenv("JWKS_URL")
	if jwksURL == "" {
		jwksURL = "http://REQUIRED_CONFIG_MISSING_JWKS_URL"
	}

	postgresDSN := os.Getenv("DSN")
	if postgresDSN == "" {
		postgresDSN = "postgres://REQUIRED_CONFIG_MISSING_DSN"
	}

	// 1. Init SQL Store
	s, err := store.NewPostgresStore(postgresDSN)
	if err != nil {
		log.Fatalf("CRITICAL: Failed to connect to DB. Check your DSN environment variable. Error: %v", err)
	}
	defer s.Close()

	// 2. Init Kratos Client
	k := kratos.NewClient(kratosAdminURL)

	// 3. AUTO SEEDING (Bootstrap)
	if err := s.SeedSystem(k); err != nil {
		log.Printf("SEEDER_WARNING: Bootstrap process encountered issues: %v", err)
	}

	// 4. Init JWKS Fetcher
	kf, err := keyfunc.NewDefault([]string{jwksURL})
	if err != nil {
		log.Fatalf("CRITICAL: Failed to init JWKS fetcher. Check your JWKS_URL. Error: %v", err)
	}

	// 5. Start Router
	router := api.NewRouter(s, k, kf)

	log.Println("DMS Backend started on :8080")
	if err := http.ListenAndServe(":8080", router); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
