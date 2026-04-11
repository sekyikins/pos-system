export * from './db';

import { supabase } from './supabase';
import { adjustInventory, updateProduct, generateReference } from './db';
import { Sale, OnlineOrder, Category, DeliveryPoint, Expense, PurchaseOrder, PurchaseOrderItem, Promotion, Supplier, StoreSettings, TransactionItem, Return } from './types';

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
  const { data, error } = await supabase
    .from('online_orders')
    .select('*, transaction_items(*, products(name)), promotions(name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    customerId: row.customer_id,
    deliveryPointId: row.delivery_point_id,
    deliveryAddress: row.delivery_address,
    totalAmount: Number(row.total_amount),
    status: row.status as OnlineOrder['status'],
    paymentMethodId: row.payment_method_id,
    paymentReference: row.payment_reference,
    promotionId: row.promotion_id,
    promoName: row.promotions?.name,
    endProcessStaffId: row.end_process_staff_id,
    startProcessStaffId: row.start_process_staff_id,
    processingStartedAt: row.processing_started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  } as OnlineOrder));
}

export async function startProcessingOnlineOrder(id: string, staffId: string): Promise<void> {
  const { error } = await supabase.from('online_orders')
    .update({ 
      status: 'CONFIRMED', 
      start_process_staff_id: staffId,
      processing_started_at: new Date().toISOString()
    })
    .eq('id', id);
  if (error) throw error;
}

export async function updateOnlineOrderStatus(id: string, status: string, staffId?: string): Promise<void> {
  const updates: Record<string, unknown> = { status };
  
  if (status === 'DELIVERED') {
    // 1. Fetch current order to check payment method and existing reference
    const { data: order } = await supabase.from('online_orders').select('payment_method_id, payment_reference').eq('id', id).single();
    if (order && !order.payment_reference) {
      updates.payment_reference = generateReference(order.payment_method_id);
    }
    
    if (staffId) {
      updates.end_process_staff_id = staffId;
      updates.completed_at = new Date().toISOString();
    }
  } else if (staffId && status === 'CANCELLED') {
    updates.end_process_staff_id = staffId;
    updates.completed_at = new Date().toISOString();
  }

  const { error } = await supabase.from('online_orders').update(updates).eq('id', id);
  if (error) throw error;
}

export async function getStorefrontSales(): Promise<Sale[]> {
  const { data, error } = await supabase
    .from('online_orders')
    .select('*, transaction_items(*, products(name)), promotions(name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  
  return (data || []).map(order => {
    const rawSubtotal = (order.transaction_items || []).reduce((sum: number, item: { subtotal: string | number }) => sum + Number(item.subtotal), 0);
    const calculatedDiscount = Math.max(0, rawSubtotal - Number(order.total_amount));
    
    return {
      id: order.id,
      cashierId: order.start_process_staff_id || 'ONLINE',
      totalAmount: rawSubtotal,
      discount: calculatedDiscount, 
      finalAmount: Number(order.total_amount),
      paymentMethodId: order.payment_method_id,
      promotionId: order.promotion_id,
      promoName: order.promotions?.name,
      status: order.status,
      timestamp: order.created_at,
      is_returned: order.is_returned,
      items: (order.transaction_items || []).map((item: { id: string, product_id: string, products: { name: string } | null, price: string | number, cost_price?: string | number, quantity: number, subtotal: string | number }) => ({
        id: item.id,
        productId: item.product_id,
        productName: item.products?.name,
        price: Number(item.price),
        costPrice: Number(item.cost_price || 0),
        quantity: item.quantity,
        subtotal: Number(item.subtotal)
      } as TransactionItem))
    } as unknown as Sale;
  });
}

// ─── Suppliers ─────────────────────────────────────────────────────────────

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
  
  if (s.storeName !== undefined) row.store_name = s.storeName;
  if (s.currency !== undefined) {
    row.currency = s.currency;
    row.currency_symbol = s.currencySymbol || CURRENCY_SYMBOLS[s.currency] || '$';
  } else if (s.currencySymbol !== undefined) {
    row.currency_symbol = s.currencySymbol;
  }
  
  if (s.taxRate !== undefined) row.tax_rate = s.taxRate;
  if (s.receiptHeader !== undefined) row.receipt_header = s.receiptHeader;
  if (s.receiptFooter !== undefined) row.receipt_footer = s.receiptFooter;

  const upsertData = id === 'default' ? row : { ...row, id };
  
  const { error } = await supabase.from('store_settings').upsert(upsertData);
  if (error) throw error;
}

// ─── Promotions ─────────────────────────────────────────────────────────────

export async function getPromotions(): Promise<Promotion[]> {
  const { data, error } = await supabase.from('promotions').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    code: row.code,
    discountType: row.discount_type as Promotion['discountType'],
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

interface PurchaseOrderRow {
  id: string;
  supplier_id: string;
  suppliers: { name: string } | null;
  status: string;
  total_amount: number;
  created_at: string;
  purchase_order_items: Array<{
    id: string;
    po_id: string;
    product_id: string;
    products: { name: string } | null;
    quantity: number;
    unit_cost: number | string;
    subtotal: number | string;
    created_at: string;
  }>;
}

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('*, suppliers(name), purchase_order_items(*, products(name))')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as PurchaseOrderRow[] || []).map(row => ({
    id: row.id,
    supplierId: row.supplier_id,
    supplierName: row.suppliers?.name,
    status: row.status as PurchaseOrder['status'],
    totalAmount: Number(row.total_amount),
    createdAt: row.created_at,
    items: (row.purchase_order_items || []).map(item => ({
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

  return {
    id: poRow.id,
    supplierId: poRow.supplier_id,
    status: poRow.status,
    totalAmount: Number(poRow.total_amount),
    createdAt: poRow.created_at,
    items: [],
  }; 
}

export async function updatePurchaseOrderStatus(id: string, status: PurchaseOrder['status'], staffId?: string): Promise<void> {
  if (status === 'RECEIVED') {
    const { data: po, error: poErr } = await supabase
      .from('purchase_orders')
      .select('*, purchase_order_items(*)')
      .eq('id', id)
      .single();
    
    if (poErr) throw poErr;
    if (po.status === 'RECEIVED') return; 

    for (const item of po.purchase_order_items) {
      await adjustInventory(item.product_id, item.quantity, 'PURCHASE_ORDER', po.supplier_id, staffId);
      // Automatically update the main product cost with the latest purchase cost
      await updateProduct(item.product_id, { costPrice: Number(item.unit_cost) });
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
  return data as Expense;
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw error;
}

// ─── Returns ────────────────────────────────────────────────────────────────
export async function getReturns(): Promise<Return[]> {
  const { data, error } = await supabase
    .from('returns')
    .select(`
      *,
      items:return_items(*, products(name)),
      customer:customers(name),
      initiated:pos_staff!initiated_by_staff_id(name),
      processed:pos_staff!processed_by_staff_id(name)
    `)
    .order('requested_at', { ascending: false });

  if (error) throw error;
  
  return (data || []).map(r => ({
    id: r.id,
    sale_id: r.sale_id,
    order_id: r.order_id,
    customer_id: r.customer_id,
    initiated_by_staff_id: r.initiated_by_staff_id,
    processed_by_staff_id: r.processed_by_staff_id,
    source: r.source as 'IN_STORE' | 'ONLINE',
    reason: r.reason,
    status: r.status as Return['status'],
    refund_amount: r.refund_amount ? Number(r.refund_amount) : null,
    rejection_reason: r.rejection_reason,
    requested_at: r.requested_at,
    processed_at: r.processed_at,
    completed_at: r.completed_at,
    // @ts-expected-ignore - Supabase join typing limits
    customer_name: r.customer?.name,
    // @ts-expected-ignore
    initiated_by_name: r.initiated?.name,
    // @ts-expected-ignore
    processed_by_name: r.processed?.name,
    // @ts-expected-ignore
    items: r.items?.map((i: { id: string, return_id: string, product_id: string, products: { name: string } | null, quantity: number, unit_price: string | number, subtotal: string | number }) => ({
      id: i.id,
      return_id: i.return_id,
      product_id: i.product_id,
      product_name: i.products?.name,
      quantity: i.quantity,
      unit_price: Number(i.unit_price),
      subtotal: Number(i.subtotal)
    })) || []
  }));
}

export async function getSaleForReturn(saleIdOrShortId: string): Promise<Sale | null> {
  const isFullUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(saleIdOrShortId);

  let data;
  if (isFullUUID) {
    const { data: qData, error } = await supabase
      .from('sales')
      .select('*, transaction_items(*, products(name, is_returnable))')
      .eq('id', saleIdOrShortId)
      .single();
    if (error) return null;
    data = qData;
  } else {
    // For short IDs (receipt format), search within the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data: qData, error } = await supabase
      .from('sales')
      .select('*, transaction_items(*, products(name, is_returnable))')
      .gte('created_at', sevenDaysAgo.toISOString());
      
    if (error || !qData) return null;
    
    data = qData.find(s => s.id.toLowerCase().endsWith(saleIdOrShortId.toLowerCase()) || 
                           s.id.toLowerCase().includes(saleIdOrShortId.toLowerCase()));
    if (!data) throw new Error('Sale not found within the last 7 days using the provided short ID.');
  }

  if (!data) return null;
  if (data.is_returned) throw new Error('This sale has already been fully returned.');

  // Validate 7 days
  const saleDate = new Date(data.created_at);
  const diffDays = (new Date().getTime() - saleDate.getTime()) / (1000 * 3600 * 24);
  if (diffDays > 7) throw new Error('Return window (7 days) has expired for this sale.');

  return {
    id: data.id,
    cashierId: data.cashier_id,
    customerId: data.customer_id,
    totalAmount: Number(data.total_amount),
    discount: Number(data.discount || 0),
    finalAmount: Number(data.final_amount),
    paymentMethodId: data.payment_method_id,
    paymentReference: data.payment_reference,
    promotionId: data.promotion_id,
    timestamp: data.created_at,
    is_returned: data.is_returned,
    // @ts-expected-ignore
    items: data.transaction_items.map((i: { product_id: string, products: { name: string, is_returnable: boolean } | null, price: string | number, quantity: number, subtotal: string | number }) => ({
      productId: i.product_id,
      productName: i.products?.name,
      price: Number(i.price),
      quantity: i.quantity,
      subtotal: Number(i.subtotal),
      is_returnable: i.products?.is_returnable ?? true
    }))
  };
}

export async function checkReturnEligibility(saleId: string, customerId?: string | null): Promise<void> {
  // Rule: Max 2 returns per order/sale
  const { count: returnCount } = await supabase
    .from('returns')
    .select('*', { count: 'exact', head: true })
    .eq('sale_id', saleId)
    .not('status', 'eq', 'REJECTED');
    
  if (returnCount && returnCount >= 2) {
    throw new Error('Maximum limit of 2 returns per sale has been reached.');
  }

  // Rule: Max 2 returns per customer per day
  if (customerId) {
    const today = new Date().toISOString().split('T')[0]; // simple YYYY-MM-DD
    const { count: todayReturnCount } = await supabase
      .from('returns')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customerId)
      .gte('requested_at', `${today}T00:00:00.000Z`);

    if (todayReturnCount && todayReturnCount >= 2) {
      throw new Error('Customer has reached the daily limit of 2 return requests.');
    }
  }
}

export async function initiateInStoreReturn(
  saleId: string, 
  staffId: string, 
  customerId: string | undefined, 
  reason: string, 
  items: { productId: string, quantity: number, unitPrice: number }[]
) {
  // 1. Calculate refund (80%)
  const returnItemsSubtotal = items.reduce((acc, curr) => acc + (curr.quantity * curr.unitPrice), 0);
  const refundAmount = Number((returnItemsSubtotal * 0.8).toFixed(2));

  // 2. Insert Returns header
  const { data: returnRec, error } = await supabase
    .from('returns')
    .insert({
      sale_id: saleId,
      customer_id: customerId || null,
      initiated_by_staff_id: staffId,
      source: 'IN_STORE',
      reason,
      status: 'REQUESTED',
      refund_amount: refundAmount
    })
    .select()
    .single();

  if (error) throw error;

  // 3. Insert items
  const itemRows = items.map(i => ({
    return_id: returnRec.id,
    product_id: i.productId,
    quantity: i.quantity,
    unit_price: i.unitPrice,
    subtotal: Number((i.quantity * i.unitPrice).toFixed(2))
  }));

  const { error: itemsErr } = await supabase.from('return_items').insert(itemRows);
  if (itemsErr) throw itemsErr;

  return returnRec;
}

export async function updateReturnStatus(returnId: string, status: Return['status'], staffId: string, rejectionReason?: string) {
  const updates: Record<string, unknown> = { 
    status, 
    processed_by_staff_id: staffId,
    processed_at: new Date().toISOString()
  };
  
  if (status === 'REJECTED' && rejectionReason) {
    updates.rejection_reason = rejectionReason;
  }
  
  if (status === 'COMPLETED') {
    updates.completed_at = new Date().toISOString();
  }

  const { data: ret, error } = await supabase
    .from('returns')
    .update(updates)
    .eq('id', returnId)
    .select('*, return_items(*)')
    .single();

  if (error) throw error;

  // If completed, we must restock products and check if original sale/order should be marked `is_returned=true`
  if (status === 'COMPLETED') {
    // Restock Phase
    const { return_items } = ret;
    for (const item of return_items) {
      // Add back to product quantity
      const { data: prod } = await supabase.from('products').select('quantity').eq('id', item.product_id).single();
      if (prod) {
        await supabase.from('products').update({ quantity: prod.quantity + item.quantity }).eq('id', item.product_id);
      }
      // Add inventory log
      await supabase.from('inventory').insert({
        product_id: item.product_id,
        change: item.quantity,
        reason: 'RETURN',
        staff_id: staffId,
        customer_id: ret.customer_id
      });
    }

    // Mark original transaction as is_returned = true to block from dashboard metrics
    if (ret.sale_id) {
       await supabase.from('sales').update({ is_returned: true }).eq('id', ret.sale_id);
    } else if (ret.order_id) {
       await supabase.from('online_orders').update({ is_returned: true }).eq('id', ret.order_id);
    }
  }
}
