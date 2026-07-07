/**
 * Create system_users table in Supabase via the REST SQL API
 * Requires a service role key, but let's try with anon key first
 */
const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const SUPABASE_URL = 'https://baoiiwfxfbvjfsfdmhjm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_QuJS043IZONU1brj_3YhSA_lIUEXeM8';

const PROJECT_REF = 'baoiiwfxfbvjfsfdmhjm';

const SQL = `
CREATE TABLE IF NOT EXISTS system_users (
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
('coadmin@senshikarate.com', 'Assistant Coach', 'Co-Admin', 'Active', TRUE, '{"themeContrast": "standard", "textScale": "standard", "reducedMotion": false, "legibilityFont": "standard"}'),
('spectator@senshikarate.com', 'Spectator Account', 'Viewer', 'Active', FALSE, '{"themeContrast": "standard", "textScale": "standard", "reducedMotion": false, "legibilityFont": "standard"}')
ON CONFLICT (email) DO NOTHING;

NOTIFY pgrst, 'reload schema';
`;

// Try via Supabase Management API (requires service key)
// Instead, let's use the rpc approach via a function or direct query
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function tryCreateViaRPC() {
  console.log('Trying to create system_users via SQL...');
  
  // Try to use the pg_query RPC if it exists
  const { data, error } = await supabase.rpc('exec_sql', { sql: SQL });
  
  if (error) {
    console.log('RPC exec_sql not available:', error.message);
    console.log('\n=== MANUAL STEP REQUIRED ===');
    console.log('Please run the following SQL in your Supabase project SQL Editor:');
    console.log('https://supabase.com/dashboard/project/' + PROJECT_REF + '/sql/new');
    console.log('---');
    console.log(SQL);
    return false;
  }
  
  console.log('SQL executed successfully!');
  
  // Verify
  const { data: users, error: verifyErr } = await supabase.from('system_users').select('*');
  if (verifyErr) {
    console.log('Verification failed:', verifyErr.message);
  } else {
    console.log('system_users table created with', users.length, 'rows:');
    console.log(JSON.stringify(users, null, 2));
  }
  return true;
}

tryCreateViaRPC();
