import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── Seed Data ────────────────────────────────────────────────────────────────

const users = [
  { name: 'Admin Manager', username: 'manager', password_hash: bcrypt.hashSync('password', 10), role: 'MANAGER' },
  { name: 'Cashier One', username: 'cashier', password_hash: bcrypt.hashSync('password', 10), role: 'CASHIER' },
  { name: 'Cashier Two', username: 'cashier2', password_hash: bcrypt.hashSync('password', 10), role: 'CASHIER' },
  { name: 'Customer User', username: 'customer', password_hash: bcrypt.hashSync('password', 10), role: 'CUSTOMER' },
];

const products = [
  { name: 'Coca Cola 2L', category: 'Beverages', price: 2.50, quantity: 50, barcode: '1234567890' },
  { name: 'Lays Chips', category: 'Snacks', price: 1.50, quantity: 30, barcode: '0987654321' },
  { name: 'Bread', category: 'Bakery', price: 2.00, quantity: 20, barcode: '1122334455' },
  { name: 'Orange Juice 1L', category: 'Beverages', price: 3.00, quantity: 25, barcode: '2233445566' },
  { name: 'Chocolate Bar', category: 'Snacks', price: 1.00, quantity: 8, barcode: '3344556677' },
  { name: 'Milk 1L', category: 'Dairy', price: 1.80, quantity: 4, barcode: '4455667788' },
  { name: 'Eggs (12 pack)', category: 'Dairy', price: 3.50, quantity: 15, barcode: '5566778899' },
  { name: 'Rice 5kg', category: 'Grains', price: 8.00, quantity: 12, barcode: '6677889900' },
  { name: 'Bottled Water 500ml', category: 'Beverages', price: 0.80, quantity: 100, barcode: '7788990011' },
  { name: 'Pasta 500g', category: 'Grains', price: 1.20, quantity: 40, barcode: '8899001122' },
  { name: 'Tomato Sauce', category: 'Condiments', price: 2.30, quantity: 22, barcode: '9900112233' },
  { name: 'Butter 250g', category: 'Dairy', price: 3.20, quantity: 18, barcode: '1011121314' },
  { name: 'Cheddar Cheese 200g', category: 'Dairy', price: 4.50, quantity: 9, barcode: '1415161718' },
  { name: 'Pringles Sour Cream', category: 'Snacks', price: 2.80, quantity: 35, barcode: '1920212223' },
  { name: 'Apple Juice 1L', category: 'Beverages', price: 2.60, quantity: 28, barcode: '2425262728' },
  { name: 'Cornflakes 500g', category: 'Bakery', price: 3.90, quantity: 14, barcode: '2930313233' },
  { name: 'Cooking Oil 2L', category: 'Condiments', price: 5.50, quantity: 20, barcode: '3435363738' },
  { name: 'Sugar 1kg', category: 'Grains', price: 1.10, quantity: 60, barcode: '3940414243' },
  { name: 'Salt 500g', category: 'Condiments', price: 0.60, quantity: 80, barcode: '4445464748' },
  { name: 'Coffee Instant 200g', category: 'Beverages', price: 6.50, quantity: 22, barcode: '4950515253' },
];

const customers = [
  { name: 'John Doe', phone: '123-456-7890', email: 'john@example.com', address: '10 Oak Street', loyalty_points: 100 },
  { name: 'Jane Smith', phone: '987-654-3210', email: 'jane@example.com', address: '22 Maple Ave', loyalty_points: 50 },
  { name: 'Alice Johnson', phone: '555-010-2020', email: 'alice@example.com', address: '5 Birch Lane', loyalty_points: 250 },
  { name: 'Bob Wilson', phone: '444-333-2222', email: 'bob@example.com', address: '88 Pine Road', loyalty_points: 30 },
  { name: 'Carol Martinez', phone: '777-888-9999', email: 'carol@example.com', address: '14 Elm Court', loyalty_points: 180 },
  { name: 'David Lee', phone: '222-111-3344', email: 'david@example.com', address: '3 Cedar Blvd', loyalty_points: 75 },
  { name: 'Eva Brown', phone: '666-555-4444', email: 'eva@example.com', address: '99 Spruce Cres', loyalty_points: 310 },
  { name: 'Frank White', phone: '100-200-3000', email: 'frank@example.com', address: '62 Walnut Way', loyalty_points: 0 },
];

async function seed() {
  console.log('🌱 Seeding rich data...\n');

  // ── Users ──
  const { error: uErr } = await supabase.from('users').upsert(users, { onConflict: 'username' });
  if (uErr) console.error('Users error:', uErr.message);
  else console.log(`✅ ${users.length} users`);

  // ── Products ──
  // upsert on barcode so we don't duplicate
  const { error: pErr } = await supabase.from('products').upsert(products, { onConflict: 'barcode' });
  if (pErr) console.error('Products error:', pErr.message);
  else console.log(`✅ ${products.length} products`);

  // ── Customers ──
  // Delete old ones (so we don't create duplicates on re-run)
  await supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const { error: cErr } = await supabase.from('customers').insert(customers);
  if (cErr) console.error('Customers error:', cErr.message);
  else console.log(`✅ ${customers.length} customers`);

  // ── Fetch IDs for FK references ──
  const { data: userRows } = await supabase.from('users').select('id, username');
  const { data: productRows } = await supabase.from('products').select('id, name, price');
  const { data: customerRows } = await supabase.from('customers').select('id, name');

  const userMap = Object.fromEntries(userRows.map(u => [u.username, u.id]));
  const productMap = Object.fromEntries(productRows.map(p => [p.name, { id: p.id, price: Number(p.price) }]));
  const customerList = customerRows;

  function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function randFloat(min, max) { return parseFloat((Math.random() * (max - min) + min).toFixed(2)); }

  const cashiers = ['cashier', 'cashier2', 'manager'].map(u => userMap[u]);
  const paymentMethods = ['CASH', 'CARD', 'MOBILE_MONEY'];

  // ── Sales + Items + Payments + Inventory ──
  const productList = Object.values(productMap).map((p, idx) => ({
    id: p.id,
    name: Object.keys(productMap)[idx],
    price: p.price,
  }));

  let totalSales = 0;
  let totalItems = 0;
  let totalPayments = 0;
  let totalInventory = 0;

  // Generate 30 past sales over the last 60 days
  for (let i = 0; i < 30; i++) {
    const daysAgo = Math.floor(Math.random() * 60);
    const saleDate = new Date();
    saleDate.setDate(saleDate.getDate() - daysAgo);
    saleDate.setHours(Math.floor(Math.random() * 12) + 8, Math.floor(Math.random() * 60));

    const cashierId = rnd(cashiers);
    const customer = Math.random() > 0.4 ? rnd(customerList) : null;
    const paymentMethod = rnd(paymentMethods);

    // Pick 1-4 products for this sale
    const numItems = Math.floor(Math.random() * 4) + 1;
    const saleProducts = [];
    const usedIndexes = new Set();
    for (let j = 0; j < numItems; j++) {
      let p;
      do { p = rnd(productList); } while (usedIndexes.has(p.id));
      usedIndexes.add(p.id);
      const qty = Math.floor(Math.random() * 3) + 1;
      saleProducts.push({ ...p, qty });
    }

    const totalAmount = saleProducts.reduce((sum, p) => sum + p.price * p.qty, 0);
    const discount = Math.random() > 0.7 ? randFloat(0.5, Math.min(5, totalAmount * 0.2)) : 0;
    const finalAmount = parseFloat((totalAmount - discount).toFixed(2));

    // Insert sale
    const { data: saleRow, error: sErr } = await supabase.from('sales').insert({
      cashier_id: cashierId,
      customer_id: customer?.id ?? null,
      total_amount: totalAmount,
      discount,
      final_amount: finalAmount,
      payment_method: paymentMethod,
      created_at: saleDate.toISOString(),
    }).select().single();

    if (sErr) { console.error('Sale error:', sErr.message); continue; }
    totalSales++;

    // Insert sales_items
    const itemRows = saleProducts.map(p => ({
      sale_id: saleRow.id,
      product_id: p.id,
      product_name: p.name,
      price: p.price,
      quantity: p.qty,
      subtotal: parseFloat((p.price * p.qty).toFixed(2)),
    }));
    const { error: iErr } = await supabase.from('sales_items').insert(itemRows);
    if (!iErr) totalItems += itemRows.length;

    // Insert payment record
    const { error: pyErr } = await supabase.from('payments').insert({
      sale_id: saleRow.id,
      amount: finalAmount,
      method: paymentMethod,
      timestamp: saleDate.toISOString(),
    });
    if (!pyErr) totalPayments++;

    // Insert inventory logs for each item sold
    const invRows = saleProducts.map(p => ({
      product_id: p.id,
      change: -p.qty,
      reason: 'SALE',
      timestamp: saleDate.toISOString(),
    }));
    const { error: invErr } = await supabase.from('inventory').insert(invRows);
    if (!invErr) totalInventory += invRows.length;
  }

  // Add some restock inventory records
  const restockProducts = productList.slice(0, 8);
  const restockRows = restockProducts.map(p => {
    const restockDate = new Date();
    restockDate.setDate(restockDate.getDate() - Math.floor(Math.random() * 30));
    return { product_id: p.id, change: Math.floor(Math.random() * 50) + 20, reason: 'RESTOCK', timestamp: restockDate.toISOString() };
  });
  const { error: rErr } = await supabase.from('inventory').insert(restockRows);
  if (!rErr) totalInventory += restockRows.length;

  console.log(`✅ ${totalSales} sales`);
  console.log(`✅ ${totalItems} sale items`);
  console.log(`✅ ${totalPayments} payment records`);
  console.log(`✅ ${totalInventory} inventory logs`);
  console.log('\n✨ Seed complete!');
}

seed().catch(console.error);
