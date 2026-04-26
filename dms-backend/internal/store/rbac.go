package store

import (
	"context"
)

type Role struct {
	ID          string `json:"id"`
	Description string `json:"description"`
}

func (s *Store) CreateRole(ctx context.Context, id, description string) error {
	query := `INSERT INTO enterprise.roles (id, description) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET description = $2`
	_, err := s.db.ExecContext(ctx, query, id, description)
	return err
}

func (s *Store) ListRoles(ctx context.Context, limit, offset int) ([]Role, error) {
	query := `SELECT id, description FROM enterprise.roles ORDER BY id ASC LIMIT $1 OFFSET $2`
	rows, err := s.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var roles []Role
	for rows.Next() {
		var r Role
		if err := rows.Scan(&r.ID, &r.Description); err != nil {
			return nil, err
		}
		roles = append(roles, r)
	}
	return roles, nil
}

func (s *Store) DeleteRole(ctx context.Context, id string) error {
	query := `DELETE FROM enterprise.roles WHERE id = $1`
	_, err := s.db.ExecContext(ctx, query, id)
	return err
}

func (s *Store) AssignRole(ctx context.Context, userID, roleID string) error {
	query := `INSERT INTO enterprise.user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`
	_, err := s.db.ExecContext(ctx, query, userID, roleID)
	return err
}

func (s *Store) RemoveRole(ctx context.Context, userID, roleID string) error {
	query := `DELETE FROM enterprise.user_roles WHERE user_id = $1 AND role_id = $2`
	_, err := s.db.ExecContext(ctx, query, userID, roleID)
	return err
}

func (s *Store) GetUserRoles(ctx context.Context, userID string) ([]string, error) {
	query := `SELECT role_id FROM enterprise.user_roles WHERE user_id = $1`
	rows, err := s.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var roles []string
	for rows.Next() {
		var r string
		if err := rows.Scan(&r); err != nil {
			return nil, err
		}
		roles = append(roles, r)
	}
	return roles, nil
}

func (s *Store) HasRole(ctx context.Context, userID, roleID string) (bool, error) {
	var exists bool
	query := `SELECT EXISTS(SELECT 1 FROM enterprise.user_roles WHERE user_id = $1 AND role_id = $2)`
	err := s.db.QueryRowContext(ctx, query, userID, roleID).Scan(&exists)
	return exists, err
}
