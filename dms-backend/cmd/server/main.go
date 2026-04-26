package main

import (
	"log"
	"net/http"
	"os"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/nugra/ory-vault/dms-backend/internal/api"
	"github.com/nugra/ory-vault/dms-backend/internal/keto"
	"github.com/nugra/ory-vault/dms-backend/internal/kratos"
	"github.com/nugra/ory-vault/dms-backend/internal/storage"
	"github.com/nugra/ory-vault/dms-backend/internal/store"
	)

	func main() {
	// Menghapus default value yang benar agar sistem langsung gagal jika env tidak di-set
	kratosAdminURL := os.Getenv("KRATOS_ADMIN_URL")
	if kratosAdminURL == "" { kratosAdminURL = "http://REQUIRED_CONFIG_MISSING_KRATOS_ADMIN_URL" }

	ketoReadURL := os.Getenv("KETO_READ_URL")
	if ketoReadURL == "" { ketoReadURL = "REQUIRED_CONFIG_MISSING_KETO_READ_URL" }

	ketoWriteURL := os.Getenv("KETO_WRITE_URL")
	if ketoWriteURL == "" { ketoWriteURL = "REQUIRED_CONFIG_MISSING_KETO_WRITE_URL" }

	jwksURL := os.Getenv("JWKS_URL")
	if jwksURL == "" { jwksURL = "http://REQUIRED_CONFIG_MISSING_JWKS_URL" }

	// Mengembalikan ke DSN (bukan DATABASE_URL)
	postgresDSN := os.Getenv("DSN")
	if postgresDSN == "" { postgresDSN = "postgres://REQUIRED_CONFIG_MISSING_DSN" }

	storageEndpoint := os.Getenv("STORAGE_ENDPOINT")
	if storageEndpoint == "" { storageEndpoint = "REQUIRED_CONFIG_MISSING_STORAGE_ENDPOINT" }

	storageAccessKey := os.Getenv("STORAGE_ACCESS_KEY")
	if storageAccessKey == "" { storageAccessKey = "REQUIRED_CONFIG_MISSING_STORAGE_ACCESS_KEY" }

	storageSecretKey := os.Getenv("STORAGE_SECRET_KEY")
	if storageSecretKey == "" { storageSecretKey = "REQUIRED_CONFIG_MISSING_STORAGE_SECRET_KEY" }

	// 1. Init SQL Store
	s, err := store.NewPostgresStore(postgresDSN)
	if err != nil { 
		log.Fatalf("CRITICAL: Failed to connect to DB. Check your DSN environment variable. Error: %v", err) 
	}
	defer s.Close()

	// 2. Init Kratos & Keto Clients
	k := kratos.NewClient(kratosAdminURL)
	kc := keto.NewClient(ketoReadURL, ketoWriteURL)

	// 3. Init MinIO Storage
	st, err := storage.NewMinioStorage(storageEndpoint, storageAccessKey, storageSecretKey, "dms-vault")
	if err != nil {
		log.Fatalf("CRITICAL: Failed to connect to MinIO Storage. Check your STORAGE_* environment variables. Error: %v", err)
	}

	// 4. AUTO SEEDING (Bootstrap)
	if err := s.SeedSystem(k); err != nil {
		log.Printf("SEEDER_WARNING: Bootstrap process encountered issues: %v", err)
	}

	// 5. Init JWKS Fetcher
	kf, err := keyfunc.NewDefault([]string{jwksURL})
	if err != nil { 
		log.Fatalf("CRITICAL: Failed to init JWKS fetcher. Check your JWKS_URL. Error: %v", err) 
	}

	// 6. Start Router
	router := api.NewRouter(s, k, st, kc, kf)

	log.Println("DMS Backend started on :8080")
	if err := http.ListenAndServe(":8080", router); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
