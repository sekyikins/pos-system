import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', 'e-commerce', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('--- Seeding StarMart Ghana Database ---');

  // 1. Staff
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('password123', salt);
  const staff = [
    { username: 'admin', name: 'Benjamin Adjei', password_hash: hash, role: 'ADMIN' },
    { username: 'manager', name: 'Kofi Mensah', password_hash: hash, role: 'MANAGER' },
    { username: 'cashier1', name: 'Ama Serwaa', password_hash: hash, role: 'CASHIER' },
    { username: 'cashier2', name: 'Kwame Boateng', password_hash: hash, role: 'CASHIER' },
    { username: 'cashier3', name: 'Esi Appiah', password_hash: hash, role: 'CASHIER' },
  ];
  const { data: staffData } = await supabase.from('pos_staff').upsert(staff, { onConflict: 'username' }).select();

  // 2. Categories
  const categories = [
    { name: 'Electronics', description: 'Gadgets, phones, and computing devices' },
    { name: 'Home Appliances', description: 'Kitchen and household equipment' },
    { name: 'Groceries', description: 'Daily essentials and food staples' },
    { name: 'Beverages', description: 'Drinks, juices, and water' },
    { name: 'Household', description: 'Cleaning supplies and home care' },
    { name: 'Personal Care', description: 'Beauty, hygiene, and wellness' },
    { name: 'Meat & Poultry', description: 'Fresh and frozen meat' },
    { name: 'Vegetables & Fruits', description: 'Fresh farm produce' },
    { name: 'Stationery', description: 'Office and school supplies' },
  ];
  const { data: catData } = await supabase.from('categories').upsert(categories, { onConflict: 'name' }).select();
  const catMap = Object.fromEntries(catData.map(c => [c.name, c.id]));

  // 3. Realistic Products
  const products = [];
  const templates = [
    { cat: 'Electronics', b: ['Samsung', 'Infinix', 'Tecno', 'Hisense', 'Apple'], items: [
      { n: 'Smartphone', p: 1400, d: 'Latest model with high-res camera' },
      { n: 'Smart Watch', p: 450, d: 'Fitness tracker with OLED screen' },
      { n: 'Power Bank 20k mAh', p: 180, d: 'Fast charging portable battery' },
      { n: 'Bluetooth Speaker', p: 250, d: 'Waterproof portable speaker' },
      { n: 'LED Monitor 24"', p: 1200, d: 'Full HD ultra-slim monitor' }
    ]},
    { cat: 'Home Appliances', b: ['Nasco', 'Midea', 'Binatone', 'Hisense', 'LG'], items: [
      { n: 'Electric Kettle', p: 160, d: '1.7L stainless steel kettle' },
      { n: 'Table Top Fridge', p: 1800, d: 'Energy efficient mini fridge' },
      { n: 'Microwave Oven', p: 850, d: 'Digital 20L microwave' },
      { n: 'Standing Fan', p: 420, d: 'High speed 16 inch fan' },
      { n: 'Iron', p: 130, d: 'Non-stick steam iron' },
      { n: 'Blender', p: 350, d: '500W blender with mill' }
    ]},
    { cat: 'Groceries', b: ['Gino', 'Frytol', 'Lele', 'Sultana', 'Annapurna'], items: [
      { n: 'Thai Jasmine Rice 5kg', p: 640, d: 'Extra long grain fragrant rice' },
      { n: 'Sunflower Oil 5L', p: 320, d: 'Healthy cooking oil' },
      { n: 'Tomato Paste 400g', p: 16, d: 'Rich double concentrate' },
      { n: 'Pasta Spaghetti 500g', p: 14, d: 'Durum wheat semolina pasta' },
      { n: 'Canned Mackerel', p: 12, d: 'In spicy tomato sauce' },
      { n: 'Baking Flour 2kg', p: 45, d: 'All-purpose white flour' }
    ]},
    { cat: 'Beverages', b: ['Verna', 'Bel-Aqua', 'Coca Cola', 'Milo', 'Nestea'], items: [
      { n: 'Bottled Water 1.5L', p: 6, d: 'Healthy premium mineral water' },
      { n: 'Soft Drink 500ml', p: 8, d: 'Refreshing carbonated drink' },
      { n: 'Chocolate Malt 400g', p: 45, d: 'Energy drink powder' },
      { n: 'Instant Coffee 100g', p: 55, d: 'Rich aromatic blend' },
      { n: 'Apple Juice 1L', p: 28, d: '100% pure fruit juice' }
    ]},
    { cat: 'Household', b: ['So Klin', 'Madar', 'Kleenex', 'Bic', 'Dettol'], items: [
      { n: 'Washing Powder 900g', p: 75, d: 'Powerful stain removal' },
      { n: 'Toilet Tissue 10pk', p: 55, d: 'Soft and absorbent 2-ply' },
      { n: 'Multi-surface Cleaner', p: 35, d: 'Kill 99.9% of germs' },
      { n: 'Gas Lighter', p: 20, d: 'Kitchen essential' },
      { n: 'Bleach 1L', p: 18, d: 'Sanitizing and whitening agent' }
    ]},
    { cat: 'Personal Care', b: ['Pepsodent', 'Dettol', 'Lux', 'Nivea', 'Vaseline'], items: [
      { n: 'Body Lotion 400ml', p: 65, d: 'Moisturizing skin care' },
      { n: 'Toothpaste 140g', p: 22, d: 'Complete herbal protection' },
      { n: 'Deodorant Spray', p: 45, d: '24hr freshness protection' },
      { n: 'Antiseptic Liquid', p: 40, d: 'Original germ protection' },
      { n: 'Shaving Cream', p: 30, d: 'Smooth glide formula' }
    ]}
  ];

  templates.forEach(t => {
    t.items.forEach(i => {
      t.b.forEach(brand => {
        const rawPrice = i.p + (Math.random() * 40 - 20);
        products.push({
          name: `${brand} ${i.n}`,
          category_id: catMap[t.cat],
          category: t.cat,
          price: Math.max(0.1, parseFloat(rawPrice.toFixed(2))),
          quantity: Math.floor(Math.random() * 200) + 20,
          barcode: `700${Math.floor(Math.random() * 9000000000) + 1000000000}`,
          description: i.d + ' by ' + brand
        });
      });
    });
  });

  const { data: pData, error: pErr } = await supabase.from('products').upsert(products.slice(0, 130), { onConflict: 'barcode' }).select();
  if (pErr) console.error('Product Error:', pErr.message);

  // 4. Customers
  const posC = Array.from({length: 5}).map((_, i) => ({ name: `POS Customer ${i+1}`, phone: `024000010${i}`, email: `pos${i}@test.com`, loyalty_points: i*50 }));
  const eC = Array.from({length: 5}).map((_, i) => ({ name: `Web Client ${i+1}`, email: `web${i}@test.com`, password_hash: hash, phone: `055000020${i}`, loyalty_points: i*100 }));
  await supabase.from('customer').upsert(posC, { onConflict: 'email' });
  const { data: ecData } = await supabase.from('e_customer').upsert(eC, { onConflict: 'email' }).select();

  // 5. Others
  const dps = ['Accra Mall', 'Kumasi Mall', 'West Hills', 'Achimota', 'Tema Hub', 'Tamale Office'].map(n => ({ name: n, address: n + ' Commercial Area', active: true }));
  await supabase.from('delivery_points').upsert(dps, { onConflict: 'name' });

  const supps = ['Melcom', 'Jumia', 'Kasapreko', 'FanMilk', 'Local Wholesalers'].map(n => ({ name: n, contact_person: 'Rep ' + n, phone: '030-200-000', email: n.toLowerCase() + '@supply.com' }));
  await supabase.from('suppliers').upsert(supps, { onConflict: 'name' });

  const promos = [
    { name: 'Independence Promo', code: 'GH67', discount_type: 'PERCENT', discount_value: 10, is_active: true },
    { name: 'Easter Special', code: 'EASTER', discount_type: 'FLAT', discount_value: 20, is_active: true },
    { name: 'Weekend Deal', code: 'WEEKEND', discount_type: 'PERCENT', discount_value: 5, is_active: true },
    { name: 'New User Discount', code: 'NEWSTAR', discount_type: 'FLAT', discount_value: 15, is_active: true },
    { name: 'Mega Sale', code: 'MEGA', discount_type: 'PERCENT', discount_value: 25, is_active: true }
  ];
  await supabase.from('promotions').upsert(promos, { onConflict: 'code' });

  // 6. Reviews & Expenses
  if (pData && ecData) {
    const revs = pData.slice(0, 30).flatMap(p => [{ product_id: p.id, e_customer_id: ecData[0].id, rating: 5, comment: 'Excellent!' }, { product_id: p.id, e_customer_id: ecData[1].id, rating: 4, comment: 'Good value' }]);
    await supabase.from('product_reviews').insert(revs);
  }

  const exps = [
    { description: 'Electricity', amount: 500, logged_by: staffData[0].id },
    { description: 'Water', amount: 150, logged_by: staffData[0].id },
    { description: 'Stationery', amount: 80, logged_by: staffData[1].id }
  ];
  await supabase.from('expenses').insert(exps);

  console.log('--- Seeding Done ---');
}

main().catch(console.error);
