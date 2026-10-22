import { Platform } from 'react-native';
import { OrderResponse } from '../types';

export interface CheckoutResult {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Opens Razorpay Checkout on the web using the hosted checkout.js script.
 * On native platforms a real integration needs the react-native-razorpay SDK
 * (which requires a custom dev build); the Payment screen falls back to the
 * backend mock flow in that case.
 */
export async function openWebCheckout(
  order: OrderResponse,
  user: { name?: string | null; mobile?: string },
): Promise<CheckoutResult> {
  if (Platform.OS !== 'web') {
    throw new Error('Web checkout is only available on the web build');
  }
  const w = globalThis as any;
  await ensureScript(w);

  return new Promise<CheckoutResult>((resolve, reject) => {
    const rzp = new w.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      order_id: order.orderId,
      name: 'GlowUp Makeup Booking',
      description: 'Makeup service booking',
      prefill: { name: user.name ?? '', contact: user.mobile ?? '' },
      theme: { color: '#D6336C' },
      handler: (res: CheckoutResult) => resolve(res),
      modal: { ondismiss: () => reject(new Error('Payment was cancelled')) },
    });
    rzp.open();
  });
}

function ensureScript(w: any): Promise<void> {
  if (w.Razorpay) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const doc = w.document;
    const script = doc.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay Checkout'));
    doc.body.appendChild(script);
  });
}
