import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── Extra Seed Data ────────────────────────────────────────────────────────────────

const categories = [
  { name: 'Beverages', description: 'Drinks and juices' },
  { name: 'Snacks', description: 'Chips, chocolate, and other snacks' },
  { name: 'Bakery', description: 'Bread, pastries, and baked goods' },
  { name: 'Dairy', description: 'Milk, cheese, butter' },
  { name: 'Grains', description: 'Rice, pasta, cereal' },
  { name: 'Condiments', description: 'Sauces, oils, spices' },
  { name: 'Produce', description: 'Fresh fruits and vegetables' },
];

const suppliers = [
  { name: 'Global Foods Dist.', contact_person: 'Alice Vendor', email: 'alice@globalfoods.com', phone: '123-555-1001', address: '100 Distribution Way' },
  { name: 'Fresh Farm Produce', contact_person: 'Bob Farmer', email: 'bob@freshfarm.com', phone: '123-555-1002', address: '200 Farm Road' },
  { name: 'Beverage Co.', contact_person: 'Charlie Drinks', email: 'charlie@bevco.com', phone: '123-555-1003', address: '300 Liquid Lane' },
];

const promotions = [
  { code: 'WELCOME10', discount_percentage: 10.0, start_date: new Date().toISOString(), end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), active: true },
  { code: 'SUMMER20', discount_percentage: 20.0, start_date: new Date().toISOString(), end_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), active: true },
];

async function seed() {
  console.log('🌱 Seeding extra admin data...\n');

  // ── Categories ──
  const { error: cErr } = await supabase.from('categories').upsert(categories, { onConflict: 'name' });
  if (cErr) console.error('Categories error:', cErr.message);
  else console.log(`✅ ${categories.length} categories seeded`);

  // ── Suppliers ──
  // Assume suppliers might conflict on name, let's just insert and ignore conflicts or delete all first.
  await supabase.from('suppliers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const { error: sErr } = await supabase.from('suppliers').insert(suppliers);
  if (sErr) console.error('Suppliers error:', sErr.message);
  else console.log(`✅ ${suppliers.length} suppliers seeded`);

  // ── Promotions ──
  const { error: pErr } = await supabase.from('promotions').upsert(promotions, { onConflict: 'code' });
  if (pErr) console.error('Promotions error:', pErr.message);
  else console.log(`✅ ${promotions.length} promotions seeded`);

  console.log('\n✨ Extra seed complete!');
}

seed().catch(console.error);
