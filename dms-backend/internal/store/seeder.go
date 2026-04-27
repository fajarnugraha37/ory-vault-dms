package store

import (
	"context"
	"log/slog"
	"github.com/nugra/ory-vault/dms-backend/internal/kratos"
)

func (s *Store) SeedSystem(k *kratos.Client) error {
	ctx := context.Background()

	// 1. Check if seeding is needed
	identities, _, err := k.ListIdentities(ctx, 1, "")
	if err != nil { return err }
	if len(identities) > 0 {
		slog.Info("Identity store not empty, skipping bootstrap seeder.")
		return nil
	}

	slog.Info("Empty system detected. Starting DMS bootstrap seeder...")

	// 2. Ensure basic roles exist in DB
	s.CreateRole(ctx, "admin", "System Administrator with full access")
	s.CreateRole(ctx, "staff", "Standard user with document access")

	users := []struct {
		Email    string
		Password string
		Role     string
		Traits   map[string]interface{}
	}{
		{
			Email: "admin@ory-vault.test", Password: "test1234", Role: "admin",
			Traits: map[string]interface{}{"first_name": "System", "last_name": "Admin", "division": "Operations"},
		},
		{
			Email: "staff@ory-vault.test", Password: "test1234", Role: "admin",
			Traits: map[string]interface{}{"first_name": "System", "last_name": "Staff", "division": "Operations"},
		},
		{
			Email: "account@example.com", Password: "test1234", Role: "staff",
			Traits: map[string]interface{}{"first_name": "External", "last_name": "User", "division": "Guest"},
		},
		{
			Email: "staff@example.com", Password: "test1234", Role: "staff",
			Traits: map[string]interface{}{"first_name": "External", "last_name": "Staff", "division": "Guest"},
		},
	}

	for _, u := range users {
		id, err := k.CreateIdentityWithPassword(ctx, u.Email, u.Password, "default", u.Traits)
		if err != nil {
			slog.Error("Failed to seed identity", "email", u.Email, "error", err)
			continue
		}

		if u.Role != "" {
			err = s.AssignRole(ctx, id.Id, u.Role)
			if err != nil {
				slog.Error("Failed to assign bootstrap role", "email", u.Email, "role", u.Role, "error", err)
			}
		}
		slog.Info("Bootstrap identity initialized", "email", u.Email, "role", u.Role)
	}

	slog.Info("System bootstrap sequence completed.")
	return nil
}
