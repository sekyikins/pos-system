import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, SalesItem } from './types';

interface CartState {
  items: SalesItem[];
  selectedCustomerId: string | null;
  discountValue: string;
  discountType: 'FLAT' | 'PERCENT';
  selectedPromoId: string | null;
  
  setItems: (items: SalesItem[]) => void;
  setSelectedCustomerId: (id: string | null) => void;
  setDiscountValue: (value: string) => void;
  setDiscountType: (type: 'FLAT' | 'PERCENT') => void;
  setSelectedPromoId: (id: string | null) => void;
  
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number, maxQuantity?: number) => void;
  clearCart: () => void;
  getTotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      selectedCustomerId: null,
      discountValue: '0',
      discountType: 'FLAT',
      selectedPromoId: null,

      setItems: (items) => set({ items }),
      setSelectedCustomerId: (id) => set({ selectedCustomerId: id }),
      setDiscountValue: (value) => set({ discountValue: value }),
      setDiscountType: (type) => set({ discountType: type }),
      setSelectedPromoId: (id) => set({ selectedPromoId: id }),

      addItem: (product, quantity = 1) => {
        set((state) => {
          const existingItem = state.items.find(item => item.productId === product.id);
          if (existingItem) {
            const newQuantity = Math.min(existingItem.quantity + quantity, product.quantity);
            return {
              items: state.items.map(item =>
                item.productId === product.id
                  ? { ...item, quantity: newQuantity, subtotal: newQuantity * item.price }
                  : item
              )
            };
          }
          return {
            items: [...state.items, {
              id: `item-${Date.now()}`,
              productId: product.id,
              productName: product.name,
              price: product.price,
              costPrice: product.costPrice || 0,
              quantity: Math.min(quantity, product.quantity),
              subtotal: Math.min(quantity, product.quantity) * product.price
            }]
          };
        });
      },
      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter(item => item.productId !== productId)
        }));
      },
      updateQuantity: (productId, quantity, maxQuantity) => {
        const clampedQuantity = maxQuantity !== undefined 
          ? Math.max(1, Math.min(quantity, maxQuantity)) 
          : Math.max(1, quantity);
          
        set((state) => ({
          items: state.items.map(item =>
            item.productId === productId
              ? { ...item, quantity: clampedQuantity, subtotal: clampedQuantity * item.price }
              : item
          )
        }));
      },
      clearCart: () => set({ 
        items: [], 
        selectedCustomerId: null, 
        discountValue: '0', 
        selectedPromoId: null,
        discountType: 'FLAT'
      }),
      getTotal: () => get().items.reduce((total, item) => total + item.subtotal, 0)
    }),
    {
      name: 'pos-cart-v1',
      storage: {
        getItem: (name) => {
          if (typeof window === 'undefined') return null;
          const userStr = localStorage.getItem('pos_user');
          const userId = userStr ? JSON.parse(userStr).id : 'guest';
          const storedValue = localStorage.getItem(`${name}-${userId}`);
          
          if (!storedValue) {
            // Return an empty state wrapper to force clear any previous in-memory state
            return {
              state: {
                items: [],
                selectedCustomerId: null,
                discountValue: '0',
                selectedPromoId: null,
                discountType: 'FLAT'
              },
              version: 0
            };
          }
          return JSON.parse(storedValue);
        },
        setItem: (name, value) => {
          if (typeof window === 'undefined') return;
          const userStr = localStorage.getItem('pos_user');
          const userId = userStr ? JSON.parse(userStr).id : 'guest';
          localStorage.setItem(`${name}-${userId}`, JSON.stringify(value));
        },
        removeItem: (name) => {
          if (typeof window === 'undefined') return;
          const userStr = localStorage.getItem('pos_user');
          const userId = userStr ? JSON.parse(userStr).id : 'guest';
          localStorage.removeItem(`${name}-${userId}`);
        }
      }
    }
  )
);

// Simple Toast Notification Store
interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastState {
  toasts: ToastMessage[];
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message: string, type = 'info') => {
    const id = `toast-${Date.now()}`;
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }]
    }));
    // Auto remove after 3 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter(t => t.id !== id)
      }));
    }, 3000);
  },
  removeToast: (id: string) => set((state) => ({
    toasts: state.toasts.filter(t => t.id !== id)
  }))
}));

// Global Application Settings Store
import { getStoreSettings } from './db_extended';

export interface SettingsState {
  storeName: string;
  currency: string;
  currencySymbol: string;
  taxRate: number;
  receiptHeader: string | null;
  receiptFooter: string | null;
  initialized: boolean;
  refreshSettings: () => Promise<void>;
}



export const useSettingsStore = create<SettingsState>((set) => ({
  storeName: '',
  currency: '',
  currencySymbol: '_',
  taxRate: 0,
  receiptHeader: null,
  receiptFooter: null,
  initialized: false,
  refreshSettings: async () => {
    try {
      const s = await getStoreSettings();
      set({
        storeName: s.storeName,
        currency: s.currency,
        currencySymbol: s.currencySymbol,
        taxRate: s.taxRate,
        receiptHeader: s.receiptHeader,
        receiptFooter: s.receiptFooter,
        initialized: true
      });
    } catch {
      set({ initialized: true });
    }
  }
}));

// Global UI / Connection State
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UIState {
  connectionStatus: ConnectionStatus;
  instanceStatuses: Record<string, ConnectionStatus>;
  updateInstanceStatus: (id: string, status: ConnectionStatus) => void;
  removeInstance: (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  connectionStatus: 'connecting',
  instanceStatuses: {},
  updateInstanceStatus: (id, status) => set((state) => {
    const nextStatuses = { ...state.instanceStatuses, [id]: status };
    
    // Determine global status
    const values = Object.values(nextStatuses);
    let nextGlobal: ConnectionStatus = 'disconnected';
    
    if (values.includes('connected')) nextGlobal = 'connected';
    else if (values.includes('connecting')) nextGlobal = 'connecting';
    else if (values.includes('error')) nextGlobal = 'error';
    
    return { 
      instanceStatuses: nextStatuses,
      connectionStatus: nextGlobal
    };
  }),
  removeInstance: (id) => set((state) => {
    const nextStatuses = { ...state.instanceStatuses };
    delete nextStatuses[id];
    
    const values = Object.values(nextStatuses);
    let nextGlobal: ConnectionStatus = values.length === 0 ? 'disconnected' : 'connecting';
    
    if (values.includes('connected')) nextGlobal = 'connected';
    else if (values.includes('connecting')) nextGlobal = 'connecting';
    else if (values.includes('error')) nextGlobal = 'error';

    return {
      instanceStatuses: nextStatuses,
      connectionStatus: nextGlobal
    };
  }),
}));
