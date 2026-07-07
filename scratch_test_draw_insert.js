const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://baoiiwfxfbvjfsfdmhjm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_QuJS043IZONU1brj_3YhSA_lIUEXeM8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testDraw() {
  const catId = 'e25e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f'; // Male Kumite -67kg (18+)

  // 1. Fetch mappings
  const { data: mappings, error: mapErr } = await supabase
    .from('participant_categories')
    .select('participant_id')
    .eq('category_id', catId);
  
  if (mapErr) { console.error('Mapping error:', mapErr); return; }
  console.log('Mappings count:', mappings.length);

  const participantIds = mappings.map(m => m.participant_id);

  // 2. Fetch participants
  const { data: participants, error: partErr } = await supabase
    .from('participants')
    .select('id, full_name, status, deleted_at')
    .in('id', participantIds)
    .is('deleted_at', null)
    .neq('status', 'Cancelled');

  if (partErr) { console.error('Participants error:', partErr); return; }
  console.log('Athletes count:', participants.length);

  // 3. Simulate what generateDraw creates (2 participants elimination)
  const athletes = participants.slice(0, 2);
  
  const testBout = {
    category_id: catId,
    bout_no: 1,
    round_no: 1,
    participant_a_id: athletes[0]?.id || null,
    participant_b_id: athletes[1]?.id || null,
    winner_id: null,
    score_a: 0,
    score_b: 0,
    status: 'Scheduled',
    tatami: 'Tatami 1'
  };

  console.log('Test bout to insert:', JSON.stringify(testBout, null, 2));

  // 4. Try inserting
  await supabase.from('bouts').delete().eq('category_id', catId);
  const { data: inserted, error: insertErr } = await supabase
    .from('bouts')
    .insert([testBout])
    .select();

  if (insertErr) {
    console.error('INSERT ERROR:', insertErr.message, insertErr.details, insertErr.hint);
  } else {
    console.log('Inserted successfully:', inserted.length, 'bouts');
    console.log('First inserted bout:', inserted[0]);
    // Cleanup
    await supabase.from('bouts').delete().eq('category_id', catId);
    console.log('Cleaned up test data.');
  }
}

testDraw();
