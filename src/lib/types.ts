export type Role = 'MANAGER' | 'CASHIER' | 'CUSTOMER';

/** Full DB row — includes the hashed password. Never store this in app state. */
export interface UserRecord {
  id: string;
  name: string;
  username: string;
  passwordHash: string;
  role: Role;
}

/** Safe user object stored in auth context / localStorage — no password hash. */
export type AuthUser = Omit<UserRecord, 'passwordHash'>;

/** Alias kept for mock-db.ts compatibility. */
export type User = UserRecord;

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  barcode: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  loyaltyPoints: number;
}

export interface SalesItem {
  id: string; // unique ID for the line item
  productId: string;
  productName: string; // denormalized for receipt/history
  price: number;
  quantity: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  cashierId: string; // The user ID Who processed this
  customerId?: string; // Optional, if linked
  items: SalesItem[];
  totalAmount: number;
  discount: number;
  finalAmount: number;
  paymentMethod: 'CASH' | 'MOBILE_MONEY' | 'CARD';
  timestamp: string; // ISO string
}

export interface InventoryLog {
  id: string;
  productId: string;
  change: number; // positive or negative
  reason: 'RESTOCK' | 'SALE' | 'ADJUSTMENT';
  timestamp: string;
}
