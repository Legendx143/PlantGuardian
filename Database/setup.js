/*
 * Database Setup & Verification Helper
 * =====================================
 * This script connects to the Supabase PostgreSQL project, verifies
 * credentials, ensures the storage bucket exists, and reports the
 * migration status.
 *
 * Usage:
 *   cd Database
 *   node setup.js
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load from Database/.env or Backend/.env
if (existsSync(resolve(__dirname, '.env'))) {
  dotenv.config({ path: resolve(__dirname, '.env') });
} else if (existsSync(resolve(__dirname, '../Backend/.env'))) {
  dotenv.config({ path: resolve(__dirname, '../Backend/.env') });
} else {
  dotenv.config();
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌  Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Database/.env');
  console.error('    Copy them from your Supabase project dashboard → Settings → API.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runMigrationCheck() {
  console.log('🌱  PlantGuardian — Database Setup & Status');
  console.log('─'.repeat(52));
  console.log(`   Supabase URL : ${SUPABASE_URL}`);
  console.log('');

  // 1. Verify Auth Service Connection
  try {
    const { data: usersData, error: authErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (authErr) {
      console.error(`❌  Auth connection error: ${authErr.message}`);
    } else {
      console.log('✅  Supabase Auth & Admin API connection verified.');
    }
  } catch (err) {
    console.error(`❌  Could not connect to Supabase Auth: ${err.message}`);
  }

  // 2. Storage Bucket Management
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const hasBucket = buckets?.some(b => b.name === 'plant-images');
    if (hasBucket) {
      console.log('✅  Storage bucket "plant-images" exists and is active.');
    } else {
      console.log('📦  Creating storage bucket "plant-images"...');
      const { error: bucketErr } = await supabase.storage.createBucket('plant-images', {
        public: false,
        fileSizeLimit: 10485760,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      });
      if (bucketErr) {
        console.warn(`⚠️   Could not auto-create bucket: ${bucketErr.message}`);
      } else {
        console.log('✅  Storage bucket "plant-images" created successfully.');
      }
    }
  } catch (err) {
    console.warn(`⚠️   Storage check error: ${err.message}`);
  }

  // 3. User Profiles & Scans & Farming Plans Table Verification
  const userMigration = resolve(__dirname, '..', 'supabase', 'migrations', '20261031193000_create_user_profiles.sql');
  const historyMigration = resolve(__dirname, '..', 'supabase', 'migrations', '20261107223000_create_scans_and_farming_plans.sql');

  const { error: tableErr } = await supabase.from('user_profiles').select('email').limit(1);
  const { error: scansErr } = await supabase.from('plant_scans').select('id').limit(1);
  const { error: farmingErr } = await supabase.from('farming_plans').select('id').limit(1);

  if (!tableErr) {
    console.log('✅  "user_profiles" table exists and is accessible.');
  } else {
    console.log(`⚠️   "user_profiles" table: ${tableErr.message}`);
  }

  if (!scansErr) {
    console.log('✅  "plant_scans" table exists in PostgreSQL (Cross-device history active).');
  } else {
    console.log(`⚠️   "plant_scans" table: ${scansErr.message}`);
  }

  if (!farmingErr) {
    console.log('✅  "farming_plans" table exists in PostgreSQL (Cross-device plans active).');
  } else {
    console.log(`⚠️   "farming_plans" table: ${farmingErr.message}`);
  }

  if (scansErr || farmingErr || tableErr) {
    console.log('');
    console.log('📋  To enable instant cloud PostgreSQL sync across all devices:');
    console.log('    1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/cdlwdyplznpnizwjcxvl/sql');
    console.log('    2. In SQL Editor, copy and run the SQL from:');
    console.log(`       ${historyMigration}`);
    console.log('    (Note: The backend automatically stores & syncs history via disk database in the meantime!)');
  }

  console.log('');
  console.log('─'.repeat(52));
  console.log('🎉  Database setup & connectivity verification complete!');
}

runMigrationCheck().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
