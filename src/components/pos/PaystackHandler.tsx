'use client';
import { useEffect, useCallback, type MutableRefObject } from 'react';

interface PaystackSuccessResponse {
  reference: string;
  [key: string]: unknown;
}

interface PaystackInitializeOptions {
  onSuccess?: (response: PaystackSuccessResponse) => void;
  onClose?: () => void;
}

interface PaystackHandlerProps {
  email: string;
  amount: number;
  publicKey: string;
  currency: string;
  initializeRef: MutableRefObject<((options: PaystackInitializeOptions) => void) | null>;
}

declare global {
  interface Window {
    PaystackPop?: {
      setup: (config: {
        key: string;
        email: string;
        amount: number;
        currency: string;
        ref: string;
        callback: (response: PaystackSuccessResponse) => void;
        onClose: () => void;
      }) => {
        openIframe: () => void;
      };
    };
  }
}

const PaystackHandler = ({
  email,
  amount,
  publicKey,
  currency,
  initializeRef,
}: PaystackHandlerProps) => {
  const handlePayment = useCallback((options: PaystackInitializeOptions) => {
    const PaystackPop = window.PaystackPop;
    if (!PaystackPop) {
      console.error('Paystack script not loaded');
      return;
    }

    const handler = PaystackPop.setup({
      key: publicKey,
      email: email,
      amount: amount,
      currency: currency,
      ref: (new Date()).getTime().toString(),
      callback: (response: PaystackSuccessResponse) => {
        if (options.onSuccess) options.onSuccess(response);
      },
      onClose: () => {
        if (options.onClose) options.onClose();
      },
    });
    
    handler.openIframe();
  }, [email, amount, publicKey, currency]);

  useEffect(() => {
    initializeRef.current = handlePayment;
  }, [handlePayment, initializeRef]);

  return null;
};

export default PaystackHandler;
