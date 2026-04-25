package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"regexp"
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

// Regex for Admin API Paths
var (
	reListIdentities    = regexp.MustCompile(`^/admin-api/identities$`)
	reSingleIdentity    = regexp.MustCompile(`^/admin-api/identities/([a-z0-9-]+)$`)
	reIdentityState     = regexp.MustCompile(`^/admin-api/identities/([a-z0-9-]+)/state$`)
	reIdentityTraits    = regexp.MustCompile(`^/admin-api/identities/([a-z0-9-]+)/traits$`)
	reIdentityRecovery  = regexp.MustCompile(`^/admin-api/identities/([a-z0-9-]+)/recovery$`)
	reIdentityVerify    = regexp.MustCompile(`^/admin-api/identities/([a-z0-9-]+)/verify$`)
	reIdentitySessions  = regexp.MustCompile(`^/admin-api/identities/([a-z0-9-]+)/sessions$`)
)

func AdminHandler(w http.ResponseWriter, r *http.Request) {
	adminID := r.Context().Value(UserIDKey).(string)
	path := r.URL.Path

	// 1. List Identities
	if reListIdentities.MatchString(path) {
		if r.Method != "GET" {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		resp, _ := http.Get(fmt.Sprintf("%s/admin/identities", kratosAdminURL))
		defer resp.Body.Close()
		w.Header().Set("Content-Type", "application/json")
		io.Copy(w, resp.Body)
		return
	}

	// 2. State Update
	if matches := reIdentityState.FindStringSubmatch(path); matches != nil {
		targetID := matches[1]
		if r.Method == "PUT" {
			var body struct{ State string `json:"state"` }
			json.NewDecoder(r.Body).Decode(&body)
			patch := []map[string]interface{}{{"op": "replace", "path": "/state", "value": body.State}}
			patchJSON, _ := json.Marshal(patch)
			req, _ := http.NewRequest("PATCH", fmt.Sprintf("%s/admin/identities/%s", kratosAdminURL, targetID), bytes.NewBuffer(patchJSON))
			req.Header.Set("Content-Type", "application/json-patch+json")
			resp, _ := http.DefaultClient.Do(req)
			defer resp.Body.Close()
			log.Printf("AUDIT: Admin %s patched state for %s", adminID, targetID)
			w.WriteHeader(resp.StatusCode)
			io.Copy(w, resp.Body)
			return
		}
	}

	// 3. Trait Update
	if matches := reIdentityTraits.FindStringSubmatch(path); matches != nil {
		targetID := matches[1]
		if r.Method == "PATCH" {
			var traits map[string]interface{}
			json.NewDecoder(r.Body).Decode(&traits)
			patch := []map[string]interface{}{{"op": "replace", "path": "/traits", "value": traits}}
			patchJSON, _ := json.Marshal(patch)
			req, _ := http.NewRequest("PATCH", fmt.Sprintf("%s/admin/identities/%s", kratosAdminURL, targetID), bytes.NewBuffer(patchJSON))
			req.Header.Set("Content-Type", "application/json-patch+json")
			resp, _ := http.DefaultClient.Do(req)
			defer resp.Body.Close()
			log.Printf("AUDIT: Admin %s updated traits for %s", adminID, targetID)
			w.WriteHeader(resp.StatusCode)
			io.Copy(w, resp.Body)
			return
		}
	}

	// 4. Manual Recovery
	if matches := reIdentityRecovery.FindStringSubmatch(path); matches != nil {
		targetID := matches[1]
		if r.Method == "POST" {
			body := map[string]string{"identity_id": targetID}
			bodyJSON, _ := json.Marshal(body)
			req, _ := http.NewRequest("POST", fmt.Sprintf("%s/admin/recovery/link", kratosAdminURL), bytes.NewBuffer(bodyJSON))
			req.Header.Set("Content-Type", "application/json")
			resp, _ := http.DefaultClient.Do(req)
			defer resp.Body.Close()
			log.Printf("AUDIT: Admin %s generated recovery link for %s", adminID, targetID)
			w.WriteHeader(resp.StatusCode)
			w.Header().Set("Content-Type", "application/json")
			io.Copy(w, resp.Body)
			return
		}
	}

	// 5. Manual Verify
	if matches := reIdentityVerify.FindStringSubmatch(path); matches != nil {
		targetID := matches[1]
		if r.Method == "POST" {
			// Fetch to get verifiable address ID
			respGet, _ := http.Get(fmt.Sprintf("%s/admin/identities/%s", kratosAdminURL, targetID))
			var identity map[string]interface{}
			json.NewDecoder(respGet.Body).Decode(&identity)
			respGet.Body.Close()

			patch := []map[string]interface{}{
				{"op": "replace", "path": "/verifiable_addresses/0/status", "value": "completed"},
				{"op": "replace", "path": "/verifiable_addresses/0/verified", "value": true},
			}
			patchJSON, _ := json.Marshal(patch)
			req, _ := http.NewRequest("PATCH", fmt.Sprintf("%s/admin/identities/%s", kratosAdminURL, targetID), bytes.NewBuffer(patchJSON))
			req.Header.Set("Content-Type", "application/json-patch+json")
			resp, _ := http.DefaultClient.Do(req)
			defer resp.Body.Close()
			log.Printf("AUDIT: Admin %s verified %s", adminID, targetID)
			w.WriteHeader(resp.StatusCode)
			return
		}
	}

	// 6. Sessions Management
	if matches := reIdentitySessions.FindStringSubmatch(path); matches != nil {
		targetID := matches[1]
		if r.Method == "GET" {
			resp, _ := http.Get(fmt.Sprintf("%s/admin/identities/%s/sessions", kratosAdminURL, targetID))
			defer resp.Body.Close()
			w.Header().Set("Content-Type", "application/json")
			io.Copy(w, resp.Body)
			return
		} else if r.Method == "DELETE" {
			req, _ := http.NewRequest("DELETE", fmt.Sprintf("%s/admin/identities/%s/sessions", kratosAdminURL, targetID), nil)
			resp, _ := http.DefaultClient.Do(req)
			defer resp.Body.Close()
			log.Printf("AUDIT: Admin %s revoked sessions for %s", adminID, targetID)
			w.WriteHeader(resp.StatusCode)
			return
		}
	}

	// 7. Single Identity (GET/DELETE)
	if matches := reSingleIdentity.FindStringSubmatch(path); matches != nil {
		targetID := matches[1]
		if r.Method == "GET" {
			resp, _ := http.Get(fmt.Sprintf("%s/admin/identities/%s", kratosAdminURL, targetID))
			defer resp.Body.Close()
			w.Header().Set("Content-Type", "application/json")
			io.Copy(w, resp.Body)
			return
		} else if r.Method == "DELETE" {
			req, _ := http.NewRequest("DELETE", fmt.Sprintf("%s/admin/identities/%s", kratosAdminURL, targetID), nil)
			resp, _ := http.DefaultClient.Do(req)
			defer resp.Body.Close()
			log.Printf("AUDIT: Admin %s deleted %s", adminID, targetID)
			w.WriteHeader(resp.StatusCode)
			return
		}
	}

	w.WriteHeader(http.StatusNotFound)
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

	// Central Admin Handler dengan Regex Matching yang ketat
	mux.Handle("/admin-api/", AuthMiddleware(SimpleAdminCheck(http.HandlerFunc(AdminHandler))))

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, "ORY Vault DMS Backend.")
	})

	log.Println("DMS Backend listening on :8080")
	if err := http.ListenAndServe(":8080", mux); err != nil {
		log.Fatal(err)
	}
}
