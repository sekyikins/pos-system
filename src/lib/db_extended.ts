export * from './db';
// Extend this file via append to avoid large replace_file_content

import { supabase } from './supabase';
import { adjustInventory } from './db';
import { Sale, OnlineOrder, Category, DeliveryPoint, Expense, PurchaseOrder, PurchaseOrderItem } from './types';

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select('*').order('name');
  if (error) throw error;
  return data || [];
}

export async function addCategory(name: string, description: string): Promise<Category> {
  const { data, error } = await supabase.from('categories').insert({ name, description }).select().single();
  if (error) throw error;
  return data;
}

export async function updateCategory(id: string, name: string, description: string): Promise<void> {
  const { error } = await supabase.from('categories').update({ name, description }).eq('id', id);
  if (error) throw error;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}

export async function getDeliveryPoints(): Promise<DeliveryPoint[]> {
  const { data, error } = await supabase.from('delivery_points').select('*').order('name');
  if (error) throw error;
  return data || [];
}

export async function addDeliveryPoint(name: string, address: string, active: boolean): Promise<DeliveryPoint> {
  const { data, error } = await supabase.from('delivery_points').insert({ name, address, active }).select().single();
  if (error) throw error;
  return data;
}

export async function updateDeliveryPoint(id: string, name: string, address: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('delivery_points').update({ name, address, active }).eq('id', id);
  if (error) throw error;
}

export async function deleteDeliveryPoint(id: string): Promise<void> {
  const { error } = await supabase.from('delivery_points').delete().eq('id', id);
  if (error) throw error;
}

export async function getOnlineOrders(): Promise<OnlineOrder[]> {
  const { data, error } = await supabase.from('online_orders').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    eCustomerId: row.e_customer_id,
    deliveryPointId: row.delivery_point_id,
    deliveryAddress: row.delivery_address,
    totalAmount: Number(row.total_amount),
    status: row.status,
    paymentMethod: row.payment_method,
    paymentReference: row.payment_reference,
    processedBy: row.processed_by,
    processingStaffId: row.processing_staff_id,
    processingStartedAt: row.processing_started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  }));
}

export async function startProcessingOnlineOrder(id: string, staffId: string): Promise<void> {
  const { error } = await supabase.from('online_orders')
    .update({ 
      status: 'CONFIRMED', 
      processing_staff_id: staffId,
      processing_started_at: new Date().toISOString()
    })
    .eq('id', id);
  if (error) throw error;
}

export async function updateOnlineOrderStatus(id: string, status: string, staffId?: string): Promise<void> {
  const updates: Record<string, unknown> = { status };
  if (staffId && (status === 'DELIVERED' || status === 'CANCELLED')) {
    updates.processed_by = staffId;
    updates.completed_at = new Date().toISOString();
  }
  const { error } = await supabase.from('online_orders').update(updates).eq('id', id);
  if (error) throw error;
}

export async function getStorefrontSales(): Promise<Sale[]> {
  const { data, error } = await supabase
    .from('online_orders')
    .select('*, online_order_items(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  
  return (data || []).map(order => {
    const rawSubtotal = (order.online_order_items || []).reduce((sum: number, item: { subtotal: string | number }) => sum + Number(item.subtotal), 0);
    const calculatedDiscount = Math.max(0, rawSubtotal - Number(order.total_amount));
    
    return {
      id: order.id,
      cashierId: order.processing_staff_id || 'ONLINE',
      totalAmount: rawSubtotal,
      discount: calculatedDiscount, 
      finalAmount: Number(order.total_amount),
      paymentMethod: (order.payment_method === 'PAY_ON_DELIVERY' ? 'CASH' : order.payment_method) as Sale['paymentMethod'],
      promoCode: order.promo_name || undefined,
      status: order.status,
      timestamp: order.created_at,
      items: (order.online_order_items || []).map((item: { id: string; product_id: string; product_name: string; price: string | number; quantity: number; subtotal: string | number }) => ({
        id: item.id,
        productId: item.product_id,
        productName: item.product_name,
        price: Number(item.price),
        quantity: item.quantity,
        subtotal: Number(item.subtotal)
      }))
    };
  });
}

// ─── Suppliers ─────────────────────────────────────────────────────────────
import { Supplier, StoreSettings } from './types';

export async function getSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase.from('suppliers').select('*').order('name');
  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    contactPerson: row.contact_person,
    email: row.email,
    phone: row.phone,
    address: row.address,
    createdAt: row.created_at
  }));
}

export async function addSupplier(s: Omit<Supplier, 'id' | 'createdAt'>): Promise<Supplier> {
  const { data, error } = await supabase.from('suppliers').insert({
    name: s.name,
    contact_person: s.contactPerson,
    email: s.email,
    phone: s.phone,
    address: s.address
  }).select().single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    contactPerson: data.contact_person,
    email: data.email,
    phone: data.phone,
    address: data.address,
    createdAt: data.created_at
  };
}

export async function updateSupplier(id: string, s: Partial<Supplier>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (s.name) row.name = s.name;
  if (s.contactPerson !== undefined) row.contact_person = s.contactPerson;
  if (s.email !== undefined) row.email = s.email;
  if (s.phone !== undefined) row.phone = s.phone;
  if (s.address !== undefined) row.address = s.address;

  const { error } = await supabase.from('suppliers').update(row).eq('id', id);
  if (error) throw error;
}

export async function deleteSupplier(id: string): Promise<void> {
  const { error } = await supabase.from('suppliers').delete().eq('id', id);
  if (error) throw error;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', GHS: '₵', NGN: '₦', KES: 'KSh', ZAR: 'R', JPY: '¥', CNY: '¥', INR: '₹', CAD: 'C$', AUD: 'A$'
};

export async function getStoreSettings(): Promise<StoreSettings> {
  const { data, error } = await supabase.from('store_settings').select('*').limit(1).single();
  if (error) {
    // If no settings found, return default
    return {
      id: 'default',
      storeName: 'My Store',
      currency: 'GHS',
      currencySymbol: '₵',
      taxRate: 0,
      receiptHeader: null,
      receiptFooter: null,
      updatedAt: new Date().toISOString()
    };
  }
  return {
    id: data.id,
    storeName: data.store_name,
    currency: data.currency,
    currencySymbol: data.currency_symbol || CURRENCY_SYMBOLS[data.currency as string] || '$',
    taxRate: Number(data.tax_rate),
    receiptHeader: data.receipt_header,
    receiptFooter: data.receipt_footer,
    updatedAt: data.updated_at
  };
}

export async function updateStoreSettings(id: string, s: Partial<StoreSettings>): Promise<void> {
  const row: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  };
  
  // Only include defined fields
  if (s.storeName !== undefined) row.store_name = s.storeName;
  if (s.currency !== undefined) {
    row.currency = s.currency;
    // Map the symbol if not provided, or if the update only includes the currency code
    row.currency_symbol = s.currencySymbol || CURRENCY_SYMBOLS[s.currency] || '$';
  } else if (s.currencySymbol !== undefined) {
    row.currency_symbol = s.currencySymbol;
  }
  
  if (s.taxRate !== undefined) row.tax_rate = s.taxRate;
  if (s.receiptHeader !== undefined) row.receipt_header = s.receiptHeader;
  if (s.receiptFooter !== undefined) row.receipt_footer = s.receiptFooter;

  // Use upsert to handle the case where settings haven't been created yet
  // If id is 'default', we remove it to allow Supabase to generate a UUID
  const upsertData = id === 'default' ? row : { ...row, id };
  
  const { error } = await supabase.from('store_settings').upsert(upsertData);
  if (error) throw error;
}

// ─── Promotions ─────────────────────────────────────────────────────────────
import { Promotion } from './types';

export async function getPromotions(): Promise<Promotion[]> {
  const { data, error } = await supabase.from('promotions').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    code: row.code,
    discountType: row.discount_type,
    discountValue: Number(row.discount_value),
    isActive: row.is_active,
    minSubtotal: Number(row.min_subtotal || 0),
    startDate: row.start_date,
    endDate: row.end_date,
    usageCount: Number(row.usage_count || 0),
    createdAt: row.created_at
  }));
}

export async function addPromotion(p: Omit<Promotion, 'id' | 'createdAt'>): Promise<Promotion> {
  const { data, error } = await supabase.from('promotions').insert({
    name: p.name,
    code: p.code,
    discount_type: p.discountType,
    discount_value: p.discountValue,
    is_active: p.isActive,
    min_subtotal: p.minSubtotal,
    start_date: p.startDate,
    end_date: p.endDate,
    usage_count: p.usageCount || 0
  }).select().single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    code: data.code,
    discountType: data.discount_type,
    discountValue: Number(data.discount_value),
    isActive: data.is_active,
    minSubtotal: Number(data.min_subtotal || 0),
    startDate: data.start_date,
    endDate: data.end_date,
    usageCount: Number(data.usage_count || 0),
    createdAt: data.created_at
  };
}

export async function updatePromotion(id: string, p: Partial<Promotion>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (p.name) row.name = p.name;
  if (p.code) row.code = p.code;
  if (p.discountType) row.discount_type = p.discountType;
  if (p.discountValue !== undefined) row.discount_value = p.discountValue;
  if (p.isActive !== undefined) row.is_active = p.isActive;
  if (p.minSubtotal !== undefined) row.min_subtotal = p.minSubtotal;
  // Support clearing dates (pass null explicitly) or setting new values
  if ('startDate' in p) row.start_date = p.startDate ?? null;
  if ('endDate' in p) row.end_date = p.endDate ?? null;

  const { error } = await supabase.from('promotions').update(row).eq('id', id);
  if (error) throw error;
}

export async function deletePromotion(id: string): Promise<void> {
  const { error } = await supabase.from('promotions').delete().eq('id', id);
  if (error) throw error;
}

// ─── Purchase Orders ───────────────────────────────────────────────────────

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('*, suppliers(name), purchase_order_items(*, products(name))')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    supplierId: row.supplier_id,
    supplierName: row.suppliers?.name,
    status: row.status,
    totalAmount: Number(row.total_amount),
    createdAt: row.created_at,
    items: (row.purchase_order_items || []).map((item: { id: string; po_id: string; product_id: string; products?: { name: string }; quantity: number; unit_cost: number; subtotal: number; created_at: string }) => ({
      id: item.id,
      poId: item.po_id,
      productId: item.product_id,
      productName: item.products?.name,
      quantity: item.quantity,
      unitCost: Number(item.unit_cost),
      subtotal: Number(item.subtotal),
      createdAt: item.created_at,
    })),
  }));
}

export async function addPurchaseOrder(po: Omit<PurchaseOrder, 'id' | 'createdAt'>, items: Omit<PurchaseOrderItem, 'id' | 'poId' | 'createdAt'>[]): Promise<PurchaseOrder> {
  const { data: poRow, error: poErr } = await supabase
    .from('purchase_orders')
    .insert({
      supplier_id: po.supplierId,
      status: po.status,
      total_amount: po.totalAmount,
    })
    .select()
    .single();
  if (poErr) throw poErr;

  const itemRows = items.map(item => ({
    po_id: poRow.id,
    product_id: item.productId,
    quantity: item.quantity,
    unit_cost: item.unitCost,
    subtotal: item.subtotal,
  }));

  const { error: itemsErr } = await supabase.from('purchase_order_items').insert(itemRows);
  if (itemsErr) throw itemsErr;

  return { ...poRow, items: [] }; // Items not fully mapped here for simplicity in return
}

export async function updatePurchaseOrderStatus(id: string, status: PurchaseOrder['status']): Promise<void> {
  // If moving to RECEIVED, update stock
  if (status === 'RECEIVED') {
    const { data: po, error: poErr } = await supabase
      .from('purchase_orders')
      .select('*, purchase_order_items(*)')
      .eq('id', id)
      .single();
    
    if (poErr) throw poErr;
    if (po.status === 'RECEIVED') return; // already received

    for (const item of po.purchase_order_items) {
      await adjustInventory(item.product_id, item.quantity, 'RESTOCK', po.supplier_id);
    }
  }

  const { error } = await supabase
    .from('purchase_orders')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
}

// ─── Expenses ─────────────────────────────────────────────────────────────

export async function getExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*, pos_staff(name)')
    .order('expense_date', { ascending: false });
  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    description: row.description,
    amount: Number(row.amount),
    expenseDate: row.expense_date,
    loggedBy: row.logged_by,
    loggedByName: row.pos_staff?.name,
    createdAt: row.created_at,
  }));
}

export async function addExpense(e: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      description: e.description,
      amount: e.amount,
      expense_date: e.expenseDate,
      logged_by: e.loggedBy,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw error;
}
