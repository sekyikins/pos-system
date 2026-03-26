import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables. Check .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function masterSetup() {
  console.log('🚀 Starting Master Database Restructure & Reseed...\n');

  try {
    // 1. DELETE ALL DATA (CLEAN SLATE)
    console.log('🧹 Clearing existing data...');
    // Order matters for FK constraints
    await supabase.from('sales_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('online_order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('inventory').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('sales').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('online_orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('delivery_points').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('pos_staff').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('e_customer').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('customer').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    const passHash = await bcrypt.hash('password', 10);

    // 2. FILL POS STAFF
    console.log('👤 Filling POS Staff...');
    const { data: staff, error: staffErr } = await supabase.from('pos_staff').insert([
      { name: 'System Admin', username: 'admin', password_hash: passHash, role: 'ADMIN' },
      { name: 'Store Manager', username: 'manager', password_hash: passHash, role: 'MANAGER' },
      { name: 'John Cashier', username: 'cashier', password_hash: passHash, role: 'CASHIER' },
    ]).select();
    if (staffErr) throw staffErr;
    console.log(`   ✓ Created ${staff.length} staff members.`);

    // 3. FILL E-COMMERCE CUSTOMERS
    console.log('🌐 Filling E-commerce Customers...');
    const { data: eCust, error: eErr } = await supabase.from('e_customer').insert([
      { name: 'Alice Web', email: 'alice@example.com', password_hash: passHash, phone: '0700111222', loyalty_points: 50 },
      { name: 'Bob Online', email: 'bob@example.com', password_hash: passHash, phone: '0700333444', loyalty_points: 0 },
    ]).select();
    if (eErr) throw eErr;
    console.log(`   ✓ Created ${eCust.length} e-customers.`);

    // 4. FILL IN-STORE CUSTOMERS (POS)
    console.log('🏪 Filling In-Store Customers...');
    const { data: pCust, error: pErr } = await supabase.from('customer').insert([
      { name: 'Regular Joe', phone: '0711122233', email: 'joe@visitor.com', loyalty_points: 120 },
      { name: 'Walk-in Guest', phone: '0755566677', loyalty_points: 10 },
      { name: 'VIP Shopper', phone: '0799988811', email: 'vip@loyal.com', loyalty_points: 500 },
    ]).select();
    if (pErr) throw pErr;
    console.log(`   ✓ Created ${pCust.length} in-store customers.`);

    // 5. FILL DELIVERY POINTS
    console.log('📍 Filling Delivery Points...');
    const { data: dPoints, error: dErr } = await supabase.from('delivery_points').insert([
      { name: 'Main Branch Pickup', address: '123 Commerce Avenue, City Centre' },
      { name: 'North Distribution Hub', address: '45 Industrial Road, North Side' },
      { name: 'South Depot', address: '77 Southern Boulevard, South End' },
    ]).select();
    if (dErr) throw dErr;
    console.log(`   ✓ Created ${dPoints.length} delivery points.`);

    console.log('\n✨ Database Restructure & Reseed Complete!');
    console.log('Logins (all use "password"):');
    console.log(' - Admin: admin');
    console.log(' - Manager: manager');
    console.log(' - Cashier: cashier');
    console.log(' - Web: alice@example.com');

  } catch (err) {
    console.error('\n❌ Setup failed:', err.message || err);
    console.log('\nTip: Make sure you have run the "restructure_migration.sql" first!');
  }
}

masterSetup().catch(console.error);
