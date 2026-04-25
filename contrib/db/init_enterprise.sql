-- Schema for Audit and RBAC
CREATE SCHEMA IF NOT EXISTS enterprise;

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS enterprise.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    admin_id UUID NOT NULL,
    action TEXT NOT NULL,
    target_id UUID,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT
);

-- Roles Table
CREATE TABLE IF NOT EXISTS enterprise.roles (
    id TEXT PRIMARY KEY, -- e.g. 'super_admin', 'editor'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Roles Mapping
CREATE TABLE IF NOT EXISTS enterprise.user_roles (
    user_id UUID NOT NULL,
    role_id TEXT NOT NULL REFERENCES enterprise.roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id)
);

-- Seed Initial Roles
INSERT INTO enterprise.roles (id, description) VALUES 
('admin', 'Full system access'),
('editor', 'Can manage documents but not users'),
('viewer', 'Read-only access')
ON CONFLICT DO NOTHING;
