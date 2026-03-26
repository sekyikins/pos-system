/**
 * Supabase Data Access Layer
 * Replaces mock-db.ts — all data operations go through Supabase.
 */
import { supabase } from './supabase';
import { Product, Sale, SalesItem, InventoryLog, StaffRecord, Customer } from './types';
import bcrypt from 'bcryptjs';

// ─── Type Helpers ────────────────────────────────────────────────────────────

/** Map Supabase snake_case row → Product */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toProduct(row: any): Product {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: Number(row.price),
    quantity: row.quantity,
    barcode: row.barcode,
  };
}


/** Map Supabase snake_case row → Sale */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSale(row: any): Sale {
  return {
    id: row.id,
    cashierId: row.cashier_id,
    customerId: row.customer_id,
    items: (row.sales_items ?? []).map(toSalesItem),
    totalAmount: Number(row.total_amount),
    discount: Number(row.discount),
    finalAmount: Number(row.final_amount),
    paymentMethod: row.payment_method,
    timestamp: row.created_at,
  };
}

/** Map Supabase snake_case row → SalesItem */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSalesItem(row: any): SalesItem {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    price: Number(row.price),
    quantity: row.quantity,
    subtotal: Number(row.subtotal),
  };
}

/** Map Supabase snake_case row → InventoryLog */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toInventoryLog(row: any): InventoryLog {
  return {
    id: row.id,
    productId: row.product_id,
    change: row.change,
    reason: row.reason,
    timestamp: row.timestamp,
  };
}

// ─── Products ────────────────────────────────────────────────────────────────

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name');
  if (error) throw error;
  return (data ?? []).map(toProduct);
}

export async function getProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return toProduct(data);
}

export async function getProductByBarcode(barcode: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('barcode', barcode)
    .single();
  if (error) return null;
  return toProduct(data);
}

export async function addProduct(p: Omit<Product, 'id'>): Promise<Product> {
  const { data: productRow, error: productErr } = await supabase
    .from('products')
    .insert({ name: p.name, category: p.category, price: p.price, quantity: p.quantity, barcode: p.barcode })
    .select()
    .single();
  if (productErr) throw productErr;

  const product = toProduct(productRow);

  // Log initial stock to inventory
  if (product.quantity > 0) {
    await supabase.from('inventory').insert({
      product_id: product.id,
      change: product.quantity,
      reason: 'RESTOCK',
    });
  }

  return product;
}

export async function updateProduct(id: string, updates: Partial<Product>, reasonOverride?: 'SALE' | 'RESTOCK' | 'ADJUSTMENT'): Promise<Product | null> {
  const row: Record<string, unknown> = {};
  if (updates.name !== undefined) row.name = updates.name;
  if (updates.category !== undefined) row.category = updates.category;
  if (updates.price !== undefined) row.price = updates.price;
  if (updates.quantity !== undefined) row.quantity = updates.quantity;
  if (updates.barcode !== undefined) row.barcode = updates.barcode;

  const { data: oldProd } = await supabase.from('products').select('quantity').eq('id', id).single();

  const { data, error } = await supabase
    .from('products')
    .update(row)
    .eq('id', id)
    .select()
    .single();
  if (error) return null;

  const product = toProduct(data);

  // Log to inventory if quantity changed
  if (updates.quantity !== undefined && oldProd) {
    const diff = updates.quantity - oldProd.quantity;
    if (diff !== 0) {
      const logReason: 'SALE' | 'RESTOCK' | 'ADJUSTMENT' = reasonOverride || (diff > 0 ? 'RESTOCK' : 'ADJUSTMENT');
      await supabase.from('inventory').insert({
        product_id: id,
        change: diff,
        reason: logReason,
      });
    }
  }

  return product;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}


// ─── Sales ───────────────────────────────────────────────────────────────────

export async function getSales(): Promise<Sale[]> {
  const { data, error } = await supabase
    .from('sales')
    .select('*, sales_items(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toSale);
}

export async function getSaleById(id: string): Promise<Sale | null> {
  const { data, error } = await supabase
    .from('sales')
    .select('*, sales_items(*)')
    .eq('id', id)
    .single();
  if (error) return null;
  return toSale(data);
}

export async function processSale(saleData: Omit<Sale, 'id' | 'timestamp'>): Promise<Sale> {
  // 1. Insert sale
  const { data: saleRow, error: saleErr } = await supabase
    .from('sales')
    .insert({
      cashier_id: saleData.cashierId,
      customer_id: saleData.customerId,
      total_amount: saleData.totalAmount,
      discount: saleData.discount,
      final_amount: saleData.finalAmount,
      payment_method: saleData.paymentMethod,
    })
    .select()
    .single();
  if (saleErr) throw saleErr;

  const saleId = saleRow.id;

  // 2. Insert sales_items
  const itemRows = saleData.items.map(item => ({
    sale_id: saleId,
    product_id: item.productId,
    product_name: item.productName,
    price: item.price,
    quantity: item.quantity,
    subtotal: item.subtotal,
  }));
  const { error: itemsErr } = await supabase.from('sales_items').insert(itemRows);
  if (itemsErr) throw itemsErr;

  // 3. Record payment
  const { error: paymentErr } = await supabase.from('payments').insert({
    sale_id: saleId,
    amount: saleData.finalAmount,
    method: saleData.paymentMethod,
  });
  if (paymentErr) throw paymentErr;

  // 4. Update product stock (logging handled inside updateProduct)
  for (const item of saleData.items) {
    const product = await getProductById(item.productId);
    if (product) {
      const newQty = product.quantity - item.quantity;
      await updateProduct(item.productId, { quantity: Math.max(0, newQty) }, 'SALE');
    }
  }

  // 5. Update Loyalty Points (50 pts per purchase day)
  if (saleData.customerId) {
    const { data: customer } = await supabase.from('customer').select('loyalty_points, last_purchase_date, order_count').eq('id', saleData.customerId).single();
    if (customer) {
      const today = new Date().toISOString().split('T')[0];
      const lastDate = customer.last_purchase_date;
      let newPoints = Number(customer.loyalty_points || 0);
      
      if (lastDate !== today) {
        newPoints += 50;
      }

      await supabase.from('customer').update({ 
        loyalty_points: newPoints,
        last_purchase_date: today,
        order_count: Number(customer.order_count || 0) + 1
      }).eq('id', saleData.customerId);
    }
  }

  const finalSale = await getSaleById(saleId);
  return finalSale!;
}

// ─── Inventory ───────────────────────────────────────────────────────────────

export async function getInventoryLogs(): Promise<InventoryLog[]> {
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .order('timestamp', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toInventoryLog);
}

export async function adjustInventory(productId: string, change: number, reason: InventoryLog['reason']): Promise<void> {
  const product = await getProductById(productId);
  if (!product) throw new Error('Product not found');
  const newQty = product.quantity + change;
  if (newQty < 0) throw new Error('Stock cannot be negative');
  await updateProduct(productId, { quantity: newQty });
  await supabase.from('inventory').insert({ product_id: productId, change, reason });
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function getUsers(): Promise<StaffRecord[]> {
  const { data, error } = await supabase
    .from('pos_staff')
    .select('id, name, username, role, password_hash, created_at')
    .order('name');
  if (error) throw error;
  return (data ?? []).map(row => ({
    id: row.id,
    name: row.name,
    username: row.username,
    role: row.role,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
  }));
}

export async function getUserByUsername(username: string): Promise<StaffRecord | null> {
  const { data, error } = await supabase
    .from('pos_staff')
    .select('*')
    .eq('username', username)
    .single();
  if (error) return null;
  return {
    id: data.id,
    name: data.name,
    username: data.username,
    role: data.role,
    passwordHash: data.password_hash,
    createdAt: data.created_at,
  };
}

export async function addUser(newUser: Omit<StaffRecord, 'id'>): Promise<StaffRecord> {
  const { data, error } = await supabase
    .from('pos_staff')
    .insert({
      name: newUser.name,
      username: newUser.username,
      password_hash: newUser.passwordHash,
      role: newUser.role,
    })
    .select()
    .single();
  if (error) throw error;
  return { 
    id: data.id, 
    name: data.name, 
    username: data.username, 
    role: data.role, 
    passwordHash: data.password_hash,
    createdAt: data.created_at
  };
}

export async function updateUser(id: string, updates: { name?: string; role?: string; password?: string }): Promise<void> {
  const row: Record<string, unknown> = {};
  if (updates.name) row.name = updates.name;
  if (updates.role) row.role = updates.role;
  if (updates.password) row.password_hash = await bcrypt.hash(updates.password, 10);
  await supabase.from('pos_staff').update(row).eq('id', id);
}

export async function deleteUser(id: string): Promise<void> {
  await supabase.from('pos_staff').delete().eq('id', id);
}

// ─── Payments ────────────────────────────────────────────────────────────────

export async function getPayments() {
  const { data, error } = await supabase
    .from('payments')
    .select('*, sales(cashier_id, customer_id, created_at)')
    .order('timestamp', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ─── POS CUSTOMERS ─────────────────────────────────────────────────────────────
export async function getPosCustomers(): Promise<Customer[]> {
  const { data: pos, error: posErr } = await supabase.from('customer').select('*').order('name');
  if (posErr) throw posErr;
  
  const { data: eco, error: ecoErr } = await supabase.from('e_customer').select('id, name, phone, email, loyalty_points, created_at');
  if (ecoErr) throw ecoErr;

  const merged: Customer[] = [
    ...(pos || []).map(c => ({ ...c, type: 'POS' as const })),
    ...(eco || []).map(c => ({ 
      id: c.id, 
      name: c.name, 
      phone: c.phone || undefined, 
      email: c.email || undefined, 
      loyalty_points: c.loyalty_points, 
      created_at: c.created_at,
      type: 'ECOMMERCE' as const 
    }))
  ];
  return merged;
}

export async function addPosCustomer(customer: Omit<Customer, 'id' | 'created_at' | 'loyalty_points'>) {
  const { data, error } = await supabase.from('customer').insert({ ...customer, loyalty_points: 0 }).select().single();
  if (error) throw error;
  return data;
}

export async function updatePosCustomer(id: string, updates: Partial<Customer>) {
  const { error } = await supabase.from('customer').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deletePosCustomer(id: string) {
  const { error } = await supabase.from('customer').delete().eq('id', id);
  if (error) throw error;
}

export * from './db_extended';

