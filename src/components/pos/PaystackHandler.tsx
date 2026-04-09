'use client';
import React from 'react';
import { usePaystackPayment } from 'react-paystack';

interface PaystackHandlerProps {
  email: string;
  amount: number;
  publicKey: string;
  currency: string;
  initializeRef: React.MutableRefObject<((options: Record<string, unknown>) => void) | null>;
}

const PaystackHandler: React.FC<PaystackHandlerProps> = ({
  email,
  amount,
  publicKey,
  currency,
  initializeRef,
}) => {
  const config = {
    reference: (new Date()).getTime().toString(),
    email,
    amount,
    publicKey,
    currency,
  };

  const handlePayment = usePaystackPayment(config);

  React.useEffect(() => {
    initializeRef.current = handlePayment;
  }, [handlePayment, initializeRef]);

  return null;
};

export default PaystackHandler;
