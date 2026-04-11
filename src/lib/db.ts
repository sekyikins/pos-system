/**
 * Supabase Data Access Layer
 * Replaces mock-db.ts — all data operations go through Supabase.
 */
import { supabase } from './supabase';
import { Product, Sale, TransactionItem, InventoryLog, StaffRecord, Customer, Role } from './types';
import bcrypt from 'bcryptjs';

// ─── Type Helpers ────────────────────────────────────────────────────────────
export const generateReference = (method: string): string => {
  if (method === 'PAYSTACK') {
    return Array.from({ length: 13 }, () => Math.floor(Math.random() * 10)).join('');
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 13 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
};

/** Map Supabase snake_case row → Product */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toProduct(row: any): Product {
  if (!row) return {} as Product;
  
  const supplierInfo = Array.isArray(row.product_suppliers) ? row.product_suppliers[0] : row.product_suppliers;
  return {
    ...row,
    categoryId: row.category_id || row.category,
    category: row.categories?.name || row.category || 'Uncategorized',
    price: Number(row.price || 0),
    costPrice: Number(row.cost_price || 0),
    quantity: Number(row.quantity || 0),
    // Map from product_images table join
    image_url: Array.isArray(row.product_images) ? row.product_images[0]?.image_url : (row.image_url || undefined),
    supplierId: supplierInfo?.supplier_id || undefined,
    supplierName: supplierInfo?.suppliers?.name || undefined,
    is_returnable: row.is_returnable,
  };
}


/** Map Supabase snake_case row → Sale */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSale(row: any): Sale {
  if (!row) return {} as Sale;
  return {
    id: row.id,
    cashierId: row.cashier_id,
    customerId: row.customer_id,
    items: Array.isArray(row.transaction_items) ? row.transaction_items.map(toTransactionItem) : [],
    totalAmount: Number(row.total_amount || 0),
    discount: Number(row.discount || 0),
    finalAmount: Number(row.final_amount || 0),
    paymentMethodId: row.payment_method_id,
    paymentReference: row.payment_reference || undefined,
    promotionId: row.promotion_id || undefined,
    promoName: row.promotions?.name || undefined,
    timestamp: row.created_at,
    is_returned: row.is_returned,
  };
}

/** Map Supabase snake_case row → TransactionItem */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toTransactionItem(row: any): TransactionItem {
  if (!row) return {} as TransactionItem;
  return {
    id: row.id,
    saleId: row.sale_id,
    orderId: row.order_id,
    productId: row.product_id,
    productName: row.products?.name, // From join
    price: Number(row.price || 0),
    costPrice: Number(row.cost_price || 0),
    quantity: row.quantity || 0,
    subtotal: Number(row.subtotal || 0),
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
    supplierId: row.supplier_id || undefined,
    supplierName: row.suppliers?.name || undefined,
    staffId: row.staff_id || undefined,
    staffName: row.pos_staff?.name || undefined,
    customerId: row.customer_id || undefined,
    customerName: row.customers?.name || undefined,
  };
}

// ─── Products ────────────────────────────────────────────────────────────────

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, product_images(image_url), product_suppliers(supplier_id, suppliers(name)), categories(name)')
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

export async function addProduct(p: Omit<Product, 'id'>, imageFile?: File, staffId?: string): Promise<Product> {
  const { data: productRow, error: productErr } = await supabase
    .from('products')
    .insert({ 
      name: p.name, 
      category_id: p.categoryId || null, 
      category: p.category, 
      price: p.price, 
      cost_price: p.costPrice || 0,
      quantity: p.quantity, 
      barcode: p.barcode,
      is_returnable: p.is_returnable ?? true
    })
    .select()
    .single();
  if (productErr) throw productErr;

  const product = toProduct(productRow);

  // 1. Handle Supplier (Check/Create and Link)
  if (p.supplierName) {
    // Find or create supplier
    let { data: supplier } = await supabase.from('suppliers').select('id').eq('name', p.supplierName).single();
    if (!supplier) {
      const { data: newSup, error: supErr } = await supabase.from('suppliers').insert({ name: p.supplierName }).select('id').single();
      if (!supErr) supplier = newSup;
    }
    if (supplier) {
      await supabase.from('product_suppliers').insert({ product_id: product.id, supplier_id: supplier.id });
      product.supplierId = supplier.id;
      product.supplierName = p.supplierName;
    }
  }

  // 2. Upload image if provided
  if (imageFile) {
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${product.id}-${Math.random()}.${fileExt}`;
    const { error: storageErr } = await supabase.storage
      .from('Products Images')
      .upload(fileName, imageFile, { contentType: imageFile.type });
    if (storageErr) {
      console.error('Storage Upload Error:', storageErr);
      throw new Error(`Image upload failed: ${storageErr.message}. Ensure the "Products Images" bucket exists and has correct policies.`);
    }
    const { data: { publicUrl } } = supabase.storage.from('Products Images').getPublicUrl(fileName);
    await supabase.from('product_images').insert({ product_id: product.id, image_url: publicUrl });
    product.image_url = publicUrl;
  }

  // Log initial stock to inventory
  if (product.quantity > 0) {
    await supabase.from('inventory').insert({
      product_id: product.id,
      change: product.quantity,
      reason: 'RESTOCK',
      staff_id: staffId || null,
      supplier_id: product.supplierId || null
    });
  }

  return product;
}

export async function updateProduct(id: string, updates: Partial<Product>, reasonOverride?: 'SALE' | 'RESTOCK' | 'ADJUSTMENT' | string, imageFile?: File, supplierId?: string, staffId?: string, customerId?: string): Promise<Product | null> {
  const row: Record<string, unknown> = {};
  if (updates.name !== undefined) row.name = updates.name;
  if (updates.categoryId !== undefined) row.category_id = updates.categoryId;
  if (updates.category !== undefined) row.category = updates.category;
  if (updates.price !== undefined) row.price = updates.price;
  if (updates.costPrice !== undefined) row.cost_price = updates.costPrice;
  if (updates.quantity !== undefined) row.quantity = updates.quantity;
  if (updates.barcode !== undefined) row.barcode = updates.barcode;
  if (updates.is_returnable !== undefined) row.is_returnable = updates.is_returnable;

  const { data: oldProd } = await supabase.from('products').select('quantity').eq('id', id).single();

  const { data, error } = await supabase
    .from('products')
    .update(row)
    .eq('id', id)
    .select('*, product_images(image_url), product_suppliers(supplier_id, suppliers(name))')
    .single();
  if (error) return null;

  // Update Supplier link (Denormalized in product_suppliers)
  if (updates.supplierName) {
    let { data: supplier } = await supabase.from('suppliers').select('id').eq('name', updates.supplierName).single();
    if (!supplier) {
      const { data: newSup, error: supErr } = await supabase.from('suppliers').insert({ name: updates.supplierName }).select('id').single();
      if (!supErr) supplier = newSup;
    }
    if (supplier) {
      await supabase.from('product_suppliers').delete().eq('product_id', id);
      await supabase.from('product_suppliers').insert({ product_id: id, supplier_id: supplier.id });
    }
  }

  // Upload image if provided
  if (imageFile) {
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${id}-${Math.random()}.${fileExt}`;
    const { error: storageErr } = await supabase.storage
      .from('Products Images')
      .upload(fileName, imageFile, { contentType: imageFile.type });
    if (storageErr) {
      throw new Error(`Image upload failed: ${storageErr.message}`);
    }
    const { data: { publicUrl } } = supabase.storage.from('Products Images').getPublicUrl(fileName);
    await supabase.from('product_images').delete().eq('product_id', id);
    await supabase.from('product_images').insert({ product_id: id, image_url: publicUrl });
    data.product_images = [{ image_url: publicUrl }];
  }

  // Log to inventory if quantity changed (Single Source of Truth for Logs)
  if (updates.quantity !== undefined && oldProd) {
    const diff = Number(updates.quantity) - Number(oldProd.quantity);
    if (diff !== 0) {
      const logReason = reasonOverride || (diff > 0 ? 'RESTOCK' : 'ADJUSTMENT');
      const { error: logErr } = await supabase.from('inventory').insert({
        product_id: id,
        change: diff,
        reason: logReason,
        supplier_id: supplierId || null,
        staff_id: staffId || null,
        customer_id: customerId || null
      });
      if (logErr) console.error('Inventory Log Error:', logErr);
    }
  }

  const product = toProduct(data);
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
    .select('*, transaction_items(*, products(name)), promotions(name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toSale);
}

export async function getSaleById(id: string): Promise<Sale | null> {
  const { data, error } = await supabase
    .from('sales')
    .select('*, transaction_items(*, products(name)), promotions(name)')
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
      payment_method_id: saleData.paymentMethodId,
      payment_reference: saleData.paymentReference || generateReference(saleData.paymentMethodId),
      promotion_id: saleData.promotionId || null,
    })
    .select()
    .single();
  if (saleErr) throw saleErr;

  const saleId = saleRow.id;

  // 2. Insert transaction_items
  const itemRows = saleData.items.map(item => ({
    sale_id: saleId,
    product_id: item.productId,
    price: item.price,
    cost_price: item.costPrice || 0,
    quantity: item.quantity,
    subtotal: item.subtotal,
  }));
  const { error: itemsErr } = await supabase.from('transaction_items').insert(itemRows);
  if (itemsErr) throw itemsErr;

  // 3. Record payment
  const { error: paymentErr } = await supabase.from('payments').insert({
    sale_id: saleId,
    amount: saleData.finalAmount,
    payment_method_id: saleData.paymentMethodId,
  });
  if (paymentErr) throw paymentErr;

  // 4. Update product stock
  for (const item of saleData.items) {
    const product = await getProductById(item.productId);
    if (product) {
      const newQty = product.quantity - item.quantity;
      await updateProduct(item.productId, { quantity: Math.max(0, newQty) }, 'SALE', undefined, undefined, saleData.cashierId, saleData.customerId);
    }
  }

  // 5. Update Loyalty Points
  if (saleData.customerId) {
    const { data: customer } = await supabase
      .from('customers')
      .select('loyalty_points, last_purchase_date, order_count, type')
      .eq('id', saleData.customerId)
      .single();

    if (customer) {
      const today = new Date().toISOString().split('T')[0];
      const lastDate = customer.last_purchase_date;
      const orderCount = Number(customer.order_count || 0);
      let newPoints = Number(customer.loyalty_points || 0);
      let newType = customer.type;

      // Upgrade type if they were only ONLINE
      if (customer.type === 'ONLINE') {
        newType = 'BOTH';
      }
      
      if (lastDate !== today) {
        newPoints += 50;
      } else {
        newPoints += 10;
      }

      await supabase.from('customers').update({ 
        loyalty_points: newPoints,
        last_purchase_date: today,
        order_count: orderCount + 1,
        type: newType
      }).eq('id', saleData.customerId);
    }
  }

  // 6. Update promo usage count
  if (saleData.promotionId) {
    const { data: promo } = await supabase.from('promotions').select('usage_count').eq('id', saleData.promotionId).single();
    if (promo) {
      await supabase.from('promotions').update({ usage_count: (promo.usage_count || 0) + 1 }).eq('id', saleData.promotionId);
    }
  }

  const finalSale = await getSaleById(saleId);
  return finalSale!;
}

// ─── Inventory ───────────────────────────────────────────────────────────────

export async function getInventoryLogs(): Promise<InventoryLog[]> {
  const { data, error } = await supabase
    .from('inventory')
    .select('*, suppliers(name), pos_staff(name), customers(name)')
    .order('timestamp', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toInventoryLog);
}

export async function adjustInventory(productId: string, change: number, reason: InventoryLog['reason'], supplierId?: string, staffId?: string, customerId?: string): Promise<void> {
  const product = await getProductById(productId);
  if (!product) throw new Error('Product not found');
  const newQty = product.quantity + change;
  if (newQty < 0) throw new Error('Stock cannot be negative');
  
  await updateProduct(productId, { quantity: newQty }, reason, undefined, supplierId, staffId, customerId);
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
    role: row.role as Role,
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
    role: data.role as Role,
    passwordHash: data.password_hash,
    createdAt: data.created_at,
  };
}

export async function addUser(newUser: Omit<StaffRecord, 'id' | 'createdAt'>): Promise<StaffRecord> {
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
    role: data.role as Role, 
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
    .select('*, sales(cashier_id, customer_id, created_at), online_orders(customer_id, created_at)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ─── Unified CUSTOMERS ─────────────────────────────────────────────────────────────
export async function getAllCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase.from('customers').select('*').order('name');
  if (error) throw error;
  return data || [];
}

export async function getPosCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase.from('customers').select('*').in('type', ['IN_STORE', 'BOTH']).order('name');
  if (error) throw error;
  return data || [];
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const { data, error } = await supabase.from('customers').select('*').eq('id', id).maybeSingle();
  if (error) return null;
  return data;
}

export async function addPosCustomer(customer: Omit<Customer, 'id' | 'created_at' | 'loyalty_points' | 'type'>) {
  const email = customer.email?.toLowerCase();
  const phone = customer.phone;

  // 1. Check if user already exists by email or phone
  let query = supabase.from('customers').select('*');
  
  if (email && phone) {
    query = query.or(`email.eq.${email},phone.eq.${phone}`);
  } else if (email) {
    query = query.eq('email', email);
  } else if (phone) {
    query = query.eq('phone', phone);
  } else {
    // No identifier provided, just insert as new
    const { data, error } = await supabase.from('customers').insert({ ...customer, type: 'IN_STORE', loyalty_points: 0 }).select().single();
    if (error) throw error;
    return data;
  }

  const { data: existing } = await query.maybeSingle();

  if (existing) {
    if (existing.type === 'ONLINE') {
      // UPGRADE: Link this online user to the store
      const { data, error } = await supabase
        .from('customers')
        .update({ 
          name: customer.name || existing.name,
          phone: phone || existing.phone,
          email: email || existing.email,
          type: 'BOTH' 
        })
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } else {
      // Already IN_STORE or BOTH, just return existing
      return existing;
    }
  }

  // 2. New POS customer
  const { data, error } = await supabase.from('customers').insert({ ...customer, type: 'IN_STORE', loyalty_points: 0 }).select().single();
  if (error) throw error;
  return data;
}

export async function updateCustomer(id: string, updates: Partial<Customer>) {
  const { error } = await supabase.from('customers').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteCustomer(id: string) {
  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) throw error;
}

export * from './db_extended';
