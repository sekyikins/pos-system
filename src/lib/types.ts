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
  costPrice: number;
  quantity: number;
  barcode: string;
  description?: string;
  image_url?: string;
  supplierId?: string;
  supplierName?: string;
  is_returnable?: boolean;
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
  customerId: string | null;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  deliveryPointId: string | null;
  deliveryAddress: string | null;
  totalAmount: number;
  paymentMethodId: 'PAYSTACK' | 'PAY_ON_DELIVERY';
  paymentReference: string | null;
  promotionId: string | null;
  promoName?: string;
  endProcessStaffId: string | null;
  startProcessStaffId: string | null;
  processingStartedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  is_returned?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  passwordHash?: string;
  phone?: string;
  loyalty_points: number;
  last_purchase_date?: string;
  order_count?: number;
  type: 'IN_STORE' | 'ONLINE' | 'BOTH';
  created_at?: string;
}

/** Unified Item interface for both Sales and Online Orders */
export interface TransactionItem {
  id: string;
  saleId?: string | null;
  orderId?: string | null;
  productId: string;
  productName?: string; // Populated via join in queries
  price: number;
  costPrice: number;
  quantity: number;
  subtotal: number;
  createdAt?: string;
  is_returnable?: boolean;
}

/** Kept for backwards compatibility in UI components */
export type SalesItem = TransactionItem;

export interface Sale {
  id: string;
  cashierId: string;
  customerId?: string;
  items: SalesItem[];
  totalAmount: number;
  discount: number;
  finalAmount: number;
  paymentMethodId: 'CASH' | 'PAYSTACK';
  paymentReference?: string;
  promotionId?: string;
  promoName?: string; // From join
  status?: string;
  timestamp: string;
  is_returned?: boolean;
}

export interface InventoryLog {
  id: string;
  productId: string;
  change: number;
  reason: 'RESTOCK' | 'SALE' | 'ADJUSTMENT' | 'PURCHASE_ORDER' | 'LOSS' | 'RETURN' | string;
  timestamp: string;
  supplierId?: string;
  supplierName?: string;
  staffId?: string;
  staffName?: string;
  customerId?: string;
  customerName?: string;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string | null;
  supplierName?: string;
  status: 'PENDING' | 'APPROVED' | 'RECEIVED' | 'CANCELLED';
  totalAmount: number; // Unified camelCase for front-end consistency
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

export interface ReturnItem {
  id: string;
  return_id: string;
  product_id: string;
  product_name?: string; // from join
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at?: string;
}

export interface Return {
  id: string;
  sale_id: string | null;
  order_id: string | null;
  customer_id: string | null;
  initiated_by_staff_id: string | null;
  processed_by_staff_id: string | null;
  source: 'IN_STORE' | 'ONLINE';
  reason: string;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  refund_amount: number | null;
  rejection_reason: string | null;
  requested_at: string;
  processed_at: string | null;
  completed_at: string | null;
  items?: ReturnItem[];
  // Joined fields
  customer_name?: string;
  initiated_by_name?: string;
  processed_by_name?: string;
}
