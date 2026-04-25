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
	dsn := os.Getenv("DSN")
	if dsn == "" { dsn = "postgres://ory:vault-pass@vault-db:5432/ory_vault?sslmode=disable&search_path=kratos" }
	
	jwksURL := os.Getenv("JWKS_URL")
	if jwksURL == "" { jwksURL = "http://vault-oathkeeper:4456/.well-known/jwks.json" }

	kratosAdminURL := os.Getenv("KRATOS_ADMIN_URL")
	if kratosAdminURL == "" { kratosAdminURL = "http://vault-kratos:4434" }

	// 1. Initialize DB Store
	st, err := store.NewPostgresStore(dsn)
	if err != nil { log.Fatalf("Store failed: %v", err) }
	defer st.Close()

	// 2. Initialize Kratos Client
	kr := kratos.NewClient(kratosAdminURL)

	// 3. Initialize JWKS Keyfunc
	kf, err := keyfunc.NewDefault([]string{jwksURL})
	if err != nil { log.Fatalf("JWKS failed: %v", err) }

	// 4. Setup Router
	router := api.NewRouter(st, kr, kf)

	log.Println("DMS Enterprise Backend listening on :8080")
	if err := http.ListenAndServe(":8080", router); err != nil {
		log.Fatal(err)
	}
}
