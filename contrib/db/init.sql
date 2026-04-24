-- Create schemas for different services
CREATE SCHEMA IF NOT EXISTS kratos;
CREATE SCHEMA IF NOT EXISTS keto;
CREATE SCHEMA IF NOT EXISTS hydra;
CREATE SCHEMA IF NOT EXISTS app;

-- Set search paths for the database
-- Note: Service-specific search paths will be set in their respective DSNs
