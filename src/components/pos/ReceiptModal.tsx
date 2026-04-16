'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { getSaleById } from '@/lib/db';
import { Sale } from '@/lib/types';
import { ShoppingBag, Printer, Download, CheckCircle2, FileText } from 'lucide-react';
import { useSettingsStore } from '@/lib/store';
import { CopyableId } from '@/components/ui/CopyableId';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleId: string | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, saleId }) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [sale, setSale] = useState<Sale | null>(null);
  const { storeName, currency, currencySymbol, receiptHeader, receiptFooter } = useSettingsStore();

  useEffect(() => {
    if (!saleId || !isOpen) return;
    setSale(null);
    getSaleById(saleId).then(async (s) => {
      setSale(s);
    });
  }, [saleId, isOpen]);

  if (!isOpen) return null;
  if (!sale) return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transaction Complete">
      <div className="flex flex-col items-center py-10 text-muted-foreground">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-3" />
        <p className="text-sm">Loading receipt...</p>
      </div>
    </Modal>
  );

  const handlePrint = () => window.print();

  const handleDownloadText = () => {
    const lines: string[] = [
      `=======      ${storeName}     =======`,
      receiptHeader ? `${receiptHeader}` : '',
      `Date:                ${new Date(sale.timestamp).toLocaleString()}`,
      `Receipt:             #${sale.id.slice(-8)}`,
      `---------------------------------`,
      ...sale.items.map(item => `${(item.productName || 'Unknown').substring(0, 20).padEnd(20)} ${item.quantity} x ${currencySymbol}${item.price.toFixed(2)} = ${currencySymbol}${item.subtotal.toFixed(2)}`),
      `---------------------------------`,
      sale.discount > 0 ? `Discount:            -${currencySymbol}${sale.discount.toFixed(2)}` : '',
      `TOTAL:               ${currencySymbol}${sale.finalAmount.toFixed(2)}`,
      ...(sale.promoName ? [`Promotion:           ${sale.promoName}`] : []),
      `PAYMENT:             ${sale.paymentMethodId}`,
      `=================================`,
      receiptFooter ? `${receiptFooter}` : `            Thank you!`,
    ].filter(Boolean);

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Receipt-${sale.id.slice(-8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'mm', format: [80, 200], orientation: 'portrait' });
      const safeCurrency = currency || 'GHS';

      let y = 10;
      const center = (text: string, size = 10) => {
        doc.setFontSize(size);
        doc.text(text, 40, y, { align: 'center' });
        y += size * 0.5 + 2;
      };

      const row = (left: string, right: string, size = 9) => {
        doc.setFontSize(size);
        doc.text(left, 5, y);
        doc.text(right, 75, y, { align: 'right' });
        y += size * 0.5 + 2;
      };

      const line = () => { doc.setDrawColor(200); doc.line(5, y, 75, y); y += 3; };

      center(storeName, 14);
      if (receiptHeader) center(receiptHeader.split('\n')[0], 8);
      y += 2;
      line();
      y+=3

      row('Date:', new Date(sale.timestamp).toLocaleString(), 8);
      row('Receipt:', `#${sale.id.slice(-8)}`, 8);
      row('Cashier:', sale.cashierId.slice(-8), 8);
      line();
      y+=3

      sale.items.forEach(item => {
        doc.setFont('courier', 'bold');
        row(`${(item.productName || 'Unknown').substring(0, 22)}`, `${safeCurrency} ${item.subtotal.toFixed(2)}`);
        doc.setFont('courier', 'normal');
        doc.setFontSize(7);
        y -= 3;
        doc.text(`${item.quantity} x ${safeCurrency} ${item.price.toFixed(2)}`, 5, y);
        y += 5;
      });

      line();
      y+=3
      doc.setFont('courier', 'bold');
      if (sale.discount > 0) row('Discount:', `-${safeCurrency} ${sale.discount.toFixed(2)}`, 9);
      y-=2
      if (sale.promoName) row('Promo applied:', sale.promoName, 8);
      y+=2
      row('TOTAL:', `${safeCurrency} ${sale.finalAmount.toFixed(2)}`, 10);
      row('Payment:', sale.paymentMethodId, 8);
      y += 3;
      line();
      y +=3

      center(receiptFooter || 'Thank you for shopping with us!', 9);

      doc.save(`receipt-${sale.id.slice(-8)}.pdf`);
    } catch (err) {
      console.error('PDF generation failed', err);
    }
  };

  const renderHeader = () => {
    return (
      <div className="flex flex-col items-center mb-5">
        <div className="h-14 w-14 rounded-full bg-success/10 flex items-center justify-center mb-3">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>
        <h2 className="text-lg font-bold">Payment Successful!</h2>
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transaction Complete">
      {renderHeader()}

      {/* Receipt Preview */}
      <div
        ref={receiptRef}
        id="printable-receipt"
        className="bg-primary/10 border border-dashed border-border p-5 rounded-xl font-mono text-xs max-w-xs mx-auto mb-5"
      >
        <div className="text-center mb-4">
          <ShoppingBag className="h-6 w-6 mx-auto mb-1" />
          <p className="font-bold text-sm">{storeName}</p>
          {receiptHeader && <p className="text-muted-foreground text-[10px] whitespace-pre-line">{receiptHeader}</p>}
        </div>

        <div className="space-y-0.5 text-muted-foreground mb-3 text-[10px]">
          <div className="flex justify-between"><span>Date:</span><span>{new Date(sale.timestamp).toLocaleString()}</span></div>
          <div className="flex justify-between items-center">
            <span>Receipt:</span>
            <CopyableId id={sale.id} className="scale-75 origin-right" />
          </div>
        </div>

        <div className="border-t border-dashed border-border pt-3 mb-3 space-y-2">
          {sale.items.map(item => (
            <div key={item.id}>
              <div className="flex justify-between font-semibold">{(item.productName || 'Unknown')}<span>{currencySymbol}{item.subtotal.toFixed(2)}</span></div>
              <div className="text-muted-foreground text-[10px]">{item.quantity} × {currencySymbol}{item.price.toFixed(2)}</div>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-border pt-3 space-y-1">
          {sale.discount > 0 && (
            <div className="space-y-0.5">
              <div className="flex justify-between text-success">
                <span>Discount</span>
                <span>-{currencySymbol}{sale.discount.toFixed(2)}</span>
              </div>
              {sale.promoName && (
                <div className="flex justify-between text-[8px] text-success/70 font-bold uppercase tracking-tighter">
                  <span>Promo Applied:</span>
                  <span>{sale.promoName}</span>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-between font-bold text-sm"><span>TOTAL</span><span>{currencySymbol}{sale.finalAmount.toFixed(2)}</span></div>
          <div className="flex justify-between text-muted-foreground text-[10px]"><span>Method</span><span>{sale.paymentMethodId}</span></div>
        </div>

        <div className="text-center text-[10px] text-muted-foreground mt-3 whitespace-pre-line">{receiptFooter || 'Thank you for shopping with us!'}</div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden !important; }
          #printable-receipt, #printable-receipt * { visibility: visible !important; }
          #printable-receipt { position: fixed; left: 0; top: 0; width: 100%; border: none !important; padding: 20px; }
        }
      `}} />

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <Button variant="secondary" onClick={handlePrint} className="gap-1 text-xs">
          <Printer className="h-3.5 w-3.5" /> Print
        </Button>
        <Button variant="secondary" onClick={handleDownloadText} className="gap-1 text-xs">
          <FileText className="h-3.5 w-3.5" /> .txt
        </Button>
        <Button variant="secondary" onClick={handleDownloadPDF} className="gap-1 text-xs">
          <Download className="h-3.5 w-3.5" /> PDF
        </Button>
      </div>
      <Button fullWidth onClick={onClose} className="mt-3">
        New Sale
      </Button>
    </Modal>
  );
};
