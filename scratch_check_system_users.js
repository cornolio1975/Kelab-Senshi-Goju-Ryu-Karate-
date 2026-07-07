const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://baoiiwfxfbvjfsfdmhjm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_QuJS043IZONU1brj_3YhSA_lIUEXeM8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function setupSystemUsers() {
  console.log('=== SETTING UP SYSTEM USERS TABLE ===\n');
  
  // Check if table already exists
  const { data: existing, error: checkErr } = await supabase
    .from('system_users')
    .select('email')
    .limit(1);

  if (!checkErr) {
    console.log('system_users table already exists! Current rows:');
    const { data: all } = await supabase.from('system_users').select('*');
    console.log(JSON.stringify(all, null, 2));
    return;
  }

  console.log('system_users table does not exist. Error:', checkErr.message);
  console.log('\nTo create it, run this SQL in your Supabase SQL Editor:');
  console.log('---');
  console.log(`CREATE TABLE IF NOT EXISTS system_users (
    email VARCHAR(150) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Co-Admin', 'Viewer')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('Active', 'Suspended')),
    can_modify BOOLEAN NOT NULL DEFAULT FALSE,
    accessibility JSONB NOT NULL DEFAULT '{"themeContrast": "standard", "textScale": "standard", "reducedMotion": false, "legibilityFont": "standard"}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE system_users DISABLE ROW LEVEL SECURITY;

INSERT INTO system_users (email, name, role, status, can_modify, accessibility) VALUES
('admin@senshikarate.com', 'Tournament Director', 'Admin', 'Active', TRUE, '{"themeContrast": "standard", "textScale": "standard", "reducedMotion": false, "legibilityFont": "standard"}'),
('coadmin@senshikarate.com', 'Assistant Coach', 'Co-Admin', 'Active', FALSE, '{"themeContrast": "standard", "textScale": "standard", "reducedMotion": false, "legibilityFont": "standard"}'),
('spectator@senshikarate.com', 'Spectator Account', 'Viewer', 'Active', FALSE, '{"themeContrast": "standard", "textScale": "standard", "reducedMotion": false, "legibilityFont": "standard"}')
ON CONFLICT (email) DO NOTHING;

NOTIFY pgrst, 'reload schema';`);
}

setupSystemUsers();
