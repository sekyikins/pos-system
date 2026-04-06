'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StoreSettings } from '@/lib/types';
import { getStoreSettings, updateStoreSettings } from '@/lib/db';
import { useToastStore, useSettingsStore, SettingsState } from '@/lib/store';
import { Save, Store, Globe, Percent, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { LiveStatus } from '@/components/ui/LiveStatus';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';

const POPULAR_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'GHS', symbol: '₵', name: 'Ghanaian Cedi' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
];

export default function ConfigPage() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { addToast } = useToastStore();
  const refreshGlobalSettings = useSettingsStore((state: SettingsState) => state.refreshSettings);

  const [form, setForm] = useState({
    storeName: '',
    currency: 'GHS',
    currencySymbol: '₵',
    taxRate: 0,
    receiptHeader: '',
    receiptFooter: ''
  });

  const { data: storeRows, isLoading, connectionStatus, refetch } = useRealtimeTable<StoreSettings>({
    table: 'store_settings',
    initialData: [],
    fetcher: async () => {
      const data = await getStoreSettings();
      return [data];
    },
    refetchOnChange: true,
  });

  useEffect(() => {
    if (storeRows.length > 0) {
      const data = storeRows[0];
      setSettings(data);
      setForm({
        storeName: data.storeName,
        currency: data.currency,
        currencySymbol: data.currencySymbol,
        taxRate: data.taxRate,
        receiptHeader: data.receiptHeader || '',
        receiptFooter: data.receiptFooter || ''
      });
    }
  }, [storeRows]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setIsSaving(true);
    try {
      // Find the symbol for the selected currency code if not already set correctly
      const symbol = POPULAR_CURRENCIES.find(c => c.code === form.currency)?.symbol || '$';
      await updateStoreSettings(settings.id, { ...form, currencySymbol: symbol });
      
      // Update global store state for POS and other components
      await refreshGlobalSettings();
      
      addToast('Application settings saved successfully', 'success');
      await refetch();
    } catch {
      addToast('Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-5xl mx-auto pb-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-4 w-64 opacity-50" />
          </div>
          <Skeleton className="h-8 w-32 rounded-full" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card className="border-2 border-border/50 shadow-sm overflow-hidden">
               <CardHeader className="bg-muted/30 border-b border-border/50 pb-4"><Skeleton className="h-6 w-40" /></CardHeader>
               <CardContent className="pt-5 space-y-6">
                  <div className="space-y-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-11 w-full rounded-xl" /></div>
                  <div className="grid grid-cols-2 gap-8 pt-4">
                    <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-11 w-full rounded-xl" /></div>
                    <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-11 w-full rounded-xl" /></div>
                  </div>
               </CardContent>
            </Card>
            <Card className="border-2 border-border/50 shadow-sm overflow-hidden">
               <CardHeader className="bg-muted/30 border-b border-border/50 pb-4"><Skeleton className="h-6 w-40" /></CardHeader>
               <CardContent className="pt-5 space-y-6">
                  <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-24 w-full rounded-2xl" /></div>
                  <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-24 w-full rounded-2xl" /></div>
               </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
             <Card className="border-2 border-primary/20 bg-primary/5 shadow-none overflow-hidden sticky top-8">
                <CardHeader className="bg-primary/10 border-b border-primary/10"><Skeleton className="h-4 w-32" /></CardHeader>
                <CardContent className="p-6 space-y-4">
                   <Skeleton className="h-32 w-full rounded-xl" />
                   <Skeleton className="h-12 w-full rounded-2xl" />
                </CardContent>
             </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <Store className="h-8 w-8 text-primary" />
              Store Config
            </h1>
            <p className="text-sm text-muted-foreground font-medium">Core application identity and financial rules</p>
          </div>
        </div>
        <LiveStatus status={connectionStatus} />
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card className="border-2 border-border/50 shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
                <div className="flex items-center gap-3 text-lg font-bold uppercase tracking-wide">
                  <Store className="h-5 w-5 text-primary" />
                  General Information
                </div>
              </CardHeader>
              <CardContent className="pt-5 space-y-6">
                <Input 
                  label="Store Identity Name" 
                  value={form.storeName} 
                  onChange={e => setForm({ ...form, storeName: e.target.value })} 
                  required 
                  placeholder="e.g., My Grocery Store"
                  className="rounded-xl h-11"
                  description="Displays on receipts and shop storefront."
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                   <div className="space-y-2">
                     <label className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                       <Globe className="h-4 w-4" /> Global Currency
                     </label>
                     <select 
                        className="w-full h-11 rounded-xl border border-border bg-muted/20 px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold"
                        value={form.currency}
                        onChange={e => {
                          const code = e.target.value;
                          const found = POPULAR_CURRENCIES.find(c => c.code === code);
                          setForm({ ...form, currency: code, currencySymbol: found?.symbol || '$' });
                        }}
                     >
                       {POPULAR_CURRENCIES.map(c => (
                         <option key={c.code} value={c.code}>
                           {c.code} ({c.symbol}) - {c.name}
                         </option>
                       ))}
                     </select>
                   </div>
                   
                   <div className="space-y-2">
                     <label className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                       <Percent className="h-4 w-4" /> Tax Rate (%)
                     </label>
                     <Input 
                        type="number" 
                        step="0.01" 
                        min="0" 
                        max="100"
                        value={form.taxRate.toString()} 
                        onChange={e => setForm({ ...form, taxRate: parseFloat(e.target.value) || 0 })}
                        className="rounded-xl h-11"
                      />
                   </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-border/50 shadow-sm overflow-hidden">
               <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
                  <div className="flex items-center gap-3 text-lg font-bold uppercase tracking-wide">
                    <FileText className="h-5 w-5 text-primary" />
                    Receipt Content
                  </div>
               </CardHeader>
               <CardContent className="pt-5 space-y-6">
                 <div className="space-y-2">
                    <label className="text-sm font-bold text-muted-foreground">Receipt Header Message</label>
                    <textarea 
                      className="w-full min-h-[100px] p-4 rounded-2xl border-2 border-border/50 bg-muted/10 focus:border-primary/50 focus:ring-4 focus:ring-primary/5 outline-none transition-all text-sm font-medium resize-none"
                      placeholder="Welcome to our store!"
                      value={form.receiptHeader}
                      onChange={e => setForm({ ...form, receiptHeader: e.target.value })}
                    />
                 </div>
                 <div className="space-y-2 focus-within:ring-0">
                    <label className="text-sm font-bold text-muted-foreground">Receipt Footer / Terms</label>
                    <textarea 
                      className="w-full min-h-[100px] p-4 rounded-2xl border-2 border-border/50 bg-muted/10 focus:border-primary/50 focus:ring-4 focus:ring-primary/5 outline-none transition-all text-sm font-medium resize-none shadow-inner"
                      placeholder="All sales are final."
                      value={form.receiptFooter}
                      onChange={e => setForm({ ...form, receiptFooter: e.target.value })}
                    />
                 </div>
               </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-2 border-primary/20 bg-primary/5 shadow-none overflow-hidden sticky top-8">
               <CardHeader className="bg-primary/10 border-b border-primary/10">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Live Preview
                  </h3>
               </CardHeader>
               <CardContent className="p-6">
                  <div className="bg-card border-l-4 border-primary rounded-xl p-6 shadow-xl space-y-4">
                     <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">Current Store:</p>
                        <p className="text-xl font-bold text-foreground line-clamp-1">{form.storeName || 'My Store'}</p>
                     </div>
                     <div className="h-px bg-border/40" />
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-0.5">
                           <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">Currency:</p>
                           <p className="text-lg font-bold text-primary">{form.currencySymbol} ({form.currency})</p>
                        </div>
                        <div className="space-y-0.5">
                           <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">Taxation:</p>
                           <p className="text-lg font-bold text-foreground">{form.taxRate}%</p>
                        </div>
                     </div>
                  </div>
                  
                  <div className="mt-4">
                    <Button 
                      fullWidth 
                      type="submit" 
                      disabled={isSaving}
                      className="font-bold text-lg gap-2 rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-5 w-5" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
               </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
