package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
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
var kratosAdminURL string

func init() {
	jwksURL := os.Getenv("JWKS_URL")
	if jwksURL == "" {
		jwksURL = "http://vault-oathkeeper:4456/.well-known/jwks.json"
	}

	kratosAdminURL = os.Getenv("KRATOS_ADMIN_URL")
	if kratosAdminURL == "" {
		kratosAdminURL = "http://vault-kratos:4434"
	}

	var err error
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
			json.NewEncoder(w).Encode(map[string]string{"error": "missing or invalid authorization header"})
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		token, err := jwt.Parse(tokenString, kf.Keyfunc)
		if err != nil || !token.Valid {
			log.Printf("JWT Auth Error: %v", err)
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"error": "invalid token: " + err.Error()})
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"error": "invalid token claims"})
			return
		}

		sub, _ := claims.GetSubject()
		if sub == "" {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"error": "token missing subject"})
			return
		}

		ctx := context.WithValue(r.Context(), UserIDKey, sub)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func SimpleAdminCheck(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID := r.Context().Value(UserIDKey).(string)

		// Perbaikan endpoint Kratos Admin (Gunakan path /admin/identities karena Kratos v1.x redirect ke sana)
		url := fmt.Sprintf("%s/admin/identities/%s", kratosAdminURL, userID)
		resp, err := http.Get(url)
		if err != nil {
			log.Printf("Admin Check Error (Kratos Call): %v", err)
			http.Error(w, "internal server error: failed to connect to identity service", http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			log.Printf("Admin Check Error (Kratos Status): %d for identity %s", resp.StatusCode, userID)
			http.Error(w, "access denied: user identity not found or unauthorized", http.StatusForbidden)
			return
		}

		var identity struct {
			Traits struct {
				Email string `json:"email"`
			} `json:"traits"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&identity); err != nil {
			log.Printf("Admin Check Error (JSON): %v", err)
			http.Error(w, "internal server error: invalid identity data", http.StatusInternalServerError)
			return
		}

		if !strings.HasSuffix(identity.Traits.Email, "@ory-vault.test") && !strings.HasSuffix(identity.Traits.Email, "@ory-vault.admin") {
			log.Printf("Admin Access Denied for email: %s", identity.Traits.Email)
			w.WriteHeader(http.StatusForbidden)
			json.NewEncoder(w).Encode(map[string]string{"error": "only internal users can access admin features"})
			return
		}

		next.ServeHTTP(w, r)
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
		resp := MeResponse{UserID: userID, Msg: "Identity verified."}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	})))

	// Gunakan prefix /admin-api/ agar tidak overlap dengan /api/
	mux.Handle("/admin-api/identities", AuthMiddleware(SimpleAdminCheck(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		adminID := r.Context().Value(UserIDKey).(string)
		if r.Method == "GET" {
			resp, err := http.Get(fmt.Sprintf("%s/admin/identities", kratosAdminURL))
			if err != nil {
				log.Printf("Admin List Error: %v", err)
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			defer resp.Body.Close()
			log.Printf("AUDIT: Admin %s listed all identities", adminID)
			w.Header().Set("Content-Type", "application/json")
			io.Copy(w, resp.Body)
			return
		}
		w.WriteHeader(http.StatusMethodNotAllowed)
	}))))

	mux.Handle("/admin-api/identities/", AuthMiddleware(SimpleAdminCheck(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		adminID := r.Context().Value(UserIDKey).(string)
		parts := strings.Split(r.URL.Path, "/")
		targetID := parts[len(parts)-1]

		if targetID == "" {
			w.WriteHeader(http.StatusBadRequest)
			return
		}

		if r.Method == "DELETE" {
			req, _ := http.NewRequest("DELETE", fmt.Sprintf("%s/admin/identities/%s", kratosAdminURL, targetID), nil)
			resp, err := http.DefaultClient.Do(req)
			if err != nil {
				log.Printf("Admin Delete Error: %v", err)
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			defer resp.Body.Close()
			log.Printf("AUDIT: Admin %s deleted identity %s", adminID, targetID)
			w.WriteHeader(resp.StatusCode)
			io.Copy(w, resp.Body)
			return
		}
		w.WriteHeader(http.StatusMethodNotAllowed)
	}))))

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, "ORY Vault DMS Backend.")
	})

	log.Println("DMS Backend listening on :8080")
	if err := http.ListenAndServe(":8080", mux); err != nil {
		log.Fatal(err)
	}
}
