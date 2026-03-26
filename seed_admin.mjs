 /**
 * seed_admin.mjs
 * Run with: node seed_admin.mjs
 * Creates the default admin/manager and cashier accounts in the POS system.
 */
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const users = [
  { name: 'System Admin',  username: 'admin',    password: 'password', role: 'ADMIN' },
  { name: 'Admin Manager', username: 'manager',  password: 'password', role: 'MANAGER' },
  { name: 'Cashier One',   username: 'cashier',  password: 'password', role: 'CASHIER' },
];

async function seed() {
  console.log('=== POS Seed: Admin Accounts ===\n');
  for (const u of users) {
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', u.username)
      .single();

    if (existing) {
      console.log(`⚠  ${u.username} already exists — skipping.`);
      continue;
    }

    const hash = await bcrypt.hash(u.password, 10);
    const { data, error } = await supabase
      .from('users')
      .insert({ name: u.name, username: u.username, password_hash: hash, role: u.role })
      .select('id, name, role')
      .single();

    if (error) {
      console.error(`✗  Failed to create ${u.username}:`, error.message);
    } else {
      console.log(`✓  Created ${data.role}: ${data.name} (id: ${data.id})`);
    }
  }
  console.log('\nDone. Login at http://localhost:3000');
}

seed().catch(console.error);
