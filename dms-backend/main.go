package main

import (
	"encoding/json"
	"fmt"
	"net/http"
)

type MeResponse struct {
	UserID string `json:"user_id"`
	Msg    string `json:"message"`
}

func main() {
	// Public Health Check
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, "OK")
	})

	// Protected Me Endpoint
	http.HandleFunc("/api/me", func(w http.ResponseWriter, r *http.Request) {
		userID := r.Header.Get("X-User-Id")
		if userID == "" {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"error": "missing X-User-Id header"})
			return
		}

		resp := MeResponse{
			UserID: userID,
			Msg:    "Welcome to the secure zone!",
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	})

	// Default handler
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		userID := r.Header.Get("X-User-Id")
		if userID == "" {
			fmt.Fprintf(w, "Hello, Anonymous! (No X-User-Id header found)")
		} else {
			fmt.Fprintf(w, "Hello, User: %s!", userID)
		}
	})

	fmt.Println("DMS Backend listening on :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		panic(err)
	}
}
