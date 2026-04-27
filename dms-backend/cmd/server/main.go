package main

import (
	"log/slog"
	"net/http"
	"os"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/nugra/ory-vault/dms-backend/internal/api"
	"github.com/nugra/ory-vault/dms-backend/internal/hydra"
	"github.com/nugra/ory-vault/dms-backend/internal/keto"
	"github.com/nugra/ory-vault/dms-backend/internal/kratos"
	"github.com/nugra/ory-vault/dms-backend/internal/storage"
	"github.com/nugra/ory-vault/dms-backend/internal/store"
)

func main() {
	// 0. Setup structured JSON logger
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	// 1. Hardened Environment Validation
	kratosAdminURL := os.Getenv("KRATOS_ADMIN_URL")
	if kratosAdminURL == "" { kratosAdminURL = "REQUIRED_CONFIG_MISSING_KRATOS_ADMIN_URL" }

	hydraAdminURL := os.Getenv("HYDRA_ADMIN_URL")
	if hydraAdminURL == "" { hydraAdminURL = "REQUIRED_CONFIG_MISSING_HYDRA_ADMIN_URL" }

	ketoReadURL := os.Getenv("KETO_READ_URL")
	if ketoReadURL == "" { ketoReadURL = "REQUIRED_CONFIG_MISSING_KETO_READ_URL" }

	ketoWriteURL := os.Getenv("KETO_WRITE_URL")
	if ketoWriteURL == "" { ketoWriteURL = "REQUIRED_CONFIG_MISSING_KETO_WRITE_URL" }

	jwksURL := os.Getenv("JWKS_URL")
	if jwksURL == "" { jwksURL = "REQUIRED_CONFIG_MISSING_JWKS_URL" }

	postgresDSN := os.Getenv("DSN")
	if postgresDSN == "" { postgresDSN = "REQUIRED_CONFIG_MISSING_DSN" }

	storageEndpoint := os.Getenv("STORAGE_ENDPOINT")
	if storageEndpoint == "" { storageEndpoint = "REQUIRED_CONFIG_MISSING_STORAGE_ENDPOINT" }

	storageAccessKey := os.Getenv("STORAGE_ACCESS_KEY")
	if storageAccessKey == "" { storageAccessKey = "REQUIRED_CONFIG_MISSING_STORAGE_ACCESS_KEY" }

	storageSecretKey := os.Getenv("STORAGE_SECRET_KEY")
	if storageSecretKey == "" { storageSecretKey = "REQUIRED_CONFIG_MISSING_STORAGE_SECRET_KEY" }

	// 2. Init SQL Store
	s, err := store.NewPostgresStore(postgresDSN)
	if err != nil { 
		slog.Error("Failed to connect to database", "error", err, "dsn", "provided")
		os.Exit(1)
	}
	defer s.Close()

	// 3. Init Ory & Storage Clients
	k := kratos.NewClient(kratosAdminURL)
	kc := keto.NewClient(ketoReadURL, ketoWriteURL)
	hy := hydra.NewClient(hydraAdminURL)
	st, err := storage.NewMinioStorage(storageEndpoint, storageAccessKey, storageSecretKey, "dms-vault")
	if err != nil {
		slog.Error("Failed to connect to MinIO Storage", "error", err)
		os.Exit(1)
	}

	// 4. Auto Seeding (Bootstrap)
	if err := s.SeedSystem(k); err != nil {
		slog.Warn("Seeder encountered warnings", "error", err)
	}

	// 5. Init JWKS Fetcher
	kf, err := keyfunc.NewDefault([]string{jwksURL})
	if err != nil { 
		slog.Error("Failed to initialize JWKS fetcher", "error", err, "url", jwksURL)
		os.Exit(1)
	}

	// 6. Start Router
	router := api.NewRouter(s, k, st, kc, kf, hy)

	slog.Info("DMS Backend Server Initialized", "port", "8080", "node", "hardened-go-01")
	if err := http.ListenAndServe(":8080", router); err != nil {
		slog.Error("Server shutdown unexpectedly", "error", err)
		os.Exit(1)
	}
}
