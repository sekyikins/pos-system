import { openDB, IDBPDatabase } from 'idb';
import { Product, Sale } from './types';

export interface OfflineSale extends Sale {
  offline_at?: string;
}

const DB_NAME = 'starmart_pos_offline';
const STORE_PRODUCTS = 'products';
const STORE_SALES = 'offline_sales';

let dbPromise: Promise<IDBPDatabase> | null = null;

export const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_PRODUCTS)) {
          db.createObjectStore(STORE_PRODUCTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_SALES)) {
          db.createObjectStore(STORE_SALES, { keyPath: 'id', autoIncrement: true });
        }
      },
    });
  }
  return dbPromise;
};

// --- Products ---
export const saveProductsOffline = async (products: Product[]) => {
  const db = await getDB();
  const tx = db.transaction(STORE_PRODUCTS, 'readwrite');
  const store = tx.objectStore(STORE_PRODUCTS);
  await store.clear();
  for (const p of products) {
    await store.add(p);
  }
  await tx.done;
};

export const getOfflineProducts = async (): Promise<Product[]> => {
  const db = await getDB();
  return db.getAll(STORE_PRODUCTS);
};

// --- Sales ---
export const queueOfflineSale = async (sale: Sale) => {
  const db = await getDB();
  return db.add(STORE_SALES, {
    ...sale,
    offline_at: new Date().toISOString()
  });
};

export const getQueuedSales = async (): Promise<OfflineSale[]> => {
  const db = await getDB();
  return db.getAll(STORE_SALES);
};

export const deleteQueuedSale = async (id: string | number) => {
  const db = await getDB();
  return db.delete(STORE_SALES, id);
};
