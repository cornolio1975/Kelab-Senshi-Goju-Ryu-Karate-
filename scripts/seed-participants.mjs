/**
 * seed-participants.mjs
 * Run: node scripts/seed-participants.mjs
 * Adds 10 test participants per category in Supabase.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://baoiiwfxfbvjfsfdmhjm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_QuJS043IZONU1brj_3YhSA_lIUEXeM8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Malaysian / Southeast Asian names pool
const maleFirstNames = [
  'Ahmad', 'Muhammad', 'Hafiz', 'Amirul', 'Fariz', 'Danial', 'Azlan',
  'Haziq', 'Firdaus', 'Izzat', 'Razif', 'Zulkifli', 'Asyraf', 'Naim',
  'Ridhwan', 'Syafiq', 'Haris', 'Aqil', 'Khairul', 'Luqman',
];
const femaleFirstNames = [
  'Nurul', 'Siti', 'Aina', 'Farhana', 'Amirah', 'Nabilah', 'Zulaikha',
  'Hanis', 'Syahirah', 'Farah', 'Natasha', 'Yasmin', 'Afiqah', 'Qistina',
  'Liyana', 'Rabiatul', 'Hana', 'Insyirah', 'Mardhiah', 'Sofea',
];
const lastNames = [
  'bin Abdullah', 'binti Ahmad', 'bin Hassan', 'binti Ibrahim',
  'bin Ismail', 'binti Yusof', 'bin Razali', 'binti Othman',
  'bin Kamaruddin', 'binti Zainudin', 'bin Salleh', 'binti Hamzah',
  'bin Jaafar', 'binti Mansor', 'bin Noor', 'binti Ramli',
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateDOB(minAge, maxAge) {
  const age = randomInt(minAge, maxAge);
  const year = new Date().getFullYear() - age;
  const month = randomInt(1, 12).toString().padStart(2, '0');
  const day = randomInt(1, 28).toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function generateIC() {
  return `${randomInt(100000, 999999)}-${randomInt(10, 99)}-${randomInt(1000, 9999)}`;
}

function generateRegNo(index) {
  return `REG-${Date.now()}-${index.toString().padStart(4, '0')}`;
}

async function main() {
  console.log('Connecting to Supabase...');

  // 1. Fetch all open categories
  const { data: categories, error: catErr } = await supabase
    .from('categories')
    .select('*')
    .neq('status', 'Closed');

  if (catErr) {
    console.error('Failed to load categories:', catErr.message);
    process.exit(1);
  }

  if (!categories || categories.length === 0) {
    console.warn('No open categories found. Please add categories first.');
    process.exit(0);
  }

  console.log(`Found ${categories.length} categories.`);

  // 2. Fetch existing clubs to link participants
  const { data: dbClubs } = await supabase.from('clubs').select('id, name').limit(10);

  let totalAdded = 0;

  for (const cat of categories) {
    console.log(`\nCategory: ${cat.name} (${cat.gender}, Age ${cat.min_age}-${cat.max_age}, Weight ${cat.min_weight}-${cat.max_weight} kg)`);

    const participantsToInsert = [];

    for (let i = 1; i <= 10; i++) {
      const gender = cat.gender === 'Female' ? 'Female' : 'Male';
      const firstName = gender === 'Male' ? pickRandom(maleFirstNames) : pickRandom(femaleFirstNames);
      const lastName = pickRandom(lastNames);
      const fullName = `${firstName} ${lastName}`;

      const minW = parseFloat(cat.min_weight);
      const maxW = parseFloat(cat.max_weight);
      const weight = parseFloat((minW + Math.random() * Math.min(10, maxW - minW)).toFixed(1));
      const height = randomInt(155, 185);
      const dob = generateDOB(cat.min_age, cat.max_age);
      const clubId = dbClubs && dbClubs.length > 0 ? pickRandom(dbClubs).id : null;

      participantsToInsert.push({
        registration_no: generateRegNo(totalAdded + i),
        full_name: fullName,
        gender,
        dob,
        passport_ic: generateIC(),
        email: `test.${firstName.toLowerCase()}${randomInt(1, 999)}@example.com`,
        phone: `01${randomInt(1, 9)}${randomInt(10000000, 99999999)}`,
        weight,
        height,
        nationality_code: 'MAS',
        club_id: clubId,
        status: 'Confirmed',
        medical_status: 'Cleared',
        payment_status: 'Paid',
        remarks: `Test participant for ${cat.name}`,
      });
    }

    // Insert participants batch
    const { data: inserted, error: insertErr } = await supabase
      .from('participants')
      .insert(participantsToInsert)
      .select('id');

    if (insertErr) {
      console.error(`  Failed to insert participants for ${cat.name}:`, insertErr.message);
      continue;
    }

    console.log(`  Inserted ${inserted.length} participants.`);

    // 3. Map each participant to this category
    const mappings = inserted.map(p => ({
      participant_id: p.id,
      category_id: cat.id,
      manual_override: false,
    }));

    const { error: mapErr } = await supabase.from('participant_categories').insert(mappings);

    if (mapErr) {
      console.error(`  Failed to map participants to category ${cat.name}:`, mapErr.message);
    } else {
      console.log(`  Mapped ${mappings.length} participants to category.`);
    }

    totalAdded += inserted.length;
  }

  console.log(`\nDone! Total participants added: ${totalAdded}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
