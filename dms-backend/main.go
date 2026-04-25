package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/golang-jwt/jwt/v5"
)

type MeResponse struct {
	UserID string `json:"user_id"`
	Msg    string `json:"message"`
}

type UserContextKey string

const (
	UserIDKey UserContextKey = "user_id"
)

var kf keyfunc.Keyfunc

func init() {
	jwksURL := os.Getenv("JWKS_URL")
	if jwksURL == "" {
		jwksURL = "http://vault-oathkeeper:4456/.well-known/jwks.json"
	}

	var err error
	// NewDefault di v3 mendukung background refresh otomatis dari list URL
	kf, err = keyfunc.NewDefault([]string{jwksURL})

	if err != nil {
		log.Fatalf("Failed to create keyfunc from JWKS URL %s: %v", jwksURL, err)
	}
	log.Printf("JWT Validation initialized with Dynamic JWKS from %s", jwksURL)
}

func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			w.WriteHeader(http.StatusUnauthorized)
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]string{"error": "missing or invalid authorization header"})
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		// Validasi signature menggunakan kunci yang di-refresh otomatis
		token, err := jwt.Parse(tokenString, kf.Keyfunc)
		if err != nil || !token.Valid {
			w.WriteHeader(http.StatusUnauthorized)
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]string{"error": "invalid token: " + err.Error()})
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			w.WriteHeader(http.StatusUnauthorized)
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]string{"error": "invalid token claims"})
			return
		}

		sub, _ := claims.GetSubject()
		if sub == "" {
			w.WriteHeader(http.StatusUnauthorized)
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]string{"error": "token missing subject"})
			return
		}

		ctx := context.WithValue(r.Context(), UserIDKey, sub)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func main() {
	mux := http.NewServeMux()

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, "OK")
	})

	mux.Handle("/api/me", AuthMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := r.Context().Value(UserIDKey).(string)
		if !ok {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}

		resp := MeResponse{
			UserID: userID,
			Msg:    "Welcome to the Production-Grade Zero-Trust zone! Keys are dynamically fetched from Oathkeeper.",
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	})))

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, "ORY Vault DMS Backend (Dynamic JWKS).")
	})

	log.Println("DMS Backend listening on :8080")
	if err := http.ListenAndServe(":8080", mux); err != nil {
		log.Fatal(err)
	}
}
