'use server';

import { getSessionUser } from './auth';
import { adjustInventory as dbAdjustInventory, addProduct as dbAddProduct, updateProduct as dbUpdateProduct, deleteProduct as dbDeleteProduct } from '@/lib/db';
import { Product } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { InventoryLog } from '@/lib/types';

async function verifyAdminOrManager() {
    const user = await getSessionUser();
    if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
        throw new Error('Unauthorized: Insufficient permissions.');
    }
    return user;
}

export async function secureAdjustInventory(productId: string, change: number, reason: InventoryLog['reason'], supplierId?: string) {
    const user = await verifyAdminOrManager();
    await dbAdjustInventory(productId, change, reason, supplierId, user.id);
    revalidatePath('/admin/inventory');
}

export async function secureAddProduct(p: Omit<Product, 'id'>, staffId?: string) {
    await verifyAdminOrManager();
    const product = await dbAddProduct(p, undefined, staffId);
    revalidatePath('/admin/inventory');
    return product;
}

export async function secureUpdateProduct(id: string, updates: Partial<Product>) {
    await verifyAdminOrManager();
    const product = await dbUpdateProduct(id, updates);
    revalidatePath('/admin/inventory');
    return product;
}

export async function secureDeleteProduct(id: string) {
    await verifyAdminOrManager();
    await dbDeleteProduct(id);
    revalidatePath('/admin/inventory');
}
