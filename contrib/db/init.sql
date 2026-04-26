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
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Set search paths for the database
-- Note: Service-specific search paths will be set in their respective DSNs
