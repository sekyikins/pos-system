export * from './db';
// Extend this file via append to avoid large replace_file_content

import { supabase } from './supabase';
import { Category, DeliveryPoint, OnlineOrder } from './types';

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
