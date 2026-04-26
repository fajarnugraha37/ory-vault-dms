-- Create schemas for different services
CREATE SCHEMA IF NOT EXISTS kratos;
CREATE SCHEMA IF NOT EXISTS keto;
CREATE SCHEMA IF NOT EXISTS hydra;
CREATE SCHEMA IF NOT EXISTS app;

-- DMS Core Metadata
CREATE TABLE IF NOT EXISTS app.folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    parent_id UUID REFERENCES app.folders(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    folder_id UUID REFERENCES app.folders(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    storage_path TEXT NOT NULL, -- Path di MinIO
    version INT NOT NULL DEFAULT 1,
    public_link_token TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app.document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES app.documents(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    storage_path TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(document_id, version_number)
);

-- Set search paths for the database
-- Note: Service-specific search paths will be set in their respective DSNs
