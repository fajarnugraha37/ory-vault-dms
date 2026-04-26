package store

import (
	"context"
)

type DocumentVersion struct {
	ID            string `json:"id"`
	DocumentID    string `json:"document_id"`
	VersionNumber int    `json:"version_number"`
	StoragePath   string `json:"storage_path"`
	SizeBytes     int64  `json:"size_bytes"`
	CreatedAt     string `json:"created_at"`
}

func (s *Store) CreateDocumentVersion(ctx context.Context, dv *DocumentVersion) error {
	query := `
		INSERT INTO app.document_versions (id, document_id, version_number, storage_path, size_bytes)
		VALUES ($1, $2, $3, $4, $5)
	`
	_, err := s.db.ExecContext(ctx, query, dv.ID, dv.DocumentID, dv.VersionNumber, dv.StoragePath, dv.SizeBytes)
	return err
}

func (s *Store) GetDocumentVersions(ctx context.Context, nodeID string) ([]DocumentVersion, error) {
	query := `
		SELECT id, document_id, version_number, storage_path, size_bytes, created_at
		FROM app.document_versions WHERE document_id = $1 ORDER BY version_number DESC
	`
	rows, err := s.db.QueryContext(ctx, query, nodeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var versions []DocumentVersion
	for rows.Next() {
		var v DocumentVersion
		if err := rows.Scan(&v.ID, &v.DocumentID, &v.VersionNumber, &v.StoragePath, &v.SizeBytes, &v.CreatedAt); err != nil {
			return nil, err
		}
		versions = append(versions, v)
	}
	return versions, nil
}
