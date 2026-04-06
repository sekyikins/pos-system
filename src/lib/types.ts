export type Role = 'ADMIN' | 'MANAGER' | 'CASHIER';

/** Full DB row — includes the hashed password. Never store this in app state. */
export interface StaffRecord {
  id: string;
  name: string;
  username: string;
  passwordHash: string;
  role: Role;
  createdAt: string;
}

/** Safe user object stored in auth context / localStorage — no password hash. */
export type AuthUser = Omit<StaffRecord, 'passwordHash'>;

/** Alias kept for mock-db.ts compatibility. */
export type User = StaffRecord;

export interface Product {
  id: string;
  name: string;
  categoryId?: string;
  category: string;
  price: number;
  quantity: number;
  barcode: string;
  image_url?: string;
  supplierId?: string;
  supplierName?: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
}

export interface DeliveryPoint {
  id: string;
  name: string;
  address: string;
  active: boolean;
}

export interface OnlineOrder {
  id: string;
  eCustomerId: string | null;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  deliveryPointId: string | null;
  deliveryAddress: string | null;
  totalAmount: number;
  paymentMethod: 'CARD' | 'MOBILE_MONEY' | 'PAY_ON_DELIVERY';
  paymentReference: string | null;
  processedBy: string | null;
  processingStaffId: string | null;
  processingStartedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}


export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  loyalty_points: number;
  order_count?: number;
  type?: 'POS' | 'ECOMMERCE';
  created_at?: string;
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
  customerId?: string; // Optional POS Customer ID
  items: SalesItem[];
  totalAmount: number;
  discount: number;
  finalAmount: number;
  paymentMethod: 'CASH' | 'MOBILE_MONEY' | 'CARD';
  promoCode?: string;
  status?: string;
  timestamp: string; // ISO string
}

export interface InventoryLog {
  id: string;
  productId: string;
  change: number; // positive or negative
  reason: 'RESTOCK' | 'SALE' | 'ADJUSTMENT' | 'PURCHASE_ORDER';
  timestamp: string;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string | null;
  supplierName?: string;
  status: 'PENDING' | 'APPROVED' | 'RECEIVED' | 'CANCELLED';
  totalAmount: number;
  items?: PurchaseOrderItem[];
  createdAt: string;
}

export interface PurchaseOrderItem {
  id: string;
  poId: string;
  productId: string;
  productName?: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  createdAt: string;
}

export interface StoreSettings {
  id: string;
  storeName: string;
  currency: string;
  currencySymbol: string;
  taxRate: number;
  receiptHeader: string | null;
  receiptFooter: string | null;
  updatedAt: string;
}

export interface Promotion {
  id: string;
  name: string;
  code: string;
  discountType: 'FLAT' | 'PERCENT';
  discountValue: number;
  isActive: boolean;
  minSubtotal?: number;
  startDate?: string;
  endDate?: string;
  usageCount: number;
  createdAt: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  expenseDate: string;
  loggedBy: string | null;
  loggedByName?: string;
  createdAt: string;
}
