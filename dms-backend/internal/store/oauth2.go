package store

import (
	"context"
	"time"
)

type OAuth2Client struct {
	ID        string    `json:"id"`
	ClientID  string    `json:"client_id"`
	OwnerID   string    `json:"owner_id"`
	CreatedAt time.Time `json:"created_at"`
}

func (s *Store) SaveOAuth2ClientMapping(ctx context.Context, clientID, ownerID string) error {
	query := `INSERT INTO app.oauth2_clients (client_id, owner_id) VALUES ($1, $2)`
	_, err := s.db.ExecContext(ctx, query, clientID, ownerID)
	return err
}

func (s *Store) GetOAuth2ClientOwner(ctx context.Context, clientID string) (string, error) {
	var ownerID string
	query := `SELECT owner_id FROM app.oauth2_clients WHERE client_id = $1`
	err := s.db.QueryRowContext(ctx, query, clientID).Scan(&ownerID)
	return ownerID, err
}

func (s *Store) ListUserOAuth2Clients(ctx context.Context, ownerID string) ([]OAuth2Client, error) {
	query := `SELECT id, client_id, owner_id, created_at FROM app.oauth2_clients WHERE owner_id = $1 ORDER BY created_at DESC`
	rows, err := s.db.QueryContext(ctx, query, ownerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var clients []OAuth2Client
	for rows.Next() {
		var c OAuth2Client
		if err := rows.Scan(&c.ID, &c.ClientID, &c.OwnerID, &c.CreatedAt); err != nil {
			return nil, err
		}
		clients = append(clients, c)
	}
	return clients, nil
}

func (s *Store) DeleteOAuth2ClientMapping(ctx context.Context, clientID string) error {
	query := `DELETE FROM app.oauth2_clients WHERE client_id = $1`
	_, err := s.db.ExecContext(ctx, query, clientID)
	return err
}
