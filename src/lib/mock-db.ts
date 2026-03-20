import { Product, Customer, User, Sale, InventoryLog } from './types';
import bcrypt from 'bcryptjs';

// In-memory store for the application
let products: Product[] = [
  { id: 'p1', name: 'Coca Cola 2L', category: 'Beverages', price: 2.50, quantity: 50, barcode: '1234567890' },
  { id: 'p2', name: 'Lays Chips', category: 'Snacks', price: 1.50, quantity: 30, barcode: '0987654321' },
  { id: 'p3', name: 'Bread', category: 'Bakery', price: 2.00, quantity: 20, barcode: '1122334455' },
  { id: 'p4', name: 'Orange Juice 1L', category: 'Beverages', price: 3.00, quantity: 25, barcode: '2233445566' },
  { id: 'p5', name: 'Chocolate Bar', category: 'Snacks', price: 1.00, quantity: 8, barcode: '3344556677' },
  { id: 'p6', name: 'Milk 1L', category: 'Dairy', price: 1.80, quantity: 4, barcode: '4455667788' },
  { id: 'p7', name: 'Eggs (12 pack)', category: 'Dairy', price: 3.50, quantity: 15, barcode: '5566778899' },
  { id: 'p8', name: 'Rice 5kg', category: 'Grains', price: 8.00, quantity: 12, barcode: '6677889900' },
];

const customers: Customer[] = [
  { id: 'c1', name: 'John Doe', phone: '123-456-7890', email: 'john@example.com', address: '10 Oak Street', loyaltyPoints: 100 },
  { id: 'c2', name: 'Jane Smith', phone: '987-654-3210', email: 'jane@example.com', address: '22 Maple Ave', loyaltyPoints: 50 },
];

const sales: Sale[] = [];
const inventoryLogs: InventoryLog[] = [];

// Hardcoded users for testing different roles
const users: User[] = [
  { id: 'u1', name: 'Admin Manager', username: 'manager', passwordHash: bcrypt.hashSync('password', 10), role: 'MANAGER' },
  { id: 'u2', name: 'Cashier One', username: 'cashier', passwordHash: bcrypt.hashSync('password', 10), role: 'CASHIER' },
  { id: 'u3', name: 'Customer User', username: 'customer', passwordHash: bcrypt.hashSync('password', 10), role: 'CUSTOMER' },
];

// --- Product Methods ---
export const getProducts = () => [...products];
export const getProductById = (id: string) => products.find(p => p.id === id);
export const getProductByBarcode = (barcode: string) => products.find(p => p.barcode === barcode);

export const addProduct = (p: Omit<Product, 'id'>) => {
  const newProduct = { ...p, id: `p${Date.now()}` };
  products.push(newProduct);
  return newProduct;
};

export const updateProduct = (id: string, updates: Partial<Product>) => {
  const index = products.findIndex(p => p.id === id);
  if (index !== -1) {
    products[index] = { ...products[index], ...updates };
    return products[index];
  }
  return null;
};

export const deleteProduct = (id: string) => {
  products = products.filter(p => p.id !== id);
};

// --- Customer Methods ---
export const getCustomers = () => [...customers];
export const getCustomerById = (id: string) => customers.find(c => c.id === id);

export const addCustomer = (c: Omit<Customer, 'id' | 'loyaltyPoints'>) => {
  const newCustomer = { ...c, id: `c${Date.now()}`, loyaltyPoints: 0 };
  customers.push(newCustomer);
  return newCustomer;
};

export const updateCustomerLoyalty = (customerId: string, pointsToAdd: number) => {
  const idx = customers.findIndex(c => c.id === customerId);
  if (idx !== -1) {
    customers[idx].loyaltyPoints += pointsToAdd;
  }
};

// Get all sales for a specific customer
export const getSalesByCustomer = (customerId: string) =>
  sales.filter(s => s.customerId === customerId);

// --- Sales & Inventory Methods ---
export const getSales = () => [...sales];
export const getInventoryLogs = () => [...inventoryLogs];

export const processSale = (saleData: Omit<Sale, 'id' | 'timestamp'>) => {
  const newSale: Sale = {
    ...saleData,
    id: `s${Date.now()}`,
    timestamp: new Date().toISOString()
  };

  // Update inventory
  saleData.items.forEach(item => {
    const product = getProductById(item.productId);
    if (product) {
      updateProduct(product.id, { quantity: product.quantity - item.quantity });
      inventoryLogs.push({
        id: `log${Date.now()}-${item.productId}`,
        productId: item.productId,
        change: -item.quantity,
        reason: 'SALE',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Award loyalty points (1 point per dollar spent, rounded)
  if (saleData.customerId) {
    const pointsEarned = Math.round(saleData.finalAmount);
    updateCustomerLoyalty(saleData.customerId, pointsEarned);
  }

  sales.push(newSale);
  return newSale;
};

// --- User Methods ---
export const getUserByUsername = (username: string) => users.find(u => u.username === username);

export const addUser = (newUser: Omit<User, 'id'>) => {
  const id = `u${Date.now()}`;
  const user: User = { ...newUser, id };
  users.push(user);
  return user;
};

