BEGIN;

-- 1. Create the unified nodes table
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

-- 2. Create the file metadata table
CREATE TABLE IF NOT EXISTS app.file_metadata (
    node_id UUID PRIMARY KEY REFERENCES app.nodes(id) ON DELETE CASCADE,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    storage_path TEXT NOT NULL,
    version INT NOT NULL DEFAULT 1
);

-- 3. Migrate Folders
INSERT INTO app.nodes (id, name, type, parent_id, owner_id, created_by, updated_by, created_at, updated_at)
SELECT id, name, 'folder', parent_id, owner_id, owner_id, owner_id, created_at, updated_at
FROM app.folders;

-- 4. Migrate Documents
INSERT INTO app.nodes (id, name, type, parent_id, owner_id, created_by, updated_by, created_at, updated_at, public_link_token)
SELECT id, name, 'file', folder_id, owner_id, owner_id, owner_id, created_at, updated_at, public_link_token
FROM app.documents;

-- 5. Migrate File Details
INSERT INTO app.file_metadata (node_id, mime_type, size_bytes, storage_path, version)
SELECT id, mime_type, size_bytes, storage_path, version
FROM app.documents;

-- 6. Update document_versions to reference nodes
ALTER TABLE app.document_versions 
DROP CONSTRAINT IF EXISTS document_versions_document_id_fkey;

ALTER TABLE app.document_versions
ADD CONSTRAINT document_versions_node_id_fkey 
FOREIGN KEY (document_id) REFERENCES app.nodes(id) ON DELETE CASCADE;

-- 7. Migrate Keto Relation Tuples
-- Change all to 'nodes' (lowercase)
UPDATE keto.keto_relation_tuples 
SET namespace = 'nodes' 
WHERE namespace IN ('Folder', 'Document', 'Node');

-- 8. Cleanup old tables
DROP TABLE IF EXISTS app.documents CASCADE;
DROP TABLE IF EXISTS app.folders CASCADE;

COMMIT;
