/**
 * fill_database.mjs — StarMart Master Seeder (High Randomness / Full Schema)
 * Timeframe : 2026-03-01 → 2026-04-11
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl        = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌  Missing Supabase environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ─── Helpers ─────────────────────────────────────────────────────────────────
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max, dp = 2) => parseFloat((Math.random() * (max - min) + min).toFixed(dp));
const randDate = (from, to) => new Date(from.getTime() + Math.random() * (to.getTime() - from.getTime()));
const iso = (d) => d.toISOString();
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickN = (arr, n) => arr.slice().sort(() => Math.random() - 0.5).slice(0, n);

const START = new Date('2026-03-01T06:00:00Z');
const NOW   = new Date();

/** 13-digit Paystack reference */
const genPaystackRef = () => Array.from({length: 13}, () => Math.floor(Math.random() * 10)).join('');
/** 13-char Alpha-numeric reference for Cash/POD */
const genGenericRef = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({length: 13}, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
};

async function cleanAll() {
  console.log('🧹 Deep cleaning database...');
  const tables = ['return_items', 'returns', 'payments', 'transaction_items', 'online_orders', 'sales', 'inventory', 'purchase_order_items', 'purchase_orders', 'product_reviews', 'expenses', 'product_suppliers', 'product_images', 'products', 'promotions', 'delivery_points', 'payment_methods', 'pos_staff', 'customers', 'suppliers', 'categories', 'store_settings'];
  for (const table of tables) {
    await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }
}

async function insert(table, rows) {
  if (!rows.length) return [];
  const BATCH = 100;
  let all = [];
  for (let i = 0; i < rows.length; i += BATCH) {
    const { data, error } = await supabase.from(table).insert(rows.slice(i, i + BATCH)).select();
    if (error) {
      console.error(`❌ Error in ${table}:`, error.message);
      throw error;
    }
    all = all.concat(data || []);
  }
  console.log(`✅  ${table}: ${all.length} rows`);
  return all;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  await cleanAll();

  // 1. Settings
  await insert('store_settings', [{
    store_name: 'StarMart',
    currency: 'GHS',
    currency_symbol: '₵',
    tax_rate: 2.5,
    receipt_header: 'StarMart GH — Your Daily Choice',
    receipt_footer: 'Thank you for shopping at StarMart!'
  }]);

  // 2. Staff & Hashing
  const hash = await bcrypt.hash('password123', 10);
  const staff = await insert('pos_staff', [
    { username: 'admin', name: 'Benjamin Admin', password_hash: hash, role: 'ADMIN' },
    { username: 'manager1', name: 'Kofi Manager', password_hash: hash, role: 'MANAGER' },
    { username: 'cashier1', name: 'Sarah Cash', password_hash: hash, role: 'CASHIER' },
    { username: 'cashier2', name: 'Abe Cash', password_hash: hash, role: 'CASHIER' }
  ]);
  const cashierIds = staff.filter(s => s.role === 'CASHIER').map(s => s.id);
  const staffIds = staff.map(s => s.id);

  // 3. Payment Methods
  await insert('payment_methods', [
    { id: 'CASH', name: 'Cash', active: true },
    { id: 'PAYSTACK', name: 'Paystack Card/Momo', active: true },
    { id: 'PAY_ON_DELIVERY', name: 'Cash on Delivery', active: true }
  ]);

  // 4. Delivery Points
  const dps = await insert('delivery_points', [
    { name: 'Accra Mall Hub', address: 'Tetteh Quarshie Interchange', active: true },
    { name: 'Kumasi Adum Office', address: 'Adum Central', active: true },
    { name: 'Tema Comm 1 Hub', address: 'Community 1 Harbour', active: true }
  ]);

  // 5. Categories & Suppliers
  const cats = await insert('categories', [
    { name: 'Electronics' }, { name: 'Home & Kitchen' }, { name: 'Groceries' }, 
    { name: 'Beverages' }, { name: 'Health & Beauty' }
  ]);
  const catMap = Object.fromEntries(cats.map(c => [c.name, c.id]));

  const suppliers = await insert('suppliers', [
    { name: 'Global Tech Distro', contact_person: 'Kwame Tech', email: 'sales@globaltech.com', phone: '0241000001' },
    { name: 'Fresh Fields GH', contact_person: 'Ama Fields', email: 'ama@freshfields.com', phone: '0241000002' },
    { name: 'Kasapreko Distro', contact_person: 'John Beverage', email: 'jb@kasapreko.com', phone: '0241000003' }
  ]);

  // 6. Promotions
  const promos = await insert('promotions', [
    { name: 'Easter 15%', code: 'EASTER15', discount_type: 'PERCENT', discount_value: 15, min_subtotal: 100, is_active: true },
    { name: 'Save 50', code: 'SAVE50', discount_type: 'FLAT', discount_value: 50, min_subtotal: 500, is_active: true },
    { name: 'Bulk Discount', code: 'BULK', discount_type: 'PERCENT', discount_value: 5, min_subtotal: 1000, is_active: true }
  ]);

  // 7. Products (50+)
  console.log('📦  Creating 60+ products...');
  const prodTemplates = [
    { c: 'Electronics', i: ['Samsung Galaxy S23', 'A14 Phone', 'USB Cable', 'Power Bank 20k', 'Smart Watch', 'Anker Hub', 'LED Monitor', 'Bluetooth Headset'] },
    { c: 'Home & Kitchen', i: ['Electric Kettle', 'Blender 500W', 'Gas Stove 2-Burner', 'Rice Cooker', 'Air Fryer', 'Dinner Set', 'Standing Fan', 'Microfiber Mop'] },
    { c: 'Groceries', i: ['Gino Rice 5kg', 'Sultana Oil 3L', 'Pork Ribs 1kg', 'Baking Flour', 'Brown Sugar 2kg', 'Tomato Paste', 'Mayonnaise', 'Cooking Salt', 'Maggi Pack'] },
    { c: 'Beverages', i: ['Verna Water 1L', 'Malt 330ml', 'Coca Cola 1.5L', 'Sprite 1.5L', 'FanMilk 500ml', 'Guinness 330ml', 'Kasapreko Alomo', 'Orange Juice 1L'] },
    { c: 'Health & Beauty', i: ['Nivea Lotion', 'Pepsodent Paste', 'Dettol Soap', 'Hand Sanitizer', 'Vaseline Jelly', 'Shampoo 500ml', 'Razors 5pk', 'Sunscreen'] }
  ];

  const prodRows = [];
  let barcode = 1000100;
  prodTemplates.forEach(t => {
    t.i.forEach(name => {
      const price = randFloat(10, 800);
      prodRows.push({
        name,
        category_id: catMap[t.c],
        category: t.c,
        price,
        cost_price: parseFloat((price * randFloat(0.6, 0.8)).toFixed(2)),
        quantity: randInt(5, 50),
        barcode: `SM${barcode++}`,
        is_returnable: Math.random() > 0.15,
        description: `Premium ${name} for your daily needs.`
      });
    });
  });
  const products = await insert('products', prodRows);

  // Link Suppliers
  const psRows = products.map(p => ({ product_id: p.id, supplier_id: pick(suppliers).id }));
  await insert('product_suppliers', psRows);

  // 7.5 Product Images
  const imageUrls = [
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=400',
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=400',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=400',
    'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&q=80&w=400',
    'https://images.unsplash.com/photo-1560343090-f0409e92791a?auto=format&fit=crop&q=80&w=400',
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&q=80&w=400',
    'https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&q=80&w=400',
    'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&q=80&w=400',
    'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?auto=format&fit=crop&q=80&w=400',
    'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&q=80&w=400'
  ];
  const imageRows = products.map(p => ({
    product_id: p.id,
    image_url: pick(imageUrls),
    is_primary: true
  }));
  await insert('product_images', imageRows);

  // 8. Customers
  const customerNames = [
    ['Kwame', 'Asante'], ['Abena', 'Mensah'], ['Kofi', 'Osei'], ['Akua', 'Boateng'], ['Yaw', 'Appiah'],
    ['Esi', 'Degraft'], ['Kwadwo', 'Nti'], ['Afia', 'Danquah'], ['Kwesi', 'Boonu'], ['Adjoa', 'Sarpong'],
    ['Kwaku', 'Frimpong'], ['Ama', 'Kyei'], ['Kobina', 'Arthur'], ['Ekow', 'Baidoo'], ['Araba', 'Quansah'],
    ['Kweku', 'Forson'], ['Abiba', 'Iddrissu'], ['Musa', 'Issah'], ['Zainab', 'Salifu'], ['Abdul', 'Rahman']
  ];

  const customerRows = customerNames.map(([first, last]) => {
    const type = pick(['IN_STORE', 'ONLINE', 'BOTH']);
    return {
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}@example.com`,
      type,
      password_hash: type !== 'IN_STORE' ? hash : null,
      phone: `024${randInt(1000000, 9999999)}`,
      loyalty_points: randInt(0, 100)*10,
      order_count: randInt(0, 15)
    };
  });
  const customers = await insert('customers', customerRows);

  // 9. Transactions Logic
  console.log('💳 Generating Transactions...');
  let allTxItems = [];
  let allPayments = [];
  let allInvLogs = [];

  // Initial Restocks
  allInvLogs.push(...products.map(p => ({ product_id: p.id, change: p.quantity, reason: 'RESTOCK', timestamp: iso(START) })));

  // Generate POS Sales
  const salesRows = [];
  for(let i=0; i<120; i++) {
    const date = randDate(START, NOW);
    const cashierId = pick(cashierIds);
    const customer = Math.random() > 0.4 ? pick(customers.filter(c => c.type !== 'ONLINE')) : null;
    const numItems = randInt(1, 6);
    const saleProds = pickN(products, numItems);
    const promo = Math.random() > 0.8 ? pick(promos) : null;
    let subtotal = 0;

    const items = saleProds.map(p => {
      const q = randInt(1, 4);
      const sub = p.price * q;
      subtotal += sub;
      return { product_id: p.id, price: p.price, cost_price: p.cost_price, quantity: q, subtotal: sub };
    });

    let discount = 0;
    if(promo && subtotal >= promo.min_subtotal) {
      discount = promo.discount_type === 'PERCENT' ? (subtotal * promo.discount_value / 100) : promo.discount_value;
    }
    const final = Math.max(0, subtotal - discount);
    const payMethod = pick(['CASH', 'CASH', 'PAYSTACK']);

    salesRows.push({
      cashier_id: cashierId,
      customer_id: customer?.id || null,
      total_amount: subtotal,
      discount: parseFloat(discount.toFixed(2)),
      final_amount: parseFloat(final.toFixed(2)),
      payment_method_id: payMethod,
      payment_reference: payMethod === 'PAYSTACK' ? genPaystackRef() : genGenericRef(),
      promotion_id: promo?.id || null,
      created_at: iso(date),
      _items: items,
      _payMethod: payMethod
    });
  }
  const insertedSales = await insert('sales', salesRows.map(row => {
    const s = { ...row };
    delete s._items;
    delete s._payMethod;
    return s;
  }));
  
  insertedSales.forEach((s, idx) => {
    const meta = salesRows[idx];
    meta._items.forEach(it => {
      allTxItems.push({ sale_id: s.id, ...it });
      allInvLogs.push({ product_id: it.product_id, change: -it.quantity, reason: 'SALE', timestamp: s.created_at });
    });
    allPayments.push({ sale_id: s.id, amount: s.final_amount, payment_method_id: meta._payMethod, created_at: s.created_at });
  });

  // Generate Online Orders
  const ordersRows = [];
  for(let i=0; i<80; i++) {
    const date = randDate(START, NOW);
    const customer = pick(customers.filter(c => c.type !== 'IN_STORE'));
    const status = pick(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']);
    const numItems = randInt(1, 4);
    const orderProds = pickN(products, numItems);
    const payMethod = pick(['PAYSTACK', 'PAY_ON_DELIVERY']);
    const dp = Math.random() > 0.5 ? pick(dps) : null;
    let subtotal = 0;

    const items = orderProds.map(p => {
      const q = randInt(1, 3);
      subtotal += p.price * q;
      return { product_id: p.id, price: p.price, cost_price: p.cost_price, quantity: q, subtotal: p.price * q };
    });

    const payRef = payMethod === 'PAYSTACK' 
      ? genPaystackRef() 
      : (status === 'DELIVERED' ? genGenericRef() : null);

    ordersRows.push({
      customer_id: customer.id,
      delivery_point_id: dp?.id || null,
      total_amount: parseFloat(subtotal.toFixed(2)),
      status,
      payment_method_id: payMethod,
      payment_reference: payRef,
      created_at: iso(date),
      completed_at: status === 'DELIVERED' ? iso(new Date(date.getTime() + 86400000)) : null,
      _items: items,
      _payMethod: payMethod
    });
  }
  const insertedOrders = await insert('online_orders', ordersRows.map(row => {
    const o = { ...row };
    delete o._items;
    delete o._payMethod;
    return o;
  }));
  
  insertedOrders.forEach((o, idx) => {
    const meta = ordersRows[idx];
    meta._items.forEach(it => {
      allTxItems.push({ order_id: o.id, ...it });
      if(o.status === 'DELIVERED') {
        allInvLogs.push({ product_id: it.product_id, change: -it.quantity, reason: 'SALE', timestamp: o.created_at });
      }
    });
    allPayments.push({ order_id: o.id, amount: o.total_amount, payment_method_id: meta._payMethod, created_at: o.created_at });
  });

  await insert('transaction_items', allTxItems);
  await insert('payments', allPayments);
  await insert('inventory', allInvLogs);

  // 10. Purchase Orders
  console.log('📦 Generating Purchase Orders...');
  const poRows = [];
  for(let i=0; i<15; i++) {
    const status = pick(['PENDING', 'APPROVED', 'RECEIVED', 'CANCELLED']);
    poRows.push({
      supplier_id: pick(suppliers).id,
      status,
      total_amount: 0,
      created_at: iso(randDate(START, NOW)),
    });
  }
  const insertedPOs = await insert('purchase_orders', poRows);
  const poItemRows = [];
  for(const po of insertedPOs) {
    const poProds = pickN(products, randInt(3, 8));
    let poTot = 0;
    for(const p of poProds) {
      const q = randInt(50, 200);
      const cost = p.cost_price * 0.95;
      const sub = q * cost;
      poTot += sub;
      poItemRows.push({ po_id: po.id, product_id: p.id, quantity: q, unit_cost: cost, subtotal: sub });
      if(po.status === 'RECEIVED') {
        await supabase.from('inventory').insert({ product_id: p.id, change: q, reason: 'RESTOCK', timestamp: po.created_at });
        await supabase.from('products').update({ quantity: p.quantity + q }).eq('id', p.id);
      }
    }
    await supabase.from('purchase_orders').update({ total_amount: poTot }).eq('id', po.id);
  }
  await insert('purchase_order_items', poItemRows);

  // 11. Returns
  console.log('🔄 Generating Dynamic Returns...');
  const allFinalSales = (await supabase.from('sales').select('*, transaction_items(*)')).data || [];
  const allFinalOrders = (await supabase.from('online_orders').select('*, transaction_items(*)').eq('status', 'DELIVERED')).data || [];
  
  for(let i=0; i<25; i++) {
    const isOrder = Math.random() > 0.5;
    const parent = isOrder ? pick(allFinalOrders) : pick(allFinalSales);
    if(!parent || !parent.transaction_items.length) continue;
    
    const item = pick(parent.transaction_items);
    const status = pick(['REQUESTED', 'APPROVED', 'COMPLETED', 'REJECTED']);
    const source = isOrder ? 'ONLINE' : 'IN_STORE';

    const { data: ret } = await supabase.from('returns').insert({
      sale_id: isOrder ? null : parent.id,
      order_id: isOrder ? parent.id : null,
      customer_id: parent.customer_id,
      initiated_by_staff_id: pick(cashierIds),
      source,
      status,
      reason: pick(['Wrong size', 'Defective', 'Change of mind', 'Expired']),
      refund_amount: item.subtotal * 0.9,
      requested_at: iso(new Date(new Date(parent.created_at).getTime() + 86400000)),
      completed_at: ['COMPLETED', 'REJECTED'].includes(status) ? iso(NOW) : null
    }).select().single();

    if(ret) {
      await supabase.from('return_items').insert({
        return_id: ret.id, product_id: item.product_id, quantity: item.quantity, 
        unit_price: item.price, subtotal: item.subtotal
      });
      if(status === 'COMPLETED') {
        const table = isOrder ? 'online_orders' : 'sales';
        await supabase.from(table).update({ is_returned: true }).eq('id', parent.id);
        await supabase.from('inventory').insert({ product_id: item.product_id, change: item.quantity, reason: 'RETURN', timestamp: ret.completed_at });
      }
    }
  }

  // 12. Expenses & Reviews
  console.log('📊 Finalizing Expenses and Reviews...');
  const expenseRows = [
    { description: 'Electricity', amount: 1200, expense_date: '2026-03-05', logged_by: pick(staffIds) },
    { description: 'Rent', amount: 5000, expense_date: '2026-03-01', logged_by: pick(staffIds) },
    { description: 'Water', amount: 300, expense_date: '2026-03-10', logged_by: pick(staffIds) },
    { description: 'Fuel', amount: 450, expense_date: '2026-03-15', logged_by: pick(staffIds) },
    { description: 'Stationery', amount: 120, expense_date: '2026-03-20', logged_by: pick(staffIds) }
  ];
  await insert('expenses', expenseRows);

  const reviews = [];
  pickN(products, 30).forEach(p => {
    reviews.push({
      product_id: p.id,
      customer_id: pick(customers).id,
      rating: randInt(2, 5),
      comment: pick(['Great!', 'Average', 'Must buy', 'Not worth it', 'Amazing service']),
      created_at: iso(randDate(START, NOW))
    });
  });
  await insert('product_reviews', reviews);

  console.log('\n✨ MASTER SEEDING COMPLETE! Your database is now rich with diverse data.');
}

main().catch(console.error);
