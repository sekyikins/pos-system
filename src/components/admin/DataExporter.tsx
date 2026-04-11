'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { FileText, Table as TableIcon, FileImage, FileDown, Loader2, Database } from 'lucide-react';
import { getSales, getProducts } from '@/lib/db';
import { getExpenses, getOnlineOrders, getReturns } from '@/lib/db_extended';
import { exportData } from '@/lib/export-utils';
import { useToastStore, useSettingsStore } from '@/lib/store';

export const DataExporter: React.FC = () => {
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const { addToast } = useToastStore();

  const handleExport = async (type: 'SALES' | 'INVENTORY' | 'FINANCIAL', format: 'txt' | 'csv' | 'exl' | 'pdf') => {
    const { storeName } = useSettingsStore.getState();
    setIsExporting(`${type}-${format}`);
    try {
      let data: object[] = [];
      const safeStoreName = storeName.toLowerCase().replace(/\s+/g, '-');
      const filename = `${safeStoreName}-${type.toLowerCase()}-${new Date().toISOString().split('T')[0]}`;
      const title = `${type} REPORT`;

      addToast(`Fetching data for ${type} export...`, 'info');

      if (type === 'SALES') {
        const sales = await getSales();
        const orders = await getOnlineOrders();
        
        // Flatten for export
        data = [
          ...sales.map(s => ({
            ID: s.id,
            TYPE: 'IN-STORE',
            DATE: s.timestamp,
            AMOUNT: s.finalAmount,
            DISCOUNT: s.discount,
            METHOD: s.paymentMethodId,
            STATUS: s.is_returned ? 'RETURNED' : 'COMPLETED'
          })),
          ...orders.map(o => ({
            ID: o.id,
            TYPE: 'ONLINE',
            DATE: o.createdAt,
            AMOUNT: o.totalAmount,
            DISCOUNT: 0,
            METHOD: o.paymentMethodId,
            STATUS: o.status
          }))
        ];
      } else if (type === 'INVENTORY') {
        const products = await getProducts();
        data = products.map(p => ({
          SKU: p.barcode,
          NAME: p.name,
          CATEGORY: p.category,
          PRICE: p.price,
          COST: p.costPrice,
          STOCK: p.quantity,
          VALUE: p.price * p.quantity
        }));
      } else if (type === 'FINANCIAL') {
        const expenses = await getExpenses();
        const returns = await getReturns();
        data = [
          ...expenses.map(e => ({
            DATE: e.expenseDate,
            CATEGORY: 'EXPENSE',
            DESC: e.description,
            AMOUNT: e.amount,
            STAFF: e.loggedByName
          })),
          ...returns.map(r => ({
            DATE: r.requested_at,
            CATEGORY: 'RETURN REFUND',
            DESC: `Return for ${r.sale_id || r.order_id}`,
            AMOUNT: -(r.refund_amount || 0),
            STAFF: r.initiated_by_name
          }))
        ];
      }

      if (data.length === 0) {
        addToast('No data found for this period.', 'info');
        return;
      }

      switch (format) {
        case 'csv': exportData.toCSV(data, filename); break;
        case 'exl': exportData.toExcel(data, filename, type); break;
        case 'pdf': exportData.toPDF(data, filename, title); break;
        case 'txt': exportData.toTXT(data, filename); break;
      }

      addToast(`${type} exported successfully!`, 'success');
    } catch (error) {
      console.error('Export error:', error);
      addToast('Failed to export data.', 'error');
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <Card className="border-2 border-primary/20 shadow-xl bg-background/50 backdrop-blur-md overflow-hidden">
      <CardHeader className="bg-primary/10 border-b border-primary/10 py-5">
        <div className="flex items-center gap-3">
          <Database className="h-6 w-6 text-primary" />
          <div className="space-y-0.5">
            <CardTitle className="text-xl font-black uppercase tracking-tighter">Business Intelligence Export</CardTitle>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Financial & Operational Analysis Data</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[
            { id: 'SALES', label: 'Sales & Revenue', desc: 'All POS and Online transactions' },
            { id: 'INVENTORY', label: 'Product & Stock', desc: 'SKU levels, cost pricing, valuations' },
            { id: 'FINANCIAL', label: 'Expenses & Returns', desc: 'Operational costs and refund history' }
          ].map((item) => (
            <div key={item.id} className="p-4 rounded-2xl bg-muted/30 border border-border/50 flex flex-col gap-4">
              <div className="space-y-1">
                <h4 className="font-bold text-base">{item.label}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-auto">
                {[
                  { format: 'csv' as const, icon: TableIcon, label: 'CSV' },
                  { format: 'exl' as const, icon: FileDown, label: 'Excel' },
                  { format: 'pdf' as const, icon: FileImage, label: 'PDF' },
                  { format: 'txt' as const, icon: FileText, label: 'TXT' }
                ].map((btn) => (
                  <Button
                    key={btn.format}
                    variant="outline"
                    size="sm"
                    className="h-9 text-[10px] font-black uppercase tracking-widest gap-1.5 hover:bg-primary/10 hover:border-primary/30 hover:shadow-lg"
                    onClick={() => handleExport(item.id as 'SALES' | 'INVENTORY' | 'FINANCIAL', btn.format)}
                    disabled={!!isExporting}
                  >
                    {isExporting === `${item.id}-${btn.format}` ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <btn.icon className="h-3.5 w-3.5 opacity-60" />
                    )}
                    {btn.label}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
