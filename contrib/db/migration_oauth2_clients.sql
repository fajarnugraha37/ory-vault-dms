-- Migration: Create OAuth2 Client Mapping table
CREATE TABLE IF NOT EXISTS app.oauth2_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id TEXT NOT NULL UNIQUE,
    owner_id UUID NOT NULL, -- The user who registered this client
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookup during middleware mapping
CREATE INDEX IF NOT EXISTS idx_oauth2_clients_client_id ON app.oauth2_clients(client_id);
