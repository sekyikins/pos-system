import { create } from 'zustand';
import { Product, SalesItem } from './types';

interface CartState {
  items: SalesItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number, maxQuantity?: number) => void;
  clearCart: () => void;
  getTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  addItem: (product: Product, quantity = 1) => {
    set((state) => {
      const existingItem = state.items.find(item => item.productId === product.id);
      if (existingItem) {
        // Prevent exceeding available stock
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
          quantity: Math.min(quantity, product.quantity),
          subtotal: Math.min(quantity, product.quantity) * product.price
        }]
      };
    });
  },
  removeItem: (productId: string) => {
    set((state) => ({
      items: state.items.filter(item => item.productId !== productId)
    }));
  },
  updateQuantity: (productId: string, quantity: number, maxQuantity?: number) => {
    const clampedQuantity = maxQuantity !== undefined 
      ? Math.min(quantity, maxQuantity) 
      : quantity;
      
    set((state) => ({
      items: state.items.map(item =>
        item.productId === productId
          ? { ...item, quantity: clampedQuantity, subtotal: clampedQuantity * item.price }
          : item
      )
    }));
  },
  clearCart: () => set({ items: [] }),
  getTotal: () => get().items.reduce((total, item) => total + item.subtotal, 0)
}));

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
