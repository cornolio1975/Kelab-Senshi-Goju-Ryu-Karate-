-- CREATE SYSTEM USERS TABLE FOR ADMIN USER ACCESSIBILITY & DATA MODIFY CONTROLS
CREATE TABLE IF NOT EXISTS system_users (
    email VARCHAR(150) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Co-Admin', 'Viewer')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('Active', 'Suspended')),
    can_modify BOOLEAN NOT NULL DEFAULT FALSE,
    accessibility JSONB NOT NULL DEFAULT '{"themeContrast": "standard", "textScale": "standard", "reducedMotion": false, "legibilityFont": "standard"}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable Row Level Security to allow client writes via the Anon key
ALTER TABLE system_users DISABLE ROW LEVEL SECURITY;

-- Seed Initial Default Users (Admin gets can_modify = TRUE by default)
INSERT INTO system_users (email, name, role, status, can_modify, accessibility) VALUES
('admin@senshikarate.com', 'Tournament Director', 'Admin', 'Active', TRUE, '{"themeContrast": "standard", "textScale": "standard", "reducedMotion": false, "legibilityFont": "standard"}'),
('coadmin@senshikarate.com', 'Assistant Coach', 'Co-Admin', 'Active', FALSE, '{"themeContrast": "standard", "textScale": "standard", "reducedMotion": false, "legibilityFont": "standard"}'),
('spectator@senshikarate.com', 'Spectator Account', 'Viewer', 'Active', FALSE, '{"themeContrast": "standard", "textScale": "standard", "reducedMotion": false, "legibilityFont": "standard"}')
ON CONFLICT (email) DO NOTHING;

-- Force PostgREST schema cache to reload
NOTIFY pgrst, 'reload schema';
