-- Create schemas for different services
CREATE SCHEMA IF NOT EXISTS kratos;
CREATE SCHEMA IF NOT EXISTS keto;
CREATE SCHEMA IF NOT EXISTS hydra;
CREATE SCHEMA IF NOT EXISTS app;

-- Unified DMS Nodes (Folders and Files)
CREATE TABLE IF NOT EXISTS app.nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('folder', 'file')),
    parent_id UUID REFERENCES app.nodes(id),
    owner_id UUID NOT NULL,
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    public_link_token TEXT UNIQUE
);

-- File Metadata Extension
CREATE TABLE IF NOT EXISTS app.file_metadata (
    node_id UUID PRIMARY KEY REFERENCES app.nodes(id) ON DELETE CASCADE,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    storage_path TEXT NOT NULL, -- Path di MinIO
    version INT NOT NULL DEFAULT 1
);

-- Version History
CREATE TABLE IF NOT EXISTS app.document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES app.nodes(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    storage_path TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(document_id, version_number)
);

-- Set search paths for the database
-- Note: Service-specific search paths will be set in their respective DSNs
