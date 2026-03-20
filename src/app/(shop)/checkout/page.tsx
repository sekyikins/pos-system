'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useCartStore, useToastStore } from '@/lib/store';
import { processSale } from '@/lib/mock-db';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CreditCard, ShieldCheck, ArrowLeft, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CheckoutPage() {
  const { user, isLoading } = useAuth();
  const cart = useCartStore();
  const { addToast } = useToastStore();
  const router = useRouter();

  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    cardNumber: '',
    expiry: '',
    cvv: ''
  });

  // Guard: Must be logged in, and cart must not be empty
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        addToast('Please sign in to checkout', 'info');
        router.push('/login');
      } else if (cart.items.length === 0) {
        router.push('/');
      }
    }
  }, [user, isLoading, cart.items.length, router, addToast]);

  if (isLoading || !user || cart.items.length === 0) return null;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      // Simulate payment processing time
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const subtotal = cart.getTotal();
      const tax = parseFloat((subtotal * 0.08).toFixed(2)); // mock 8% tax
      const finalTotal = subtotal + tax;

      // Process sale in mock DB
      processSale({
        items: [...cart.items],
        totalAmount: subtotal,
        discount: 0,
        finalAmount: finalTotal,
        paymentMethod: 'CARD',
        customerId: user.role === 'CUSTOMER' ? user.id : '',
        cashierId: user.role !== 'CUSTOMER' ? user.id : ''
      });

      cart.clearCart();
      addToast('Payment successful! Your order is being processed.', 'success');
      router.push('/');
    } catch {
      addToast('Payment failed. Please try again.', 'error');
      setIsProcessing(false);
    }
  };

  const subtotal = cart.getTotal();
  const tax = parseFloat((subtotal * 0.08).toFixed(2));
  const finalTotal = subtotal + tax;

  return (
    <div className="min-h-screen bg-muted/30 p-4 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/" className="text-sm font-medium text-primary hover:underline flex items-center gap-1 w-fit">
            <ArrowLeft className="w-4 h-4"/> Back to Storefront
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Left Side: Order Summary */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight mb-2 flex items-center gap-3">
                <ShoppingBag className="h-8 w-8 text-primary" />
                Checkout
              </h1>
              <p className="text-muted-foreground">Review your chosen items and complete payment.</p>
            </div>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                  {cart.items.map(item => (
                    <div key={item.id} className="flex justify-between items-center text-sm font-medium">
                       <div className="flex items-center gap-3">
                         <span className="bg-muted w-6 h-6 rounded flex items-center justify-center text-xs">
                           {item.quantity}x
                         </span>
                         <span className="truncate max-w-[150px] sm:max-w-[200px]" title={item.productName}>
                           {item.productName}
                         </span>
                       </div>
                       <span>${item.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-border space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Tax (8%)</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t border-border bg-muted/30 rounded-b-xl pt-4">
                 <div className="flex justify-between items-end w-full">
                    <span className="font-bold text-foreground uppercase tracking-wider">Total</span>
                    <span className="text-2xl font-black text-foreground">${finalTotal.toFixed(2)}</span>
                 </div>
              </CardFooter>
            </Card>
          </div>

          {/* Right Side: Payment Form */}
          <div>
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-muted-foreground" /> Payment Details
                </CardTitle>
                <CardDescription>All transactions are secure and encrypted.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <form id="checkout-form" onSubmit={handleCheckout} className="space-y-5">
                  <div className="space-y-2">
                    <Input 
                      id="name" 
                      label="Cardholder Name" 
                      placeholder="Name on card" 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Input 
                      id="card" 
                      label="Card Number" 
                      placeholder="0000 0000 0000 0000" 
                      maxLength={19}
                      value={formData.cardNumber}
                      onChange={(e) => setFormData({...formData, cardNumber: e.target.value})}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Input 
                        id="expiry" 
                        label="Expiry Date" 
                        placeholder="MM/YY" 
                        maxLength={5}
                        value={formData.expiry}
                        onChange={(e) => setFormData({...formData, expiry: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Input 
                        id="cvv" 
                        label="CVV" 
                        placeholder="123" 
                        type="password"
                        maxLength={4}
                        value={formData.cvv}
                        onChange={(e) => setFormData({...formData, cvv: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                </form>
              </CardContent>
              <CardFooter className="flex-col gap-4 mt-auto">
                <Button 
                   type="submit" 
                   form="checkout-form"
                   fullWidth 
                   size="lg"
                   disabled={isProcessing}
                   className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-14 text-lg"
                >
                  {isProcessing ? 'Processing Payment...' : `Pay $${finalTotal.toFixed(2)}`}
                </Button>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground justify-center">
                  <ShieldCheck className="w-4 h-4 text-success" />
                  Your payment information is handled securely.
                </div>
              </CardFooter>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
