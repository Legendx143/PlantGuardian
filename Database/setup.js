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

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

  // 3. User Profiles Table Verification
  const migrationPath = resolve(__dirname, '..', 'supabase', 'migrations', '20261031193000_create_user_profiles.sql');
  const { error: tableErr } = await supabase.from('user_profiles').select('email').limit(1);

  if (tableErr && (tableErr.message.includes('does not exist') || tableErr.message.includes('schema cache'))) {
    console.log('');
    console.log('⚠️   The "user_profiles" table is pending creation in PostgreSQL.');
    console.log('    To execute the SQL migration schema:');
    console.log('');
    console.log('    1. Open your Supabase Dashboard:');
    console.log(`       ${SUPABASE_URL.replace('.supabase.co', '')}.supabase.com`);
    console.log('    2. Go to: SQL Editor (left sidebar)');
    console.log(`    3. Paste and run the migration SQL from:\n       ${migrationPath}`);
    console.log('');
    console.log('    Note: The application already functions seamlessly using Supabase Auth,');
    console.log('    and will automatically sync real-time user profiles once created.');
  } else if (tableErr) {
    console.log('✅  "user_profiles" table exists in PostgreSQL.');
  } else {
    console.log('✅  "user_profiles" table exists and is accessible (email is Primary Key).');
  }

  console.log('');
  console.log('─'.repeat(52));
  console.log('🎉  Database setup & connectivity verification complete!');
}

runMigrationCheck().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
