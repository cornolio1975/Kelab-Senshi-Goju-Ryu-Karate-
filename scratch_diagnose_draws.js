const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://baoiiwfxfbvjfsfdmhjm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_QuJS043IZONU1brj_3YhSA_lIUEXeM8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function diagnose() {
  console.log('=== DRAW DIAGNOSIS ===\n');

  // 1. Get all categories
  const { data: cats, error: catErr } = await supabase.from('categories').select('*');
  if (catErr) { console.error('Categories error:', catErr); return; }
  console.log(`Total categories: ${cats.length}`);

  // 2. Get all participant_categories
  const { data: pcs, error: pcErr } = await supabase.from('participant_categories').select('*');
  if (pcErr) { console.error('PC error:', pcErr); return; }
  console.log(`Total participant_categories rows: ${pcs.length}`);

  // 3. Get all non-deleted, non-cancelled participants
  const { data: parts, error: partErr } = await supabase
    .from('participants')
    .select('id, full_name, status, deleted_at')
    .is('deleted_at', null)
    .neq('status', 'Cancelled');
  if (partErr) { console.error('Participants error:', partErr); return; }
  console.log(`Total active participants: ${parts.length}\n`);

  // 4. Per-category diagnostics
  console.log('--- Per Category ---');
  for (const cat of cats) {
    const mappings = pcs.filter(m => m.category_id === cat.id);
    const activeAthletes = parts.filter(p => mappings.some(m => m.participant_id === p.id));
    const confirmed = activeAthletes.filter(p => p.status === 'Confirmed' || p.status === 'Checked In');
    console.log(`  [${cat.name}] mappings:${mappings.length} active:${activeAthletes.length} confirmed:${confirmed.length}`);
  }

  // 5. Check existing bouts
  const { data: bouts, error: boutErr } = await supabase.from('bouts').select('category_id, count').select('category_id');
  if (boutErr) { console.error('Bouts error:', boutErr); return; }
  const boutsByCat = {};
  bouts.forEach(b => { boutsByCat[b.category_id] = (boutsByCat[b.category_id] || 0) + 1; });
  console.log('\n--- Existing bouts per category ---');
  for (const cat of cats) {
    const count = boutsByCat[cat.id] || 0;
    if (count > 0) console.log(`  [${cat.name}] ${count} bouts`);
  }

  // 6. Check for participant status distribution
  console.log('\n--- Participant Status distribution ---');
  const { data: allParts, error: allPartErr } = await supabase
    .from('participants')
    .select('id, status, deleted_at');
  if (!allPartErr) {
    const byStatus = {};
    allParts.forEach(p => {
      const key = p.deleted_at ? `${p.status}(deleted)` : p.status;
      byStatus[key] = (byStatus[key] || 0) + 1;
    });
    console.log(JSON.stringify(byStatus, null, 2));
  }
}

diagnose();
